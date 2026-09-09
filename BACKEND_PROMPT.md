# Prompt: Dựng Backend cho FilmCraft AI (theo FE hiện có)

> Dán nguyên file này cho một AI coding agent (Claude Code, Cursor...) trong
> cùng repo `filmcraft-ai` để nó dựng backend. Phần "Bối cảnh" giúp agent
> hiểu FE đã có gì trước khi viết BE — không cần đọc lại toàn bộ code FE.

## Bối cảnh

Repo hiện tại là một FE Next.js 16 (App Router) + Tailwind v4, tên
**FilmCraft AI** — bản clone giao diện/workflow lấy cảm hứng từ một nền
tảng dựng phim ngắn bằng AI. Toàn bộ dữ liệu hiện đang là **mock tĩnh** nằm
trong `lib/mockData.ts`, chưa có backend, chưa có DB, chưa gọi AI thật.

Các trang FE đã có (giữ nguyên UI, chỉ đổi nguồn dữ liệu từ mock sang API thật):

- `app/page.tsx` — trang chủ
- `app/drama/page.tsx` — danh sách dự án "Kịch bản phim"
- `app/drama/[id]/page.tsx` — chi tiết dự án, workflow 3 bước: **Tóm tắt cốt
  truyện → Thư viện tài sản → Video tập phim**
- `app/video/page.tsx` — danh sách dự án "Video ngắn AI"
- `app/video/[id]/page.tsx` — wizard 4 bước: **Chọn mẫu → Nội dung đầu vào →
  Cấu hình kiểu → Bắt đầu tạo**
- `app/tools/page.tsx` — 6 công cụ AI đơn lẻ
- `app/assets/page.tsx` — quản lý tài sản (nhân vật, bối cảnh, đạo cụ, âm sắc)
- `app/pricing/page.tsx` — ví & nạp tiền theo token

## Nhiệm vụ

Dựng backend **trong cùng repo Next.js** bằng Route Handlers
(`app/api/**/route.ts`) + **Prisma** + **PostgreSQL**, để:

1. Thay `lib/mockData.ts` bằng dữ liệu thật từ DB (CRUD đầy đủ).
2. Thêm xác thực người dùng (mỗi user có dự án/tài sản/ví riêng).
3. Tích hợp AI thật cho các bước sinh nội dung (script, tóm tắt, ảnh, video,
   giọng nói) — thay cho các đoạn mô phỏng tiến trình (`setTimeout`) hiện có.
4. Dựng ví & thanh toán theo token, khớp với UI trang `pricing`.

Không cần sửa lại phần UI/CSS đã có — chỉ thay chỗ FE đang `import` từ
`lib/mockData.ts` bằng gọi API (`fetch` / React Query / server actions, tuỳ
agent chọn), và bổ sung state loading/error cho các thao tác bất đồng bộ.

## Quy cách dữ liệu (đã khảo sát từ nền tảng gốc — bám sát để giữ đúng tinh thần sản phẩm)

Đây là phần quan trọng nhất: dữ liệu "kịch bản" không phải vài trường đơn
giản, mà có 3 lớp lồng nhau. Model DB phải phản ánh đúng 3 lớp này.

### Lớp 1 — Tóm tắt dự án (`ProjectSummary`, 1-1 với `DramaProject`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `episodeCount` | Int | số tập tuỳ chỉnh |
| `storyGenre` | String | vd: "Cổ phong kỳ ảo + hậu truyện thần thoại + phản địa đàng" |
| `targetAudience` | String | vd: "Nam giới / Đại chúng" |
| `coreHook` | String | vd: "Lời tiên tri diệt vong + Đấu tranh Thần-Ma + Phàm nhân lội ngược dòng" |
| `logline` | String (Text) | câu chuyện một câu |
| `fullSummary` | String (Text) | tóm tắt đầy đủ, 1 đoạn văn dài |
| `visualStyle` | String | phong cách hình ảnh của cả dự án |

### Lớp 2 — Tiểu sử nhân vật (`Character`, N-1 với `DramaProject`)

Mỗi nhân vật (kể cả vai trò nhóm như "dân làng") có đúng 5 trường:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `name` | String | vd: "Kyle , Ngôi sao Thảm họa" |
| `characterType` | Enum | `PROTAGONIST` \| `DEUTERAGONIST` \| `ANTAGONIST` \| `SUPPORTING` \| `GROUP` |
| `visualDescription` | Text | mô tả ngoại hình chi tiết — dùng làm prompt sinh ảnh nhân vật nhất quán |
| `coreTags` | String\[] | 2-3 từ khoá, vd `["Lai huyết", "Tiên tri", "Lội ngược dòng"]` |
| `background` | Text | thân thế / bối cảnh xuất thân |
| `personality` | Text | đặc điểm tính cách |
| `referenceImageUrl` | String? | ảnh tham chiếu do AI sinh, để tái sử dụng xuyên suốt các tập |

### Lớp 3 — Kịch bản từng tập (`Episode` → `Scene` → `Shot` / `DialogueLine`)

Nền tảng gốc lưu mỗi tập là **một khối text thô dạng markdown kịch bản**
(không phải form nhiều field rời) — AI sinh ra khối text này, sau đó mới
được parse để tách cảnh quay khi bước sang "Video tập phim". Backend cần hỗ
trợ **cả hai**: lưu `scriptRaw` (nguồn sự thật, cho phép user sửa tay) và
`scenes` đã parse (dùng để hiển thị storyboard / gọi sinh ảnh từng shot).

Định dạng `scriptRaw` cần AI sinh đúng theo khuôn mẫu này (few-shot mẫu để
đưa vào system prompt khi gọi LLM sinh kịch bản):

```
### Cảnh {tập}-{số cảnh}
{Thời gian} {Nội/Ngoại} {Địa điểm}・{Địa điểm phụ}
Nhân vật xuất hiện: {tên 1}, {tên 2}, {tên 3}
△ {Loại cỡ cảnh}: {mô tả hình ảnh chi tiết — góc quay, hành động, biểu cảm}
△ {Loại cỡ cảnh}: {mô tả tiếp theo, có thể nhiều dòng △}
{Tên nhân vật} ({chú thích cảm xúc/hành động trong ngoặc}): {lời thoại}
{Tên nhân vật} ({chú thích}): {lời thoại tiếp theo}
```

Ghi chú khi parse:
- `{Loại cỡ cảnh}` dùng đúng thuật ngữ điện ảnh: `Toàn cảnh xa`, `Cảnh
  trung`, `Cận cảnh`, `Đặc tả`, `Toàn cảnh` — map sang enum `ShotSize`.
- Mỗi dòng bắt đầu bằng `△` là một **Shot** riêng (dùng để sinh 1 ảnh/1 đoạn
  video AI).
- Dòng dạng `Tên (ghi chú): lời thoại` là một **DialogueLine**, gắn với shot
  gần nhất phía trên (hoặc shot riêng nếu cần lồng tiếng độc lập).
- Đôi khi có dòng đặc biệt `[Cảnh trống: ...]` — coi là 1 shot loại
  `MONTAGE`, không có thoại.
- Có thể nhiều block `### Cảnh {tập}-{n}` trong 1 tập → nhiều `Scene`.

Schema gợi ý:

```prisma
model Episode {
  id         String   @id @default(cuid())
  projectId  String
  project    DramaProject @relation(fields: [projectId], references: [id])
  index      Int          // thứ tự tập, 1..N
  title      String
  summary    String       // 1 câu tóm tắt hiển thị ở sidebar
  scriptRaw  String       @db.Text   // nguồn sự thật — markdown kịch bản
  status     EpisodeStatus @default(DRAFT) // DRAFT | STORYBOARD_READY | RENDERED
  scenes     Scene[]
  updatedAt  DateTime @updatedAt
}

model Scene {
  id           String   @id @default(cuid())
  episodeId    String
  episode      Episode  @relation(fields: [episodeId], references: [id])
  sceneNumber  Int              // số cảnh trong tập (phần sau dấu "-")
  timeOfDay    String?          // "Sáng", "Đêm"...
  interiorExterior String?      // "Nội" | "Ngoại"
  location     String
  subLocation  String?
  charactersPresent String[]    // tên nhân vật xuất hiện trong cảnh
  shots        Shot[]
  order        Int
}

model Shot {
  id          String   @id @default(cuid())
  sceneId     String
  scene       Scene    @relation(fields: [sceneId], references: [id])
  order       Int
  shotSize    ShotSize          // WIDE | MEDIUM | CLOSE_UP | EXTREME_CLOSE_UP | MONTAGE
  description String   @db.Text
  dialogue    DialogueLine[]
  imageUrl    String?           // kết quả sinh ảnh AI cho shot này
  videoUrl    String?           // kết quả sinh video AI cho shot này
  durationSec Float?
}

model DialogueLine {
  id           String @id @default(cuid())
  shotId       String
  shot         Shot   @relation(fields: [shotId], references: [id])
  characterName String
  direction    String?          // ghi chú cảm xúc/hành động trong ngoặc
  text         String @db.Text
  voiceUrl     String?          // audio TTS đã sinh
  order        Int
}
```

### Lớp 4 — Kịch bản sinh video theo đoạn (Segment) và đặc tả pipeline Seedance

> Phần này khảo sát trực tiếp từ màn hình chỉnh sửa từng tập (editor cấp
> đoạn/shot, sâu hơn Lớp 3) — bao gồm cả hộp thoại trợ giúp "Quy tắc truyền
> và sử dụng Seedance" của nền tảng gốc. Đây là đặc tả chính xác nhất để
> dựng đúng cơ chế gọi AI sinh video, không phải suy đoán.

Mỗi `Episode` được chia thành nhiều **Segment** (gọi là "Đoạn phim NN" trên
UI — khác cấp với `Scene`/`Shot` ở Lớp 3: một Segment ≈ một cụm shot ngắn
4–30 giây được gửi làm **một yêu cầu sinh video AI**). Nội dung mỗi Segment
là danh sách dòng (`SegmentLine`), mỗi dòng có một "tag":

| Tag | Cú pháp hiển thị | Ý nghĩa |
|---|---|---|
| `subtitle_config` | `【Phụ đề: căn giữa dưới · <ngôn ngữ> · luân phiên theo câu · đồng bộ lời thoại】` | Khai báo 1 lần đầu đoạn, áp dụng cho cả đoạn |
| `bgm` | `【BGM: <mô tả nhạc>; âm lượng thấp hơn lời thoại】` | Khai báo 1 lần đầu đoạn |
| `visual` (cảnh trống/không lời) | `【Hình ảnh · không lồng tiếng chỉ tiếng môi trường】△ <Cỡ cảnh>: <mô tả>` | Không được gắn thoại — nếu gắn sẽ bị hệ thống tự lồng tiếng + burn phụ đề |
| `dialogue` | `【Đối thoại · chậm rõ · đồng bộ phụ đề】<Tên nhân vật> (<chú thích>): <lời thoại>` | Có thoại, cần giọng nhân vật |

Mỗi dòng còn mang `@duration:N` (giây) — tổng `@duration` trong 1 segment
không vượt quá 30 giây, mỗi dòng khuyến nghị 3–12 giây. Nội dung có thể
chèn `@asset:ID` để tham chiếu nhân vật/cảnh/đạo cụ đã tạo trong thư viện
tài sản; nhân vật được tham chiếu bắt buộc có ảnh tham khảo, nhân vật cần
thoại bắt buộc có giọng (âm thanh tham khảo) đã gắn.

```prisma
model Segment {
  id          String   @id @default(cuid())
  episodeId   String
  episode     Episode  @relation(fields: [episodeId], references: [id])
  order       Int
  title       String                 // "Đoạn phim 01"
  durationSec Int                    // tổng thời lượng, ≤ 30
  status      SegmentStatus @default(PENDING) // PENDING | GENERATING | DONE | FAILED
  lines       SegmentLine[]
  videoUrl    String?
  lastFrameUrl String?                // ghi lại khi return_last_frame=true
  jobs        GenerationJob[]
}

model SegmentLine {
  id          String   @id @default(cuid())
  segmentId   String
  segment     Segment  @relation(fields: [segmentId], references: [id])
  order       Int
  tag         SegmentLineTag         // SUBTITLE_CONFIG | BGM | DIALOGUE | VISUAL
  durationSec Int      @default(0)
  characterName String?
  direction   String?
  shotType    String?               // "Toàn cảnh" | "Trung cảnh" | "Cận cảnh" | "Đặc tả" ...
  text        String   @db.Text
}
```

#### Đặc tả pipeline gọi Seedance (map tham số UI → field API)

Thanh công cụ của editor map trực tiếp vào request gửi cho model video đa
phương thức (Seedance 2.5 / 1.5, có thể thay bằng provider khác miễn giữ
đúng shape request):

- `model` ← dropdown chọn mô hình (Seedance 2.5 / Seedance 1.5).
- `ratio` + `resolution` ← cặp "Tỷ lệ khung hình" (9:16 / 16:9 / 1:1) và
  "Độ sắc nét" (480p / 720p / 1080p); đặt ở cấp **tập phim**, nếu không đặt
  riêng thì kế thừa mặc định của **dự án**.
- `duration` ← tổng `@duration` các dòng trong segment (không có thẻ thì
  dùng field `durationSec` của segment).
- Nội dung gửi lên là **mảng đa phương thức, theo đúng thứ tự**:
  1. `text` — toàn bộ prompt được **lắp ráp tự động** từ các khối ràng buộc
     theo thứ tự cố định: `[Phong cách hình ảnh video]` → `[Âm thanh, phụ
     đề & nhạc nền]` → `[Giọng nói nhân vật: tên → số tham chiếu âm thanh]`
     → `[Ngoại hình nhân vật: tên → số hình tham khảo]` → `[Bối cảnh: tên →
     số hình tham khảo]` → văn bản chính (đã thay `@asset:ID` bằng "Tên
     (tham khảo Hình N)" và `@duration:N` bằng khoảng thời gian tuyệt đối,
     ví dụ `00:00–00:04`).
  2. `reference_image[]` — ảnh bìa/ảnh chính của mỗi nhân vật/cảnh/đạo cụ
     được `@asset` trong segment.
  3. `reference_audio[]` — mẫu giọng của nhân vật/người kể xuất hiện trong
     segment (âm thanh tham chiếu tự động cắt còn **dưới 15 giây** trước
     khi gửi, do giới hạn ~30s/1 clip của API).
- `generate_audio` mặc định bật khi segment có ý định phát sóng (có dòng
  `dialogue` hoặc `subtitle_config`); tắt khi ở "chế độ video thuần"
  (không lồng tiếng, chỉ hiện tiếng môi trường).

#### Chế độ phụ đề (ảnh hưởng cách lắp prompt)

Toggle 2 chiều ở cấp tập phim:
- **Mô hình tự tạo phụ đề** (mặc định): thêm khối nhắc "đồng bộ phụ đề" vào
  prompt — model tự burn phụ đề khi sinh video.
- **Ghép phụ đề hậu kỳ**: xoá khối nhắc phụ đề khỏi prompt gửi đi; bảng phụ
  đề bên phải (sinh từ `SegmentLine` loại `dialogue`) chỉ dùng để xem trước
  / xuất `.srt`, chèn phụ đề ở bước dựng hậu kỳ (không do AI video làm).

#### Hàng đợi sinh video & nối khung hình giữa các đoạn

- Mỗi segment đi qua **hàng đợi video độc lập**, tối đa **10 job chạy song
  song** trên toàn hệ thống (`GenerationJob` cần có `queuePosition` hoặc dựa
  vào giới hạn concurrency ở worker).
- "Tái lập kịch bản bằng AI" xếp hàng **toàn bộ** segment của tập theo thứ
  tự; nút "phát ra" ở từng segment chỉ enqueue **1 job** cho segment đó.
  Trong lúc 1 segment đang generate, các segment khác vẫn chỉnh sửa/xem
  video đã xong bình thường (không khoá toàn UI).
- Mặc định mỗi lần sinh xong trả về `return_last_frame=true`, backend lưu
  `Segment.lastFrameUrl`.
- Toggle "Chuyển đổi giữa các camera" (nối khung hình cuối) ở cấp tập
  phim: khi **bật**, các segment sinh **tuần tự** theo thứ tự, và nếu
  segment kế tiếp có tham chiếu nhân vật/cảnh, `lastFrameUrl` của segment
  trước được đính kèm làm **`reference_image` bổ sung** (không được trộn
  với `first_frame` — 2 cơ chế loại trừ nhau); nếu segment không có tài
  nguyên tham chiếu nào thì dùng `first_frame` thay vì `reference_image`.
  Khi **tắt** (mặc định), các segment sinh **độc lập, đồng thời** — phù hợp
  sản xuất hàng loạt nhanh.
- Endpoint sinh lại toàn bộ kịch bản ("AI phân cảnh lại") phải chặn khi có
  job đang `GENERATING` trong tập, để tránh xung đột state.

Dùng lại đúng model `GenerationJob` đã định nghĩa ở mục "Data model tổng
thể" bên dưới cho việc này (`type: SHOT_VIDEO`, `targetType: "Segment"`,
`targetId: segment.id`) — chỉ cần bổ sung 2 field vào model đó:

```prisma
model GenerationJob {
  // ...các field hiện có (xem mục "Data model tổng thể")...
  provider       String?  // "seedance-2.5" | "seedance-1.5" | ...
  requestPayload Json?    // snapshot request đa phương thức đã gửi (text + reference_image[] + reference_audio[])
}
```

#### Kiểm tra trước khi cho phép bấm "phát ra" (validate ở BE, không chỉ FE)

1. Mỗi dòng `visual` không được gắn `characterName`/thoại (tránh bị hiểu
   nhầm thành `dialogue` rồi bị tự động lồng tiếng + burn phụ đề).
2. Tổng `@duration` trong segment ∈ [4, 30] giây.
3. Mọi nhân vật được `@asset` trong segment đã có ít nhất 1 ảnh tham khảo;
   nhân vật xuất hiện trong dòng `dialogue` đã có giọng (voice) gắn sẵn —
   thiếu thì trả lỗi 422 kèm danh sách asset còn thiếu, không âm thầm bỏ
   qua (nền tảng gốc tự động "cố gắng bù ảnh" khi thiếu, có thể để giai
   đoạn sau).
4. Đã xác nhận `ratio`/`resolution`/`model`/style ở cấp dự án hoặc tập
   trước khi enqueue.

## Data model tổng thể (Prisma) — các phần còn lại

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String?
  createdAt     DateTime @default(now())
  dramaProjects DramaProject[]
  videoProjects VideoProject[]
  assets        Asset[]
  wallet        Wallet?
}

model DramaProject {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  title         String
  coverGradient String              // giữ tương thích FE hiện tại (from-x to-y)
  status        ProjectStatus @default(DRAFT) // DRAFT | IN_PROGRESS | COMPLETED
  summary       ProjectSummary?
  characters    Character[]
  episodes      Episode[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model VideoProject {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  title         String
  status        VideoStatus @default(DRAFT) // DRAFT | GENERATING | COMPLETED | PUBLISHED
  templateId    String
  topic         String   @db.Text
  durationRange String              // "1-3" | "3-5" | "5-8"
  audience      String
  visualStyleId String
  characterStyleId String
  voiceId       String
  ratio         String              // "16:9" | "9:16"
  scenes        VideoScene[]
  jobs          GenerationJob[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model VideoScene {
  id             String @id @default(cuid())
  videoProjectId String
  videoProject   VideoProject @relation(fields: [videoProjectId], references: [id])
  order          Int
  title          String
  description    String @db.Text
  startSec       Float
  endSec         Float
  imageUrl       String?
  videoUrl       String?
}

model Asset {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  projectId  String?             // null nếu là tài sản dùng chung / "Trung tâm cá nhân"
  category   AssetCategory       // CHARACTER | SCENE | PROP | VOICE
  name       String
  imageUrl   String?
  metadata   Json?               // linh hoạt theo category
  createdAt  DateTime @default(now())
}

model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  balance   Int      @default(0)   // đơn vị: đồng, hoặc "token" quy đổi
  heldAmount Int     @default(0)   // đang tạm giữ cho job chưa hoàn tất
  transactions Transaction[]
}

model Transaction {
  id        String   @id @default(cuid())
  walletId  String
  wallet    Wallet   @relation(fields: [walletId], references: [id])
  type      TxType            // TOPUP | USAGE_HOLD | USAGE_SETTLE | REFUND
  amount    Int               // dương = cộng, âm = trừ
  description String
  jobId     String?
  createdAt DateTime @default(now())
}

model GenerationJob {
  id         String   @id @default(cuid())
  userId     String
  type       JobType           // SCRIPT | SUMMARY | CHARACTER_IMAGE | SHOT_IMAGE | SHOT_VIDEO | VOICE | STORYBOARD
  status     JobStatus @default(QUEUED) // QUEUED | RUNNING | SUCCEEDED | FAILED
  targetType String            // "Episode" | "Shot" | "VideoScene" | "Character" ...
  targetId   String
  estimatedCost Int
  actualCost Int?
  resultUrl  String?
  error      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  videoProjectId String?
  videoProject   VideoProject? @relation(fields: [videoProjectId], references: [id])
}

enum ProjectStatus { DRAFT IN_PROGRESS COMPLETED }
enum VideoStatus { DRAFT GENERATING COMPLETED PUBLISHED }
enum EpisodeStatus { DRAFT STORYBOARD_READY RENDERED }
enum AssetCategory { CHARACTER SCENE PROP VOICE }
enum ShotSize { WIDE MEDIUM CLOSE_UP EXTREME_CLOSE_UP MONTAGE }
enum TxType { TOPUP USAGE_HOLD USAGE_SETTLE REFUND }
enum JobType { SCRIPT SUMMARY CHARACTER_IMAGE SHOT_IMAGE SHOT_VIDEO VOICE STORYBOARD }
enum JobStatus { QUEUED RUNNING SUCCEEDED FAILED }
enum SegmentStatus { PENDING GENERATING DONE FAILED }
enum SegmentLineTag { SUBTITLE_CONFIG BGM DIALOGUE VISUAL }
```

## API endpoints cần dựng (map đúng theo hành vi FE hiện có)

### Auth
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- Dùng NextAuth.js (Credentials provider tối thiểu; để ngỏ OAuth Google sau)
  hoặc JWT tự viết — agent chọn 1, ưu tiên NextAuth cho tốc độ.
- Middleware bảo vệ toàn bộ route dưới `/api/**` trừ `/api/auth/*` và
  `/api/tools/*` (demo công khai nếu muốn cho dùng thử không cần đăng nhập).

### Kịch bản phim (`/drama`)
- `GET /api/drama` — danh sách dự án của user (kèm filter status, search — khớp tabs ở `app/drama/page.tsx`)
- `POST /api/drama` — tạo dự án mới (title, style ban đầu)
- `GET /api/drama/:id` — chi tiết dự án + summary + characters + episodes
- `PATCH /api/drama/:id/summary` — cập nhật/`Tái tạo` tóm tắt kịch bản (gọi AI)
- `POST /api/drama/:id/characters` — thêm nhân vật (form "Nhân vật mới")
- `PATCH /api/characters/:id`, `DELETE /api/characters/:id`
- `POST /api/characters/:id/generate-image` — sinh ảnh tham chiếu nhân vật
- `GET /api/drama/:id/episodes` — danh sách tập
- `PATCH /api/episodes/:id` — sửa `scriptRaw` tay (nút "Chỉnh sửa văn bản chính")
- `POST /api/episodes/:id/regenerate-script` — nút "Tái tạo" (gọi LLM sinh lại theo khuôn mẫu ở trên)
- `POST /api/episodes/:id/storyboard` — nút "AI phân cảnh": parse `scriptRaw` → tạo `Scene`/`Shot`/`DialogueLine`, trả về job id để FE poll
- `POST /api/episodes/:id/render` — nút render video tập phim đầy đủ

Màn hình editor cấp đoạn (`/drama/:id/episodes/:episodeId`, xem Lớp 4):
- `GET /api/episodes/:id/segments` — danh sách segment + lines, dùng đổ dải phim (filmstrip) và panel giữa
- `PATCH /api/segments/:id` — sửa tay nội dung/`durationSec`/thêm-xoá `SegmentLine` của 1 đoạn
- `POST /api/segments/:id/generate` — nút "phát ra": validate (mục "Kiểm tra trước khi phát ra"), estimate cost, hold ví, enqueue `GenerationJob(type: SHOT_VIDEO)`, trả `jobId` để FE poll qua `GET /api/jobs/:id`
- `POST /api/episodes/:id/regenerate-all` — nút "Tái lập kịch bản bằng AI": enqueue tuần tự 1 job cho mỗi segment; chặn nếu còn segment đang `GENERATING`
- `PATCH /api/episodes/:id/settings` — lưu `ratio`/`resolution`/`videoModel`/`subtitleMode`/`stitchEnabled` cấp tập (kế thừa từ dự án nếu chưa set riêng)
- `GET /api/episodes/:id/subtitles.srt` — xuất file phụ đề (nút "Xuất SRT", ghép từ các `SegmentLine` loại `dialogue`)

### Video ngắn AI (`/video`)
- `GET /api/video-projects`, `POST /api/video-projects`
- `GET /api/video-projects/:id`, `PATCH /api/video-projects/:id` — lưu từng bước wizard (template → input → style)
- `POST /api/video-projects/:id/storyboard` — bước 4 "Bắt đầu tạo": sinh danh sách `VideoScene` (khớp `scenesSample` hiện có trong mock)
- `POST /api/video-projects/:id/render` — xuất video hoàn chỉnh
- `GET /api/jobs/:id` — FE poll trạng thái job (thay cho `setTimeout` giả lập ở `GenerateStep`)

### Tài sản (`/assets`)
- `GET /api/assets?category=&projectId=&scope=` — khớp bộ lọc Tất cả/Vai trò/Bối cảnh/Đạo cụ/Âm sắc và 3 nút phạm vi (Dự án phim/Lịch sử khoa học/Trung tâm cá nhân)
- `POST /api/assets`, `PATCH /api/assets/:id`, `DELETE /api/assets/:id`

### Công cụ đơn lẻ (`/tools`)
- `POST /api/tools/text-to-image`
- `POST /api/tools/image-to-image`
- `POST /api/tools/image-to-product`
- `POST /api/tools/text-to-video`
- `POST /api/tools/video-to-video`
- Mỗi endpoint: nhận input, tạo `GenerationJob`, gọi provider AI tương ứng (có thể chạy nền), trả `jobId`.

### Ví & giá (`/pricing`)
- `GET /api/wallet` — số dư, đang tạm giữ
- `POST /api/wallet/topup` — tạo phiên thanh toán (Stripe/VNPay/Momo — agent chọn theo thị trường VN, gợi ý VNPay hoặc PayOS)
- `POST /api/webhooks/payment` — callback xác nhận thanh toán, cộng `balance`
- `GET /api/wallet/transactions` — lịch sử nạp/trừ

## Cơ chế tính phí (khớp đúng nội dung trang `pricing` hiện tại)

1. Khi tạo `GenerationJob`, tính `estimatedCost` theo loại job (bảng giá cấu
   hình trong `.env` hoặc bảng `PricingRule`), trừ tạm vào `heldAmount` của
   ví (ghi `Transaction` loại `USAGE_HOLD`).
2. Khi job `SUCCEEDED`/`FAILED`, tính `actualCost` thật, hoàn phần chênh lệch
   (`USAGE_SETTLE`), cập nhật `balance` và `heldAmount`.
3. Từ chối tạo job mới nếu `balance - heldAmount < estimatedCost` — trả lỗi
   `402` để FE hiện đúng banner "Số dư không đủ" đã thấy trên bản gốc.

## AI providers gợi ý (agent có thể thay bằng lựa chọn khác, miễn giữ interface)

- Sinh kịch bản / tóm tắt / tiểu sử nhân vật: LLM (Anthropic Claude API hoặc
  OpenAI) — dùng đúng khuôn mẫu markdown ở trên làm few-shot trong system prompt.
- Sinh ảnh (nhân vật, cảnh, shot): Replicate hoặc fal.ai (model kiểu
  SDXL/Flux) — cần giữ ảnh tham chiếu nhân vật để truyền vào các lần sinh
  sau (image-to-image / IP-Adapter) nhằm nhất quán nhân vật xuyên suốt series.
- Sinh video từ ảnh: Replicate/fal.ai (Kling/Runway/Luma...).
- Text-to-speech: ElevenLabs hoặc tương đương có hỗ trợ tiếng Việt.
- Vì các job này chạy lâu (giây → phút), dùng hàng đợi nền: **BullMQ + Redis**
  (hoặc Vercel Queue nếu deploy Vercel không hỗ trợ worker dài hơi — trong
  trường hợp đó tách 1 service worker Node riêng chạy trên Railway/Fly.io,
  Next.js chỉ enqueue + expose `/api/jobs/:id` để poll).

## Việc cần làm, theo thứ tự

1. `prisma init`, viết schema theo trên, `prisma migrate dev`.
2. Viết seed script (`prisma/seed.ts`) chuyển đúng dữ liệu hiện có trong
   `lib/mockData.ts` thành dữ liệu thật trong DB (giữ tên, nội dung mẫu).
3. Dựng auth (NextAuth Credentials + session), middleware bảo vệ API.
4. Dựng CRUD cơ bản (drama projects, characters, episodes, assets, video
   projects) — chưa cần AI thật, có thể trả dữ liệu tĩnh trong bước này để
   FE chạy được ngay.
5. Nối FE: thay `import { dramaProjects, ... } from "@/lib/mockData"` bằng
   gọi API tương ứng ở từng page/component (dùng `fetch` trong Server
   Component cho GET ban đầu, `fetch` phía client cho các hành động
   tương tác — giữ nguyên state UI hiện có, chỉ đổi nguồn).
6. Dựng `GenerationJob` + hàng đợi nền, nối AI provider thật cho: sinh
   kịch bản, sinh tóm tắt, sinh ảnh nhân vật/shot, sinh video, TTS.
7. Dựng Wallet + Transaction + tích hợp cổng thanh toán VN, nối webhook.
8. Viết test cho: cơ chế trừ/hoàn tiền theo job, parser `scriptRaw` → `Scene`/`Shot`.
9. Cập nhật `.env.example` với toàn bộ biến môi trường (DB URL, API key các
   provider AI, secret NextAuth, cấu hình cổng thanh toán, Redis URL).

## Ràng buộc

- Không đổi cấu trúc URL/route FE hiện có.
- Không đổi tên biến/props trong các component FE trừ khi bắt buộc để nối
  API — nếu đổi, cập nhật cả nơi gọi.
- Giữ toàn bộ text tiếng Việt hiện có trong UI làm chuẩn (không dịch lại).
- Mọi endpoint trả lỗi dùng cùng một shape: `{ error: { code, message } }`.
