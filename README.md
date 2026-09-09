# FilmCraft AI (demo)

Bản clone giao diện / workflow (UI-only, không có backend hay tích hợp AI thật) lấy cảm hứng từ trải nghiệm dựng phim ngắn bằng AI mà bạn đã xem qua (kịch bản → thư viện tài sản → dựng video theo tập, và một wizard 4 bước cho video ngắn AI).

**Đây là bản mẫu tĩnh (mock data + state cục bộ trong trình duyệt).** Không có model AI nào được gọi, không có tài khoản/thanh toán thật, không lưu dữ liệu vào database — mọi tương tác (chọn phong cách, "tạo bảng phân cảnh", nạp tiền...) chỉ mô phỏng trên client để bạn trải nghiệm luồng thao tác.

Tên "FilmCraft AI" và toàn bộ nội dung mẫu (tên dự án, câu chuyện...) là nội dung gốc, không dùng lại thương hiệu hay câu chuyện của nền tảng gốc.

## Chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Cấu trúc

- `app/page.tsx` — Trang chủ / bàn làm việc
- `app/drama/` — Danh sách & chi tiết dự án "Kịch bản phim" (workflow 3 bước: Tóm tắt cốt truyện → Thư viện tài sản → Video tập phim)
- `app/video/` — Danh sách & wizard "Video ngắn AI" (4 bước: Chọn mẫu → Nội dung đầu vào → Cấu hình kiểu → Bắt đầu tạo, có mô phỏng tiến trình tạo bảng phân cảnh)
- `app/tools/` — Trang công cụ AI đơn lẻ (văn sinh ảnh, ảnh sinh ảnh...)
- `app/assets/` — Quản lý tài sản (nhân vật, bối cảnh, đạo cụ, âm sắc)
- `app/pricing/` — Trang nạp tiền / bảng giá theo token
- `lib/mockData.ts` — Toàn bộ dữ liệu mẫu, sửa ở đây để đổi nội dung
- `components/NavBar.tsx` — Thanh điều hướng dùng chung

## Bước tiếp theo nếu muốn biến thành sản phẩm thật

1. Thêm backend (API routes hoặc service riêng) + database cho dự án/tài sản.
2. Tích hợp API sinh ảnh/video/giọng nói thật (ví dụ Stability, Runway, ElevenLabs...) thay cho state giả lập ở `GenerateStep`.
3. Thêm xác thực người dùng và hệ thống ví/thanh toán thật cho trang `pricing`.
4. Thay `from-*/to-*` placeholder gradient bằng ảnh/video thật khi có nguồn dữ liệu.
