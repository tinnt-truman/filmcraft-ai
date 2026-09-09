# FilmCraft AI — Architecture

## Tổng quan

FilmCraft AI là app demo local/phi-thương-mại, Next.js 16 App Router + Route
Handlers làm backend cho chính FE của nó (không có service riêng biệt). Toàn
bộ chạy trong 1 process Node duy nhất (`next dev` / `next start`) — không có
worker process riêng, không bắt buộc Redis.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js process (1 tiến trình duy nhất)                            │
│                                                                       │
│  app/**/*.tsx  ──fetch──▶  app/api/**/route.ts  ──▶  lib/*.ts       │
│  (FE, "use client")        (Route Handlers)          (business      │
│                                    │                   logic thuần)  │
│                                    ▼                                 │
│                              lib/prisma.ts ──▶ PostgreSQL            │
│                                    │                                 │
│                                    ▼                                 │
│                              lib/queue.ts (in-process, hoặc BullMQ+  │
│                              Redis nếu REDIS_URL được set)           │
│                                    │                                 │
│                                    ▼                                 │
│                        lib/providers/{llm,image,video,tts}.ts        │
│                        (Mock offline theo mặc định; Real* = TODO,    │
│                         tự kích hoạt khi có API key trong .env)      │
└─────────────────────────────────────────────────────────────────────┘
```

## Tầng dữ liệu (Prisma schema — 4 lớp theo BACKEND_PROMPT.md)

```
User ─┬─ Wallet ─── Transaction
      ├─ DramaProject ─┬─ ProjectSummary        (Lớp 1: tóm tắt dự án)
      │                ├─ Character              (Lớp 2: tiểu sử nhân vật)
      │                └─ Episode ─┬─ Scene ── Shot ── DialogueLine
      │                            │            (Lớp 3: kịch bản → cây cảnh,
      │                            │             sinh từ scriptRaw bằng
      │                            │             lib/scriptParser.ts)
      │                            └─ Segment ── SegmentLine
      │                                 (Lớp 4: đoạn phim gửi sinh video,
      │                                  lắp bằng lib/promptAssembler.ts)
      ├─ VideoProject ── VideoScene    (nhánh "Video ngắn AI", độc lập Drama)
      ├─ Asset                         (nhân vật/cảnh/đạo cụ/giọng, dùng chung)
      └─ GenerationJob                 (mọi job AI — Drama lẫn VideoProject
                                         lẫn Asset lẫn Tools đều tạo qua đây)
```

**Vì sao tách `scriptRaw` (text) khỏi `Scene/Shot/DialogueLine` (cấu trúc)?**
`scriptRaw` là **nguồn sự thật** (source of truth) — do LLM sinh ra hoặc user
gõ tay, dạng markdown tự do. `Scene/Shot/DialogueLine` chỉ là **cache đã
parse** của `scriptRaw`, được sinh lại (xoá hết, tạo lại) mỗi lần bấm "AI
phân cảnh" (`POST /api/episodes/:id/storyboard`). Điều này cho phép user sửa
tay `scriptRaw` (dạng text, dễ đọc) mà không cần UI phức tạp để sửa từng
Shot/DialogueLine riêng lẻ — và storyboard cũ không bao giờ "lệch" khỏi
script vì luôn được sinh lại từ đầu.

## Luồng request điển hình (có gọi AI)

Ví dụ `POST /api/segments/:id/generate` ("phát ra" 1 đoạn phim):

```
FE (app/drama/[id]/episodes/[episodeId]/page.tsx)
  │  POST /api/segments/:id/generate
  ▼
middleware.ts — check session (401 nếu chưa đăng nhập)
  ▼
route.ts (withAuth wrapper — lib/routeAuth.ts)
  ▼
lib/episodeJobs.ts#generateSegment()
  ├─ 1. Load Segment + lines + Episode + Project + Asset liên quan
  ├─ 2. lib/segmentValidate.ts#validateSegmentForGenerate()
  │      → lỗi? throw ValidationFailedError → HTTP 422 SEGMENT_NOT_READY
  ├─ 3. lib/promptAssembler.ts#assembleSeedanceRequest()
  │      → lắp request đa phương thức (text + reference_image[] +
  │        reference_audio[]) đúng thứ tự khối ràng buộc cố định
  ├─ 4. lib/jobs.ts#createGenerationJob()
  │      ├─ estimateCost(SHOT_VIDEO) = 4000 token
  │      ├─ hold ví (balance - heldAmount < 4000 ? throw
  │      │   InsufficientBalanceError → HTTP 402 : heldAmount += 4000)
  │      ├─ tạo row GenerationJob (status: QUEUED)
  │      └─ lib/queue.ts#enqueueJob(jobId, task) — đăng ký closure `task`
  │          vào bộ nhớ (taskRegistry), rồi đẩy jobId vào hàng đợi
  │          (in-process hoặc BullMQ) — CHƯA CHẠY task ngay
  └─ 5. return { jobId } NGAY (HTTP 202) — không chờ task chạy xong
  ▼
FE nhận { jobId } → lib/apiClient.ts#pollJob() gọi GET /api/jobs/:id
  mỗi 1.5s cho tới khi status = SUCCEEDED/FAILED (timeout 90s)
  ▼
(nền, cùng process) lib/queue.ts — tới lượt (concurrency ≤ 10) → chạy `task`:
  ├─ status: QUEUED → RUNNING
  ├─ lib/providers/video.ts#getVideoProvider().generateVideo(request)
  │   (Mock nếu không có SEEDANCE_API_KEY trong .env — trả url: null
  │    sau độ trễ giả lập; Real* ném lỗi "chưa implement" nếu có key)
  ├─ cập nhật Segment.status/videoUrl/lastFrameUrl
  └─ lib/jobs.ts#settleJob() — qua lib/pricing.ts#computeSettlement():
      SUCCEEDED → trừ actualCost vào balance, hoàn chênh lệch
      FAILED    → actualCost = 0, hoàn toàn bộ heldAmount
```

Mọi thao tác gọi AI khác trong app (regenerate-script, storyboard summary,
sinh ảnh nhân vật, 5 tool đơn lẻ, render video ngắn...) đều đi qua đúng cùng
1 khuôn: `createGenerationJob()` → `enqueueJob()` → provider adapter →
`settleJob()`. Đây là điểm trung tâm nhất của toàn bộ backend.

## Hàng đợi (`lib/queue.ts`) — vì sao không bắt buộc Redis

Đây là app **1 process, chạy local, 1 user demo**, nên không cần hạ tầng hàng
đợi phân tán. `lib/queue.ts` có 2 chế độ, chọn tự động theo `REDIS_URL`:

- **In-process (mặc định)** — `InProcessQueue`, giới hạn 10 job chạy song
  song, còn lại xếp hàng trong 1 mảng in-memory. Producer (route handler) và
  "worker" (hàm `drain()`) chạy chung 1 process, nên có thể truyền thẳng
  **closure** (hàm JS đóng gói toàn bộ context — `request`, `segmentId`,
  provider đã chọn...) qua `taskRegistry: Map<jobId, Task>` thay vì phải
  serialize job data ra JSON rồi deserialize lại (cách BullMQ/Redis bắt buộc
  phải làm vì worker có thể là process khác).
- **BullMQ + Redis (tuỳ chọn)** — khi set `REDIS_URL`, job được đẩy vào Redis
  thật (bền hơn — sống sót qua restart nếu job đã nằm trong Redis). **Lưu ý
  quan trọng:** vì `taskRegistry` vẫn là in-memory Map (closure không
  serialize được), nếu process bị restart giữa lúc job đang chờ trong Redis
  thì closure đã mất — `Worker` sẽ log cảnh báo "no task registered" và bỏ
  qua job đó. Chấp nhận được cho phạm vi demo local; muốn bền thật sự (chạy
  nhiều instance / restart an toàn) thì cần tách xử lý job thành **named
  processor** nhận `jobId` rồi tự load lại toàn bộ context cần thiết từ DB
  (không dựa vào closure), chạy trong 1 worker process riêng.

## Cơ chế "nối khung hình cuối" (camera stitch) khi render nhiều đoạn

`episode.stitchEnabled = true` → `regenerateAllSegments()`
(`lib/episodeJobs.ts`) sinh các Segment **tuần tự** thay vì song song: mỗi
đoạn sau dùng `lastFrameUrl` của đoạn liền trước làm `extraReferenceImage`
bổ sung vào `referenceImage[]` của Seedance request (không trộn với
`first_frame` — 2 cơ chế loại trừ nhau theo đúng đặc tả). Việc "đợi tuần tự"
được làm bằng cách chuyền 1 `Promise` (`waitFor`) qua từng lời gọi
`generateSegment()` — job sau chỉ thực sự gọi provider sau khi `await
opts.waitFor` (promise `done` của job trước) resolve. Khi `stitchEnabled =
false` (mặc định), toàn bộ segment được enqueue cùng lúc, hàng đợi tự xử lý
song song (tối đa 10 job cùng lúc trên toàn hệ thống, không riêng theo tập).

## AI Provider Adapters (`lib/providers/*.ts`)

Mỗi loại (LLM / Image / Video / TTS) có 1 interface chung
(`lib/providers/types.ts`) + 2 implementation:

- **Mock** (mặc định, luôn hoạt động, không cần API key/network) — LLM trả
  văn bản giả lập có cấu trúc; Image sinh SVG gradient offline (data URI,
  màu suy ra từ hash của prompt); Video mô phỏng độ trễ rồi trả
  `url: null` (kèm cờ để FE hiển thị đúng "đã xử lý xong nhưng chưa có
  provider thật").
- **Real** — hiện là **stub ném lỗi** "chưa implement", tự động được chọn
  thay Mock ngay khi biến môi trường API key tương ứng xuất hiện trong
  `.env` (`getXxxProvider()` kiểm tra `process.env.XXX_API_KEY`). Đây là
  đúng những chỗ cần code thêm để cắm model thật (Anthropic/OpenAI cho LLM,
  Replicate/fal.ai cho Image, Seedance/Kling/Runway/Luma cho Video,
  ElevenLabs cho TTS) — kiến trúc adapter đã sẵn sàng, chỉ cần điền phần gọi
  API thật vào từng class `RealXxxProvider`.

## Auth (NextAuth Credentials + middleware)

- `lib/auth.ts` — `CredentialsProvider` (email + password, hash bằng
  `bcryptjs`), session strategy `jwt` (không cần DB session table — phù hợp
  demo, không cần bảng `Session`/`Account` của NextAuth Adapter).
- `middleware.ts` — chặn TOÀN BỘ `/api/**` trừ 3 prefix whitelist
  (`/api/auth`, `/api/tools`, `/api/webhooks`), dùng `getToken()` đọc JWT từ
  cookie — chạy ở Edge, trước khi request tới Route Handler, nên route
  handler không cần tự check lại (nhưng `lib/routeAuth.ts#withAuth` vẫn tự
  gọi `requireUserId()` để lấy `userId` — 2 lớp độc lập, không dư thừa vì
  mục đích khác nhau: middleware để CHẶN SỚM, `withAuth` để LẤY userId).
- `lib/ownership.ts` — mọi truy vấn resource theo id đều lọc kèm
  `userId` ngay trong `where` (`findFirst({ where: { id, project: { userId }
  } })` chứ không phải `findUnique({ id })` rồi check sau) — tránh lỗi
  **IDOR** (user A đoán được id của resource user B rồi thao tác được).
  Đây là 1 lỗi bảo mật thật đã bị phát hiện & sửa trong lúc code
  `generateSegment()`/`regenerateAllSegments()` (xem `test_report.md` /
  lịch sử phát triển) — bài học được áp dụng nhất quán cho toàn bộ route
  còn lại ngay từ đầu.

## Chuẩn hoá lỗi (`lib/routeAuth.ts`)

`withAuth()`/`withPublic()` là 2 Higher-Order Function bọc mọi route
handler: tự lấy `userId` (hoặc bỏ qua với `withPublic`), tự `await` Next.js
15+ dynamic `params` (Promise), và **bắt tập trung** các Error class riêng
(`AuthError`, `InsufficientBalanceError`, `ValidationFailedError`,
`ConflictError`, `NotFoundError`, cả `Prisma P2025`) rồi map sang đúng HTTP
status + `{ error: { code, message } }`. Route handler vì vậy chỉ cần
`throw` đúng loại lỗi (hoặc gọi hàm lib đã throw sẵn) — không lặp lại
try/catch ở 34 file.

## Điểm khác biệt so với sản phẩm thật (giới hạn có chủ đích của bản demo)

- **1 process duy nhất** — không có worker process riêng, không auto-scale.
  Đủ cho 1 user chạy local; không dùng được cho nhiều user đồng thời ở quy
  mô lớn (in-process queue là in-memory, không chia sẻ giữa nhiều instance).
- **Không ghép video hậu kỳ** — mỗi `Segment`/`VideoScene` có file video
  riêng; chưa có bước ffmpeg concat thành 1 file phim hoàn chỉnh.
- **Thanh toán "demo mode"** — nạp tiền cộng ngay, không qua cổng thật, trừ
  khi cắm `VNPAY_TMN_CODE`/`PAYOS_CLIENT_ID` (lúc đó lại là `501
  NOT_IMPLEMENTED` vì phần tích hợp thật chưa viết — xem `docs/API.md`).
- **AI providers là Mock theo mặc định** — không có API key nào bắt buộc để
  chạy demo end-to-end; cắm key thật vẫn cần code thêm phần gọi API tương
  ứng (các class `RealXxxProvider` hiện throw "chưa implement").
