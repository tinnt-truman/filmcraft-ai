# UAT Report — FilmCraft AI Backend

Dự án: `filmcraft-ai-backend` (xem `.pipeline/plan.json`)
Ngày: 2026-09-09
Phạm vi: Dựng backend thật (Route Handlers + Prisma + Postgres + NextAuth +
hàng đợi job + tính phí ví token + AI provider adapters) cho FE FilmCraft AI
có sẵn, nối FE từ `mockData.ts` sang API thật, chạy local/phi-thương-mại,
theo spec `BACKEND_PROMPT.md`.

## 1. Checklist theo `plan.json` (14/14 task)

| # | Task | Trạng thái |
|---|---|---|
| 1 | Prisma schema + deps + prisma client + `.env.example` | ✅ Hoàn thành |
| 2 | Seed script từ `mockData.ts` | ✅ Hoàn thành |
| 3 | Auth: NextAuth Credentials + middleware | ✅ Hoàn thành |
| 4 | Script parser `scriptRaw` → Scene/Shot/DialogueLine | ✅ Hoàn thành, có test |
| 5 | Seedance prompt assembler + validate | ✅ Hoàn thành, có test |
| 6 | Queue + GenerationJob + AI provider adapters | ✅ Hoàn thành, có test (phần pricing) |
| 7 | API routes: Drama | ✅ Hoàn thành (7 route) |
| 8 | API routes: Segment editor | ✅ Hoàn thành (6 route) |
| 9 | API routes: Video projects + jobs | ✅ Hoàn thành (5 route) |
| 10 | API routes: Assets, Tools, Wallet | ✅ Hoàn thành (11 route) |
| 11 | Nối FE mockData → API | ✅ Hoàn thành (7 trang) |
| 12 | Docs: README, API.md, ARCHITECTURE.md | ✅ Hoàn thành |
| 13 | Tests + build check | ✅ Hoàn thành (xem `test_report.md`) |
| 14 | UAT report | ✅ Tài liệu này |

Không có task nào bị skip — không có `skipped_tasks.md`.

## 2. Đối chiếu yêu cầu chức năng chính (BACKEND_PROMPT.md)

| Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|
| Prisma schema đủ 4 lớp dữ liệu (User→Wallet, DramaProject→ProjectSummary→Character→Episode→Scene→Shot→DialogueLine, Segment→SegmentLine, VideoProject→VideoScene, Asset, GenerationJob→Transaction) | ✅ | `prisma/schema.prisma`, 14 model + 9 enum, khớp đúng thiết kế trong spec |
| NextAuth Credentials + đăng ký | ✅ | `lib/auth.ts`, `/api/auth/register`, `app/login/page.tsx` |
| Middleware bảo vệ `/api/**` (whitelist auth/tools/webhooks) | ✅ | `middleware.ts` |
| Parser `scriptRaw` → cây Scene/Shot/DialogueLine | ✅ | `lib/scriptParser.ts` — 16 test case, kể cả input rỗng/rác/CRLF |
| Lắp request Seedance (thứ tự khối, `@asset:ID`, mốc thời gian, gộp phụ đề/nhạc nền theo `subtitleMode`) | ✅ | `lib/promptAssembler.ts` — 18 test case |
| 4 điều kiện validate trước khi "phát ra" | ✅ | `lib/segmentValidate.ts` — 11 test case |
| Cơ chế tính phí + hold/settle ví (hoàn tiền khi FAILED) | ✅ | `lib/pricing.ts` + `lib/jobs.ts` — 9 test case, PRICING khớp đúng bảng giá spec |
| Hàng đợi job nền, tối đa 10 song song, không bắt buộc Redis | ✅ | `lib/queue.ts` (in-process mặc định, BullMQ tuỳ chọn qua `REDIS_URL`) |
| AI provider adapter (Mock mặc định + Real TODO có thể cắm key) | ✅ | `lib/providers/{llm,image,video,tts}.ts` |
| Toàn bộ ~34 endpoint theo spec (Drama, Episode, Segment, VideoProject, Asset, Tools, Wallet, Jobs) | ✅ | Xem `docs/API.md` — đã đối chiếu từng route với code thật, không chỉ với spec |
| Nối FE: mọi trang dùng entity động phải gọi API thật thay vì `mockData` | ✅ | `app/drama/page.tsx`, `app/drama/[id]/page.tsx`, `app/drama/[id]/episodes/[episodeId]/page.tsx`, `app/video/page.tsx`, `app/video/[id]/page.tsx`, `app/assets/page.tsx`, `app/tools/[slug]/page.tsx`, `app/pricing/page.tsx`, `components/NavBar.tsx` — đã kiểm tra lại `app/page.tsx` (trang chủ): chỉ dùng `aiTools` (danh sách tĩnh cấu hình UI, không phải entity động) nên không cần nối API, đúng theo thiết kế ban đầu; đã sửa 2 dòng text cũ trên trang chủ còn mô tả app là "demo giao diện, không có backend thật" (sai lệch so với hiện trạng) |
| Giữ nguyên route FE, tên biến, text tiếng Việt hiện có | ✅ | Chỉ thay nguồn dữ liệu (`mockData` → `apiFetch`), giữ nguyên class Tailwind/cấu trúc JSX/nhãn tiếng Việt |
| Chạy local, phi thương mại | ✅ | Không có tích hợp thanh toán thật bắt buộc, AI mock offline mặc định, README hướng dẫn chạy local |

## 3. Bảo mật — đã tự phát hiện & vá trong quá trình code

`generateSegment()`/`regenerateAllSegments()` (`lib/episodeJobs.ts`) ban đầu
tra `Segment`/`Episode` chỉ theo `id`, không lọc `userId` — lỗi **IDOR**
(user A có thể đoán/biết id đoạn phim của user B rồi gọi generate hộ, tốn ví
của chính mình nhưng thao tác lên dữ liệu người khác). Đã vá bằng cách lọc
kèm `userId` ngay trong `where` (`findFirst({ where: { id, episode: { project:
{ userId } } } })`), áp dụng nhất quán cho toàn bộ `lib/ownership.ts` +
route còn lại (không route nào dùng `findUnique({ id })` trần không kèm
`userId`) — đã rà lại toàn bộ 34 route để xác nhận không còn chỗ nào sót.

## 4. Test & build (tóm tắt — chi tiết ở `test_report.md`)

- **Vitest: 54/54 PASS** (4 file) — phủ toàn bộ logic thuần quan trọng nhất
  (parser kịch bản, lắp prompt Seedance, validate segment, tính phí + hold/
  settle ví).
- **ESLint: 0 lỗi, 0 cảnh báo** trên toàn repo (đã sửa 8 vấn đề phát hiện
  được trong lúc làm task 13, không liên quan Prisma).
- **`next build` (bundle/compile): PASS.**
- **`next build` (type-check) / `npx tsc --noEmit`: FAIL** — nhưng **toàn bộ
  7 lỗi còn lại quy về đúng 1 nguyên nhân gốc duy nhất**: `npx prisma
  generate` bị chặn bởi chính sách egress của sandbox phát triển (xác nhận
  qua log lỗi + `curl $HTTPS_PROXY/__agentproxy/status`, domain
  `binaries.prisma.sh` bị từ chối 403). Không phải lỗi logic trong code.
- **Chưa chạy được** (cùng lý do): `prisma migrate dev`, `npm run db:seed`
  thật, integration test qua HTTP thật với DB Postgres, luồng đăng nhập/
  đăng ký end-to-end thật.

## 5. Rủi ro / giới hạn còn tồn đọng (không phải bug, là giới hạn thiết kế đã ghi rõ trong docs)

- Chạy 1 process duy nhất, hàng đợi in-process là in-memory — không dùng
  được cho nhiều instance/nhiều user quy mô lớn (đã ghi rõ trong
  `docs/ARCHITECTURE.md`).
- Không ghép video hậu kỳ (ffmpeg concat) thành 1 file phim hoàn chỉnh.
- Thanh toán ở chế độ demo (cộng tiền ngay); có key cổng thật thì trả `501
  NOT_IMPLEMENTED` vì phần tích hợp thật là TODO có chủ đích.
- AI provider "Real" là stub throw lỗi — cần code thêm khi cắm key thật
  (kiến trúc adapter đã sẵn sàng, chỉ thiếu phần gọi API cụ thể).
- Nếu `REDIS_URL` được set nhưng process bị restart giữa lúc job đang chờ
  trong Redis, job đó sẽ bị bỏ qua (closure không serialize được) — đã ghi
  rõ trong `lib/queue.ts` và `docs/ARCHITECTURE.md`, chấp nhận được cho quy
  mô demo local.

## 6. Kết luận

**CONDITIONAL PASS.**

Toàn bộ 14 task trong `plan.json` đã hoàn thành; toàn bộ logic thuần quan
trọng nhất (parser, prompt assembler, validate, pricing/wallet) đã có test
tự động và PASS 100%; ESLint sạch; `next build` compile/bundle thành công;
1 lỗ hổng bảo mật (IDOR) được tự phát hiện và vá triệt để trong quá trình
phát triển; docs đầy đủ và khớp với code thật (đã đọc lại từng route để xác
minh, không chỉ chép lại spec).

Điều kiện để chuyển thành **PASS đầy đủ**: chạy `npm install && npx prisma
generate && npx prisma migrate dev && npm run db:seed && npm run dev` trên
máy có mạng bình thường (không bị chặn egress như sandbox phát triển) rồi
xác nhận thủ công 1 lượt: đăng ký/đăng nhập → tạo dự án phim → tái tạo tóm
tắt/kịch bản bằng AI (mock) → AI phân cảnh → sửa 1 đoạn → "phát ra" (trừ ví
đúng 4000 token, poll job tới SUCCEEDED) → tạo dự án Video ngắn AI → wizard
4 bước → render. Đây là bước xác minh **duy nhất** còn thiếu, bị chặn hoàn
toàn bởi hạ tầng mạng của sandbox phát triển chứ không phải bởi chất lượng
code — không có phần chức năng nào được biết là thiếu hoặc sai tại thời
điểm bàn giao.

### Next steps đề xuất cho người dùng

1. Chạy 6 bước ở mục "Chạy thử" trong `README.md` trên máy cá nhân.
2. Xác nhận thủ công luồng end-to-end nêu ở mục 6 phía trên.
3. (Tuỳ chọn) Cắm API key AI thật + hoàn thiện 4 file `lib/providers/Real*`
   nếu muốn kết quả sinh ảnh/video/giọng nói là thật thay vì mock.
4. (Tuỳ chọn) Tích hợp cổng thanh toán thật (VNPay/PayOS) nếu muốn nạp tiền
   qua cổng thật thay vì chế độ demo.
