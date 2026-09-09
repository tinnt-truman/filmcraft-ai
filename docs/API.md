# FilmCraft AI — API Reference

Toàn bộ endpoint nằm dưới `/api/*`, viết bằng Next.js Route Handlers (`app/api/**/route.ts`).

## Quy ước chung

**Auth.** Mọi route dưới `/api/**` yêu cầu đăng nhập (session NextAuth JWT, cookie), **trừ** 3 nhóm được whitelist trong `middleware.ts`:
- `/api/auth/*` — đăng ký / đăng nhập / session (NextAuth).
- `/api/tools/*` — 5 công cụ AI đơn lẻ, cho dùng thử **không cần đăng nhập**.
- `/api/webhooks/*` — callback từ cổng thanh toán, tự xác thực bằng secret riêng (không dùng session).

Chưa đăng nhập mà gọi route cần auth → `middleware.ts` chặn sớm, trả `401 { "error": { "code": "UNAUTHORIZED", "message": "Cần đăng nhập để dùng API này." } }`.

**Response thành công**: trả thẳng object dữ liệu (không bọc thêm), status 200 (hoặc 201 khi tạo mới, 202 khi enqueue job nền).

**Response lỗi** — luôn cùng 1 shape:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ.", "details": { } } }
```
`details` là optional (ví dụ: `.flatten()` của Zod khi validate fail, hoặc `{ missing: [...] }` từ segmentValidate).

| HTTP | code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body không khớp Zod schema |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 402 | `INSUFFICIENT_BALANCE` | Số dư ví không đủ để tạm giữ chi phí job (`details: { required, available }`) |
| 404 | `NOT_FOUND` | Không tìm thấy resource, hoặc resource không thuộc về user hiện tại |
| 409 | `CONFLICT` | Đang có thao tác xung đột (VD: segment đang GENERATING) |
| 422 | `SEGMENT_NOT_READY` | Segment chưa đạt 4 điều kiện validate trước khi generate (`details: { errors }` — xem `lib/segmentValidate.ts`) |
| 422 | `EMPTY_SCRIPT` / `NO_SCENES` / `NO_SEGMENTS` | Thiếu dữ liệu tiền đề cho 1 thao tác AI |
| 501 | `NOT_IMPLEMENTED` | Cổng thanh toán thật chưa cắm (chỉ khi có `VNPAY_TMN_CODE`/`PAYOS_CLIENT_ID` trong `.env` nhưng chưa code xong) |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước |

Toàn bộ logic map lỗi ở trên nằm ở `lib/routeAuth.ts` (`withAuth` / `withPublic`) — mỗi route handler chỉ cần `throw` đúng loại Error, không tự viết try/catch lặp lại.

**Job bất đồng bộ.** Các thao tác gọi AI (sinh kịch bản, tóm tắt, ảnh, video...) đều trả `202` kèm `{ "jobId": "...", "status": "QUEUED" }` ngay lập tức — client tự poll `GET /api/jobs/:id` cho tới khi `status` là `SUCCEEDED`/`FAILED`. Xem `lib/apiClient.ts` (hàm `pollJob`) cho cách FE đã làm việc này (interval 1.5s, timeout 90s).

---

## Auth

### `POST /api/auth/register`
Đăng ký user mới + tạo `Wallet` (balance 0). Public.

Body: `{ "email": string, "password": string (>=8 ký tự), "name"?: string }`
201 → `{ "id", "email", "name", "createdAt" }`. 409 `EMAIL_TAKEN` nếu email đã tồn tại.

### `GET|POST /api/auth/[...nextauth]`
Handler chuẩn của NextAuth (Credentials provider, JWT session). FE gọi qua `signIn("credentials", { email, password })` / `signOut()` từ `next-auth/react` (xem `app/login/page.tsx`), không gọi trực tiếp route này.

---

## Kịch bản phim — Drama

### `GET /api/drama`
Danh sách dự án của user. Query: `status` (`all`/`draft`/`in_progress`/`completed`), `search` (tìm theo title).
200 → `{ "projects": DramaProject[] }` (kèm `summary`, `_count: { episodes, characters }`).

### `POST /api/drama`
Tạo dự án mới (kèm `ProjectSummary` rỗng).
Body: `{ "title": string, "style"?: string, "coverGradient"?: string }` → 201 → `DramaProject`.

### `GET /api/drama/:id`
Chi tiết dự án — `summary` + `characters[]` + `episodes[]` (sắp theo `index`).

### `PATCH /api/drama/:id/summary`
Hai chế độ theo body:
- `{ "storyGenre"?, "targetAudience"?, "coreHook"?, "logline"?, "fullSummary"?, "visualStyle"?, "episodeCount"? }` — sửa tay, upsert `ProjectSummary`.
- `{ "regenerate": true, "instructions"?: string }` — gọi LLM viết lại `fullSummary` (job `type: SUMMARY`, phí 200 token). → 202 `{ jobId, status }`.

### `POST /api/drama/:id/characters`
Thêm nhân vật. Body: `{ "name", "characterType"?, "visualDescription"?, "coreTags"?: string[], "background"?, "personality"? }` → 201 `Character`.

### `PATCH /api/characters/:id`
Sửa nhân vật (mọi field optional, kể cả `referenceImageUrl`). → `Character`.

### `DELETE /api/characters/:id`
→ `{ "ok": true }`.

### `POST /api/characters/:id/generate-image`
Sinh ảnh tham chiếu nhân vật (job `CHARACTER_IMAGE`, phí 800 token) — dùng `visualDescription` + `visualStyle` của dự án làm prompt, ghi thẳng `referenceImageUrl` khi xong. → 202 `{ jobId, status }`.

### `GET /api/drama/:id/episodes`
Danh sách tập (sắp theo `index`), kèm `_count: { scenes, segments }`. → `{ episodes: Episode[] }`.

---

## Tập phim — Episode

### `PATCH /api/episodes/:id`
Sửa tay `title` / `summary` / `scriptRaw` (nút "Chỉnh sửa văn bản chính"). → `Episode`.

### `POST /api/episodes/:id/regenerate-script`
Gọi LLM sinh lại toàn bộ `scriptRaw` theo đúng khuôn mẫu markdown (`### Cảnh`, `△`, thoại — xem `lib/scriptParser.ts`). Job `SCRIPT`, phí 500 token. Body optional: `{ "instructions"?: string }`. → 202 `{ jobId, status }`.

### `POST /api/episodes/:id/storyboard`
"AI phân cảnh": parse `scriptRaw` bằng `parseScriptRaw()` → xoá hết Scene cũ, tạo lại Scene/Shot/DialogueLine trong 1 transaction, set `episode.status = STORYBOARD_READY`. Job `STORYBOARD`, phí 300 token. 422 `EMPTY_SCRIPT` nếu `scriptRaw` rỗng. → 202 `{ jobId, status }`.

### `GET /api/episodes/:id/segments`
Trả `{ episode: {...cài đặt cấp tập...}, segments: Segment[] (kèm lines[]) }` — nguồn dữ liệu chính cho màn hình editor đoạn phim.

### `PATCH /api/episodes/:id/settings`
Lưu cài đặt cấp tập: `{ "ratio"?, "resolution"?, "videoModel"?, "subtitleMode"?, "stitchEnabled"? }` (mọi field nullable/optional, null = kế thừa mặc định dự án). → `Episode`.

### `POST /api/episodes/:id/regenerate-all`
"Tái lập kịch bản bằng AI" — enqueue generate cho **toàn bộ** segment của tập theo thứ tự (xem `lib/episodeJobs.ts#regenerateAllSegments`). 409 `CONFLICT` nếu còn segment đang `GENERATING`. → 202 `{ jobIds: string[] }`.

### `POST /api/episodes/:id/render`
Render toàn tập — tương tự `regenerate-all` nhưng còn set `episode.status = RENDERED` khi `stitchEnabled` (chờ xong tuần tự). 422 `NO_SEGMENTS` nếu tập chưa có segment nào. → 202 `{ jobIds }`.

### `GET /api/episodes/:id/subtitles.srt`
Xuất phụ đề `.srt` (ghép mốc thời gian cộng dồn từ toàn bộ `SegmentLine` tag `VISUAL`/`DIALOGUE` của mọi segment trong tập). Trả file (`Content-Type: application/x-subrip`, có `Content-Disposition: attachment`), không phải JSON.

---

## Đoạn phim — Segment (Seedance pipeline)

### `PATCH /api/segments/:id`
Sửa `title` / `durationSec` (1–30s) / **thay thế toàn bộ** `lines[]`. Gửi `lines` sẽ xoá hết `SegmentLine` cũ rồi tạo lại theo mảng mới, và reset `status → PENDING`, `videoUrl → null` (vì nội dung đổi thì video cũ không còn khớp). 409 `CONFLICT` nếu segment đang `GENERATING`. → `Segment` (kèm `lines`).

Mỗi phần tử `lines[]`: `{ order, tag: "SUBTITLE_CONFIG"|"BGM"|"DIALOGUE"|"VISUAL", durationSec, characterName?, direction?, shotType?, text }`.

### `POST /api/segments/:id/generate`
Nút **"phát ra"**. Luồng: validate 4 điều kiện (`lib/segmentValidate.ts`) → nếu lỗi, 422 `SEGMENT_NOT_READY` với `details.errors` → ước tính phí theo `PRICING.SHOT_VIDEO` (4000 token) → hold ví (402 `INSUFFICIENT_BALANCE` nếu không đủ) → lắp Seedance request (`lib/promptAssembler.ts`) → tạo `GenerationJob` (`type: SHOT_VIDEO`) → enqueue. → 202 `{ jobId }`.

---

## Video ngắn AI — VideoProject

### `GET /api/video-projects`
Danh sách dự án video của user. Query: `status`. → `{ projects: VideoProject[] }`.

### `POST /api/video-projects`
Tạo dự án mới (bước 0 wizard) — mọi field có default hợp lý (khớp lựa chọn mặc định trên FE). → 201 `VideoProject`.

### `GET /api/video-projects/:id`
Chi tiết + `scenes[]` (sắp `order`).

### `PATCH /api/video-projects/:id`
Lưu từng bước wizard: `title`, `templateId`, `topic`, `durationRange`, `audience`, `visualStyleId`, `characterStyleId`, `voiceId`, `ratio`, `status` — mọi field optional. → `VideoProject`.

### `POST /api/video-projects/:id/storyboard`
Bước 4 "Bắt đầu tạo": gọi LLM sinh JSON các `VideoScene` (`title/desc/startSec/endSec`) từ `topic`+`audience`+`durationRange`; nếu LLM không trả JSON hợp lệ, dùng `DEFAULT_SCENES` (5 cảnh mẫu cố định) làm fallback — **không bao giờ fail vì lỗi parse**. Job `STORYBOARD`. Set `status: GENERATING → COMPLETED` (hoặc `→ DRAFT` nếu lỗi). → 202 `{ jobId, status }`.

### `POST /api/video-projects/:id/render`
Xuất video: với từng `VideoScene` chưa có `videoUrl`, sinh ảnh (`ImageProvider`) rồi sinh video (`VideoProvider`) tuần tự, ghi `imageUrl`/`videoUrl` từng cảnh. **Lưu ý:** bản demo này KHÔNG ghép (ffmpeg concat) các đoạn thành 1 file phim hoàn chỉnh — mỗi `VideoScene` có `videoUrl` riêng. Job `SHOT_VIDEO` (phí 4000 token, tính 1 lần cho cả lượt render — không nhân theo số cảnh). 422 `NO_SCENES` nếu dự án chưa có storyboard. → 202 `{ jobId, status }`.

---

## Job polling

### `GET /api/jobs/:id`
Trả `GenerationJob` đầy đủ (`status`, `estimatedCost`, `actualCost`, `resultUrl`, `error`, ...) — dùng để poll sau mọi endpoint trả `202`. 404 nếu job không tồn tại hoặc không thuộc user.

---

## Tài sản — Asset

### `GET /api/assets`
Query: `category` (`CHARACTER`/`SCENE`/`PROP`/`VOICE`), `projectId`, `scope=personal` (ép `projectId: null` — mục "Trung tâm cá nhân"). → `{ assets: Asset[] }`.

### `POST /api/assets`
Body: `{ category, name, projectId?: string|null, imageUrl?, metadata? }`. `metadata` là JSON tự do — VD asset `VOICE`/`CHARACTER` lưu `{ audioUrl }`/`{ voiceAudioUrl }` để `lib/episodeJobs.ts` tra ra giọng tham chiếu. → 201 `Asset`.

### `PATCH /api/assets/:id` / `DELETE /api/assets/:id`
Sửa (`name`/`imageUrl`/`metadata`) hoặc xoá. → `Asset` / `{ ok: true }`.

---

## Công cụ AI đơn lẻ — Tools (public demo, dual-mode)

5 endpoint dưới `/api/tools/*` **không bị middleware chặn** — dùng thử không cần đăng nhập. Cơ chế 2 chế độ nằm ở `lib/publicToolRun.ts`:

- **Khách (chưa đăng nhập):** chạy provider ngay đồng bộ, **không** tạo `GenerationJob`, **không** trừ ví. Trả `200 { "demo": true, "status": "SUCCEEDED", "result": {...} }`.
- **Đã đăng nhập:** tạo `GenerationJob` thật (trừ tạm ví theo `PRICING`), enqueue như bình thường. Trả `202 { "demo": false, "jobId": "...", "status": "QUEUED" }` — poll `GET /api/jobs/:id` để lấy kết quả.

| Endpoint | Body | jobType |
|---|---|---|
| `POST /api/tools/text-to-image` | `{ prompt, negativePrompt?, ratio? }` | `SHOT_IMAGE` |
| `POST /api/tools/image-to-image` | `{ referenceImageUrl, prompt, similarity? }` | `SHOT_IMAGE` |
| `POST /api/tools/image-to-product` | `{ productImageUrl, outputType, description? }` | `SHOT_IMAGE` |
| `POST /api/tools/text-to-video` | `{ script, durationSec?, ratio? }` | `SHOT_VIDEO` |
| `POST /api/tools/video-to-video` | `{ sourceVideoUrl, transformDescription, intensity? }` | `SHOT_VIDEO` |

---

## Ví & thanh toán — Wallet

### `GET /api/wallet`
Tự tạo `Wallet` (balance 0) nếu user chưa có. → `{ balance, heldAmount, available }` (`available = balance - heldAmount`).

### `POST /api/wallet/topup`
Body: `{ amount: number (>0), method?: "card"|"bank"|"wallet"|"invoice" }`.
- **Chế độ demo** (mặc định — không có `VNPAY_TMN_CODE`/`PAYOS_CLIENT_ID` trong `.env`): cộng tiền **ngay lập tức**, ghi `Transaction(type: TOPUP)`. → `{ demo: true, balance, heldAmount, available }`.
- **Có key thật:** hiện trả `501 NOT_IMPLEMENTED` (TODO — cần tích hợp VNPay/PayOS thật, tạo `checkoutUrl` rồi chờ webhook xác nhận).

### `GET /api/wallet/transactions`
Query: `limit` (mặc định 50, tối đa 200). → `{ transactions: Transaction[] }` (mới nhất trước).

### `POST /api/webhooks/payment`
Callback xác nhận thanh toán từ cổng thật (không dùng session — whitelist trong middleware). Body: `{ userId, amount, reference?, secret? }`. Nếu `.env` có `PAYMENT_WEBHOOK_SECRET`, `secret` phải khớp (401 `INVALID_SIGNATURE` nếu sai). Cộng tiền + ghi `Transaction(TOPUP)` tương tự topup demo. **TODO:** thay xác thực secret tạm thời này bằng verify chữ ký thật của VNPay (`vnp_SecureHash`) / PayOS (checksum).

---

## Cơ chế tính phí (tóm tắt — xem `lib/pricing.ts` + `lib/jobs.ts`)

| JobType | Giá (token) |
|---|---|
| SCRIPT | 500 |
| SUMMARY | 200 |
| CHARACTER_IMAGE | 800 |
| SHOT_IMAGE | 800 |
| SHOT_VIDEO | 4000 |
| VOICE | 400 |
| STORYBOARD | 300 |

1. Tạo job → trừ tạm `estimatedCost` vào `wallet.heldAmount` (`Transaction USAGE_HOLD`). Không đủ `balance - heldAmount` → `402 INSUFFICIENT_BALANCE`, job không được tạo.
2. Job chạy xong:
   - `SUCCEEDED` → trừ đúng `actualCost` (mặc định = `estimatedCost` nếu provider không trả về chi phí thực tế khác) vào `balance`, giải phóng toàn bộ `heldAmount` đã giữ, hoàn phần chênh lệch (`Transaction USAGE_SETTLE`, `amount = -actualCost`).
   - `FAILED` → `actualCost = 0` luôn (không mất tiền), giải phóng toàn bộ `heldAmount` (`Transaction REFUND`, `amount = 0`).
