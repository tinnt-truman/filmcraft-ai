# Test Report — FilmCraft AI Backend

Ngày chạy: 2026-09-09
Người/agent thực hiện: Agent Coder + Agent Tester (pipeline agent-manager), TASK-013.

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Unit tests (Vitest) | ✅ **54/54 PASS** (4 file test) |
| `next build` — compile/bundle | ✅ **PASS** ("Compiled successfully") |
| `next build` — type-check step | ❌ **FAIL** — chặn hoàn toàn bởi 1 nguyên nhân gốc duy nhất (xem mục 4) |
| `npx tsc --noEmit` | ❌ 7 lỗi, **cùng 1 nguyên nhân gốc** (xem mục 4) |
| `npx eslint .` | ✅ **0 lỗi, 0 cảnh báo** (đã sửa 8 lỗi/cảnh báo phát hiện được) |
| `npm install` | ✅ đã chạy thành công trước đó |
| `npx prisma generate` | ❌ **Bị chặn bởi sandbox** — xem mục 4 |

**Kết luận nhanh:** Toàn bộ logic thuần (business logic không phụ thuộc DB) đã được test và PASS. Phần còn lại (type-check đầy đủ với Prisma Client thật, migrate, seed, chạy server thật) không thể xác minh được **trong sandbox hiện tại** vì lý do hạ tầng mạng (egress policy), không phải lỗi code — chi tiết & cách khắc phục ở mục 4 và 5.

---

## 2. Unit tests (Vitest)

Lệnh chạy: `npx vitest run`

```
✓ tests/promptAssembler.test.ts (18 tests)
✓ tests/scriptParser.test.ts   (16 tests)
✓ tests/segmentValidate.test.ts (11 tests)
✓ tests/wallet.test.ts          (9 tests)

Test Files  4 passed (4)
     Tests  54 passed (54)
```

### 2.1 `tests/scriptParser.test.ts` (16 tests)
Test `lib/scriptParser.ts` — parser markdown kịch bản (`### Cảnh`, `△ shot`, dòng thoại) thành cây `Scene[] → Shot[] → DialogueLine[]`:
- `shotSizeFromLabel`: map đúng nhãn tiếng Việt → `ShotSizeLiteral`, fallback `MEDIUM` khi nhãn lạ, không phân biệt hoa/thường.
- `parseScriptRaw`: tách đúng số Scene theo header, parse đúng thời gian/nội-ngoại/địa điểm/địa điểm phụ, danh sách nhân vật, thứ tự & shotSize của từng shot, gắn thoại vào đúng shot gần nhất kèm `direction`, tạo shot `MONTAGE` ngầm định cho `[Cảnh trống: ...]`, tạo shot `MEDIUM` ngầm định khi có thoại độc lập không có `△` phía trước, bỏ qua nội dung trước header đầu tiên và dòng rác không khớp pattern, xử lý input rỗng / không có `### Cảnh` nào, xử lý `\r\n`.
- `estimateShotDurationSec`: đúng công thức base (2.5s không thoại / 3s có thoại) + 0.12s/từ, cộng dồn nhiều dòng thoại.

### 2.2 `tests/promptAssembler.test.ts` (18 tests)
Test `lib/promptAssembler.ts` — lắp request Seedance từ `Segment` + `SegmentLine[]`:
- `shouldGenerateAudio`: true khi có DIALOGUE hoặc SUBTITLE_CONFIG, false khi chỉ VISUAL/BGM.
- `assembleSeedanceRequest`: cộng dồn `duration` đúng từ VISUAL+DIALOGUE (bỏ BGM/SUBTITLE_CONFIG), fallback về `segmentDurationSecFallback` khi tổng = 0, thứ tự `referenceImage` (nhân vật trước, scene/prop sau, theo thứ tự `@asset` xuất hiện), `referenceAudio` gom đúng qua `@asset:ID` lẫn tra theo tên nhân vật (asset `VOICE` riêng), khối `[Phong cách hình ảnh video]` luôn ở đầu, gộp phụ đề+nhạc nền đúng theo `subtitleMode` ("auto" gộp cả 2, "post" chỉ nhạc nền), khối `[Ngoại hình nhân vật]`/`[Bối cảnh]` đúng chỉ số Hình, thay thế `@asset:ID` trong text chính bằng tên+số Hình, giữ nguyên token nếu asset không tồn tại, mốc thời gian `mm:ss` cộng dồn đúng kể cả qua phút, format dòng thoại có/không `direction`, `generateAudio` phản ánh đúng nội dung, truyền thẳng `model`/`ratio`/`resolution`.

### 2.3 `tests/segmentValidate.test.ts` (11 tests)
Test `lib/segmentValidate.ts` — đúng 4 mục kiểm tra trước khi cho phép "phát ra" (BACKEND_PROMPT.md):
1. `VISUAL_LINE_HAS_CHARACTER` — dòng visual bị gắn nhân vật.
2. `DURATION_OUT_OF_RANGE` — tổng thời lượng ngoài khoảng 4–30s (test cả 2 chiều), xác nhận BGM/SUBTITLE_CONFIG không tính vào tổng.
3. `MISSING_REFERENCE_IMAGE` — asset không tồn tại hoặc tồn tại nhưng thiếu `imageUrl`.
4. `MISSING_VOICE` — nhân vật trong dialogue chưa gắn giọng; xác nhận không báo lỗi khi có `voiceUrl` khớp tên.
5. `MISSING_SETTINGS` — liệt kê đúng field còn thiếu (ratio/resolution/model/visualStyle).
6. Segment hợp lệ đầy đủ → mảng lỗi rỗng; segment vi phạm nhiều điều kiện → trả về nhiều lỗi cùng lúc.

### 2.4 `tests/wallet.test.ts` (9 tests)
Test cơ chế tính phí + quyết toán ví (hold-then-settle), qua `lib/pricing.ts` (xem mục 3 — tách logic thuần để test độc lập không cần DB):
- Bảng `PRICING` khớp đúng BACKEND_PROMPT.md (SCRIPT 500 / SUMMARY 200 / CHARACTER_IMAGE 800 / SHOT_IMAGE 800 / SHOT_VIDEO 4000 / VOICE 400 / STORYBOARD 300); `SHOT_VIDEO` đắt nhất.
- `computeSettlement`: SUCCEEDED không truyền `actualCost` → mặc định = `estimatedCost`, refund = 0; SUCCEEDED với `actualCost` thấp hơn → hoàn đúng phần chênh lệch, chỉ trừ `actualCost`; **FAILED → `actualCost` luôn = 0 bất kể giá trị truyền vào (không mất tiền), hoàn toàn bộ khoản tạm giữ**, loại Transaction đúng `REFUND`/`USAGE_SETTLE`, mô tả có fallback "unknown error" khi không có message lỗi, `transactionAmount` không bao giờ dương.

---

## 3. Refactor phục vụ test (không đổi hành vi)

`lib/jobs.ts` phụ thuộc trực tiếp `./prisma` (import giá trị `PrismaClient`), nên **không thể import trong môi trường test** vì `@prisma/client` chưa được generate trong sandbox này (xem mục 4). Để test được đúng phần logic quan trọng nhất về tiền (tính phí + hold/settle) mà không cần DB thật, đã tách phần **thuần túy** (không đụng Prisma) ra `lib/pricing.ts`:

- `PRICING`, `estimateCost()` — bảng giá.
- `computeSettlement()` — hàm thuần tính `actualCost`/`refund`/loại Transaction/mô tả khi job SUCCEEDED/FAILED, **trích nguyên logic** trước đó nằm trong `settleJob()`.

`lib/jobs.ts` giờ import và dùng lại các hàm này (`createGenerationJob`/`settleJob` giữ nguyên hành vi, chỉ đổi cách tổ chức code), và re-export `PRICING`/`estimateCost` để không phá interface cũ cho các file khác đang `import { PRICING, estimateCost } from "./jobs"`.

---

## 4. Giới hạn môi trường sandbox — KHÔNG PHẢI lỗi code

`npx prisma generate` bị chặn bởi chính sách egress của agent proxy trong sandbox này:

```
Error: request to https://binaries.prisma.sh/... failed, reason: connect ECONNREFUSED (proxy 403)
```

Đã xác nhận qua `curl $HTTPS_PROXY/__agentproxy/status`: domain `binaries.prisma.sh` bị từ chối kết nối (`connect_rejected`, "gateway answered 403 to CONNECT — policy denial or upstream failure"), không phải lỗi tạm thời — đã thử 2 lần (kể cả với `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`), cả 2 đều 403.

**Hệ quả dây chuyền** (tất cả 7 lỗi TypeScript còn lại đều bắt nguồn từ đây, không phải bug logic):
- `@prisma/client` trong `node_modules` chỉ là bản "chưa init" (placeholder) — `new PrismaClient()` throw runtime error "did not initialize yet. Please run prisma generate".
- Vì vậy: `JobType` (enum) không được export từ `@prisma/client` → lỗi ở `lib/jobs.ts:13`, `lib/publicToolRun.ts:12`.
- Type của `prisma.$transaction(async (tx) => ...)` không suy luận được (do Prisma Client stub thiếu type thật) → tham số `tx` implicit `any` ở `lib/jobs.ts` (2 chỗ), `app/api/segments/[id]/route.ts:40`.
- Type trả về của `prisma.episode.findFirst(...)` cũng bị ảnh hưởng dây chuyền → `lib/episodeJobs.ts:176,187` implicit `any`.
- Vì cùng lý do, **không thể chạy** `npx prisma migrate dev`, `npm run db:seed` (seed dùng `@prisma/client` thật), hoặc test tích hợp có chạm DB trong sandbox này.

**Đã xác minh KHÔNG phải lỗi cấu trúc code khác:**
- `next build` **compile/bundle thành công** ("Compiled successfully") — toàn bộ code hợp lệ về mặt cú pháp/module resolution, chỉ bước type-check (chạy `tsc` riêng, cần type Prisma thật) là fail.
- Sau khi chạy `next build` một lần, Next.js tự sinh `.next/types/**` — lỗi `Cannot find name 'LayoutProps'` (route type tự sinh cho `app/layout.tsx`) đã tự hết, xác nhận đó chỉ là hệ quả "chưa build lần nào", không phải bug.

### Cách khắc phục (chạy trên máy người dùng, có mạng bình thường)

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed        # tạo demo@filmcraft.local / demo12345, 3 dự án phim, 2 dự án video
npx tsc --noEmit        # phải sạch lỗi sau khi có Prisma Client thật
npm run build
npm run dev
```

---

## 5. ESLint — đã sửa toàn bộ (0 lỗi, 0 cảnh báo)

Chạy `npx eslint .` phát hiện 8 vấn đề (3 lỗi, 5 cảnh báo) **không liên quan Prisma**, đã sửa hết trong lúc thực hiện TASK-013:

| File | Vấn đề | Đã sửa |
|---|---|---|
| `app/api/video-projects/[id]/render/route.ts` | Import `findOwnedVideoProject` không dùng | Xoá import thừa |
| `app/drama/[id]/page.tsx` | `setAssetTab: (v: any) => void` — dùng `any` | Đổi sang type chính xác `(typeof assetTabs)[number]` |
| `app/drama/page.tsx` | Gọi `setError(null)` đồng bộ ngay trong effect (có thể gây cascading render) | Dời vào trong `.then()` khi fetch thành công, thay vì gọi trước khi fetch |
| `app/drama/[id]/episodes/[episodeId]/page.tsx` | Gọi `load()` (hàm async có setState) trực tiếp trong effect bị rule `react-hooks/set-state-in-effect` báo — nhưng setState chỉ chạy **sau khi** `await` xong, không đồng bộ, nên an toàn về hành vi | Thêm `eslint-disable-next-line` có chú thích rõ lý do (rule không theo dõi qua ranh giới hàm async) |
| `app/drama/[id]/episodes/[episodeId]/page.tsx`, `app/tools/[slug]/page.tsx` | 2 comment `eslint-disable-next-line jsx-a11y/media-has-caption` + 1 `no-alert` không còn cần thiết (rule không bật trong config hiện tại) | Xoá comment thừa |
| `lib/providers/llm.ts` | Param `input` của `RealLlmProvider.generateText()` không dùng (stub TODO) | Bỏ tên param, theo đúng pattern đã dùng ở `image.ts`/`video.ts`/`tts.ts` cùng thư mục |

---

## 6. Những gì CHƯA thể xác minh trong sandbox này

- Chạy thật `next dev`/`next build` full production với DB Postgres kết nối thật.
- `prisma migrate dev` áp schema vào DB thật, `npm run db:seed` chạy thật (insert data).
- Luồng NextAuth Credentials đăng nhập/đăng ký end-to-end qua HTTP thật.
- Gọi thật các Route Handler (integration test qua HTTP) — vì cần Prisma Client thật + DB Postgres chạy được, sandbox này không có Postgres và không generate được Prisma Client.
- Test tương tranh (concurrency) thật của in-process queue / camera-stitch sequential chaining dưới tải — mới chỉ được kiểm chứng qua đọc code + unit test logic thuần liên quan (promptAssembler, segmentValidate).

Các mục này cần chạy trên máy người dùng (mục 4) hoặc trong CI có mạng đầy đủ — nên đưa vào UAT report như điều kiện "CONDITIONAL PASS".
