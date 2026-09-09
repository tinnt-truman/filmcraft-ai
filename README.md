# FilmCraft AI (demo local)

Nền tảng tạo phim ngắn/kịch bản bằng AI — kịch bản → thư viện tài sản →
dựng video theo tập, và 1 wizard 4 bước cho "Video ngắn AI". Full-stack
Next.js 16 (App Router): frontend + backend thật (Route Handlers + Prisma +
PostgreSQL + NextAuth) trong cùng 1 project.

**Đây là bản demo chạy LOCAL, phi thương mại**, dùng để tham khảo/tự học
kiến trúc build 1 app dạng "AI video generation SaaS". Tên "FilmCraft AI" và
toàn bộ nội dung mẫu (tên dự án, câu chuyện...) là nội dung gốc.

Backend **thật** (có DB, có auth, có hàng đợi job, có tính phí ví token) —
không còn chỉ là mock data tĩnh. AI providers mặc định chạy ở chế độ **Mock**
(offline, không cần API key) để bạn chạy thử toàn bộ luồng ngay mà không cần
đăng ký dịch vụ nào; cắm API key thật vào `.env` khi muốn dùng model thật
(xem mục "AI providers" bên dưới).

## Chạy thử (local)

Cần: Node.js 20+, PostgreSQL (chạy local hoặc Docker).

```bash
# 1. Cài dependencies
npm install

# 2. Chạy Postgres (nếu chưa có sẵn) — ví dụ bằng Docker:
docker run --name filmcraft-db -e POSTGRES_PASSWORD=filmcraft \
  -e POSTGRES_DB=filmcraft -p 5432:5432 -d postgres:16

# 3. Copy & chỉnh .env
cp .env.example .env
# ít nhất cần: DATABASE_URL, NEXTAUTH_SECRET (tạo bằng `openssl rand -base64 32`)

# 4. Generate Prisma Client + tạo schema trong DB
npx prisma generate
npx prisma migrate dev --name init

# 5. Seed dữ liệu mẫu (user demo + 3 dự án phim + 2 dự án video)
npm run db:seed

# 6. Chạy dev server
npm run dev
```

Mở http://localhost:3000. Đăng nhập bằng tài khoản demo được seed sẵn:

- **Email:** `demo@filmcraft.local`
- **Mật khẩu:** `demo12345`
- Ví demo có sẵn 200.000 token để thử các thao tác tốn phí (sinh ảnh, sinh
  video, tái tạo kịch bản...).

> **Lưu ý (sandbox phát triển):** nếu bạn thấy `npx prisma generate` /
> `npx prisma migrate dev` báo lỗi mạng khi build trong môi trường CI/sandbox
> hạn chế egress — đây là hạn chế của môi trường đó, không phải lỗi code.
> Chạy trên máy cá nhân có mạng bình thường sẽ không gặp vấn đề này (xem
> `test_report.md` để biết chi tiết đã xác minh trong quá trình phát triển).

## Cấu trúc

```
app/
  api/**/route.ts     Backend thật — xem docs/API.md (đầy đủ ~34 endpoint)
  drama/               FE "Kịch bản phim" (đã nối API thật)
  video/               FE "Video ngắn AI" (đã nối API thật)
  tools/               5 công cụ AI đơn lẻ — dùng thử không cần đăng nhập
  assets/              Quản lý tài sản (nhân vật/bối cảnh/đạo cụ/âm sắc)
  pricing/             Nạp tiền / bảng giá theo token (đã nối ví thật)
  login/               Đăng nhập / đăng ký

lib/
  prisma.ts            Prisma Client singleton
  auth.ts               NextAuth Credentials + helper requireUserId()/getCurrentUser()
  routeAuth.ts           withAuth()/withPublic() — chuẩn hoá auth + error mapping
  ownership.ts            Helper truy vấn resource có lọc userId (chống IDOR)
  scriptParser.ts       scriptRaw (markdown) → Scene/Shot/DialogueLine
  promptAssembler.ts    Segment + SegmentLine[] → Seedance request (đa phương thức)
  segmentValidate.ts    4 điều kiện validate trước khi "phát ra" video
  jobs.ts / pricing.ts  GenerationJob + tính phí + hold/settle ví (token)
  queue.ts               Hàng đợi job nền (in-process, hoặc BullMQ+Redis nếu có REDIS_URL)
  episodeJobs.ts         Điều phối generate 1 đoạn / cả tập (+ nối khung hình cuối)
  publicToolRun.ts       Dual-mode cho /api/tools/* (khách demo free, user thì tính phí)
  providers/{llm,image,video,tts}.ts   Adapter AI — Mock (mặc định) / Real (TODO, cắm API key)
  apiClient.ts / apiError.ts   Helper fetch + poll job phía FE / chuẩn hoá response lỗi phía BE

prisma/
  schema.prisma        Toàn bộ data model (xem docs/ARCHITECTURE.md)
  seed.ts               Dữ liệu mẫu (user demo, 3 dự án phim, 2 dự án video)

tests/                 Vitest — logic thuần (parser, prompt assembler, validate, pricing)
docs/
  API.md                Chi tiết từng endpoint (request/response/error code)
  ARCHITECTURE.md        Sơ đồ luồng request, vì sao thiết kế như vậy
```

Xem thêm `BACKEND_PROMPT.md` — spec gốc đã dùng để build toàn bộ backend này.

## AI providers — chạy mock hay model thật?

Mặc định (không có API key nào trong `.env`) → mọi thao tác "AI" (sinh kịch
bản, tóm tắt, ảnh nhân vật, video...) chạy qua **Mock provider**: offline,
không tốn tiền, không cần mạng, đủ để trải nghiệm toàn bộ luồng (kể cả cơ
chế tính phí ví — vẫn trừ/hoàn token bình thường, chỉ là kết quả trả về là
giả lập).

Muốn dùng model thật: điền API key tương ứng vào `.env` (xem
`.env.example`) rồi hoàn thiện phần `RealXxxProvider` (hiện đang throw
"chưa implement" — kiến trúc adapter đã sẵn, chỉ cần điền code gọi API):

| Loại | Biến `.env` | File cần hoàn thiện |
|---|---|---|
| LLM (kịch bản/tóm tắt) | `ANTHROPIC_API_KEY` hoặc `OPENAI_API_KEY` | `lib/providers/llm.ts` |
| Sinh ảnh | `REPLICATE_API_TOKEN` hoặc `FAL_KEY` | `lib/providers/image.ts` |
| Sinh video | `SEEDANCE_API_KEY` | `lib/providers/video.ts` |
| Text-to-speech | `ELEVENLABS_API_KEY` | `lib/providers/tts.ts` |

### 9Router — gộp nhiều provider qua 1 gateway local

Thay vì cắm từng key riêng ở trên, có thể dùng
[9Router](https://9router.com) (`npm install -g 9router`, chạy local ở
`http://localhost:20128/v1`, gộp nhiều model — Claude Code, GLM, Kimi,
Qwen... — qua 1 API kiểu OpenAI-compatible). Đã tích hợp sẵn cho **LLM** và
**TTS** (2 endpoint có xác nhận chính thức trong tài liệu 9Router:
`/v1/chat/completions`, `/v1/audio/speech`) — set `NINE_ROUTER_API_KEY` +
`NINE_ROUTER_LLM_MODEL`/`NINE_ROUTER_TTS_MODEL` là dùng được ngay, ưu tiên
hơn `ANTHROPIC_API_KEY`/`ELEVENLABS_API_KEY`. **Image/Video qua 9Router là
thử nghiệm, CHƯA xác nhận có hỗ trợ thật hay không** (endpoint đoán theo quy
ước OpenAI-compatible chung, không có trong README gốc của 9Router) — chỉ
kích hoạt khi bạn tự set thêm `NINE_ROUTER_IMAGE_MODEL`/
`NINE_ROUTER_VIDEO_MODEL`; nên gọi `GET {base}/models` sau khi cài để kiểm
tra model nào thực sự khả dụng trước. Chi tiết + cảnh báo đầy đủ nằm ở
`lib/providers/nineRouter.ts`.

## Test

```bash
npm test          # vitest run — 54 test, logic thuần (không cần DB)
npx tsc --noEmit   # type-check (cần `npx prisma generate` trước để sạch hoàn toàn)
npx eslint .
npm run build
```

Xem `test_report.md` để biết chi tiết kết quả đã chạy & giới hạn môi trường
sandbox lúc phát triển (chủ yếu: `prisma generate` cần mạng, không chạy
được trong sandbox CI hạn chế egress — không ảnh hưởng khi bạn chạy local).

## Giới hạn có chủ đích của bản demo

Xem mục cuối `docs/ARCHITECTURE.md` — tóm tắt: chạy 1 process duy nhất
(không auto-scale), chưa ghép video hậu kỳ bằng ffmpeg, thanh toán ở chế độ
demo (chưa cắm cổng thật), AI providers mặc định là mock.
