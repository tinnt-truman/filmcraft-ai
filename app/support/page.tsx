"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const quickLinks = [
  { href: "/", title: "Bắt đầu nhanh", desc: "Chọn lối vào ở Bàn làm việc" },
  { href: "/drama", title: "Kịch bản phim", desc: "Kịch bản · tập phim · thành phẩm" },
  { href: "/video", title: "Video ngắn AI", desc: "Chuỗi phân cảnh & dựng video" },
  { href: "/tools", title: "Dụng cụ", desc: "Văn bản → ảnh / ảnh → ảnh / video" },
  { href: "/assets", title: "Tài sản", desc: "Thư viện nhân vật, bối cảnh, đạo cụ" },
  { href: "/profile", title: "Trung tâm cá nhân", desc: "Dự án, ví, lịch sử tạo" },
];

const steps = [
  {
    n: "01",
    title: "Chọn lối vào phù hợp",
    body: "Vào Bàn làm việc rồi chọn “Kịch bản phim” cho nội dung nhiều tập, hoặc “Video ngắn AI” cho video ngắn theo wizard 4 bước. Muốn thử nhanh 1 tính năng đơn lẻ (sinh ảnh, sinh video…) thì vào thẳng Dụng cụ.",
  },
  {
    n: "02",
    title: "Thiết lập & tạo",
    body: "Kịch bản phim: ý tưởng → tóm tắt dự án → tài sản (nhân vật/bối cảnh) → dựng từng tập. Video ngắn AI: nhập kịch bản đoạn → ghép hình ảnh/âm thanh tham chiếu → phát sinh video theo phân đoạn.",
  },
  {
    n: "03",
    title: "Xem lại & chỉnh sửa",
    body: "Không hài lòng một cảnh thì chỉ cần tạo lại đúng cảnh đó — ảnh, lồng tiếng hoặc video — không cần làm lại từ đầu cả dự án.",
  },
  {
    n: "04",
    title: "Lưu & tải về",
    body: "Kết quả được lưu theo dự án. Xem lại dự án kịch bản/video trong trang tương ứng, hoặc xem toàn bộ lịch sử tạo (kể cả từ Dụng cụ) trong Trung tâm cá nhân.",
  },
];

const faqs = [
  {
    q: "Lần đầu dùng thì bắt đầu từ đâu?",
    a: "Mở Bàn làm việc và chọn “Kịch bản phim” (phù hợp nội dung nhiều tập, cần nhân vật nhất quán) hoặc “Video ngắn AI” (phù hợp video ngắn dựng nhanh theo phân cảnh). Nếu chỉ cần 1 ảnh hoặc 1 đoạn video đơn lẻ, vào thẳng Dụng cụ, không cần tạo dự án.",
  },
  {
    q: "Ví hoạt động thế nào, token bị trừ khi nào?",
    a: "Mỗi thao tác tốn phí (sinh ảnh, lồng tiếng, sinh video, gọi mô hình ngôn ngữ…) sẽ tạm giữ một khoản ước tính khi bắt đầu, rồi quyết toán theo mức dùng thực tế sau khi hoàn tất. Số dư nạp vào không giới hạn thời gian sử dụng. Xem chi tiết từng lượt trừ tại Trung tâm cá nhân → Ví & giao dịch.",
  },
  {
    q: "Đang tạo video/ảnh mà rời trang thì sao?",
    a: "Job vẫn chạy nền phía máy chủ. Quay lại trang dự án hoặc Trung tâm cá nhân để xem trạng thái và kết quả, không cần giữ trình duyệt mở liên tục.",
  },
  {
    q: "Tạo ra không đúng ý muốn thì phải làm lại từ đầu?",
    a: "Không. Ở cả kịch bản phim lẫn video ngắn, bạn có thể tạo lại riêng một cảnh, một câu thoại lồng tiếng hoặc một đoạn video mà không ảnh hưởng các phần đã ổn.",
  },
  {
    q: "Kết quả từ Dụng cụ (sinh ảnh/video đơn lẻ) lưu ở đâu?",
    a: "Nằm trong Trung tâm cá nhân, tách riêng với dự án kịch bản/video, để bạn tra cứu và tải lại bất cứ lúc nào.",
  },
  {
    q: "Nạp tiền / ví bị trừ sai thì liên hệ thế nào?",
    a: "Kiểm tra lịch sử giao dịch tại Trung tâm cá nhân → Ví & giao dịch trước — mỗi dòng đều ghi rõ loại giao dịch và thời điểm. Nếu vẫn thấy bất thường, dùng khung liên hệ ở cuối trang này.",
  },
];

export default function SupportPage() {
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold">Trung tâm hỗ trợ</h1>
        <p className="mt-2 text-sm text-gray-500">
          Tìm câu trả lời nhanh, hoặc chọn nhóm bên dưới để đi thẳng tới tính năng liên quan.
        </p>
        <div className="mx-auto mt-5 max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm câu hỏi thường gặp…"
            className="w-full rounded-full border border-black/10 px-4 py-2.5 text-sm focus:border-black/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-black/10 bg-white p-4 hover:border-black/30"
          >
            <p className="text-sm font-bold">{l.title}</p>
            <p className="mt-1 text-xs text-gray-500">{l.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-bold">Bốn bước để bắt đầu</h2>
      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {steps.map((s) => (
          <div key={s.n} className="rounded-xl border border-black/10 bg-white p-5">
            <span className="text-xs font-bold text-gray-400">{s.n}</span>
            <p className="mt-1 text-sm font-bold">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{s.body}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-bold">Câu hỏi thường gặp</h2>
      <div className="mb-10 space-y-2">
        {filteredFaqs.length === 0 && (
          <p className="text-sm text-gray-400">Không tìm thấy câu hỏi phù hợp — thử từ khoá khác.</p>
        )}
        {filteredFaqs.map((f) => {
          const idx = faqs.indexOf(f);
          const open = openIndex === idx;
          return (
            <div key={f.q} className="rounded-xl border border-black/10 bg-white">
              <button
                onClick={() => setOpenIndex(open ? null : idx)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
              >
                {f.q}
                <span className="ml-3 text-gray-400">{open ? "−" : "+"}</span>
              </button>
              {open && <p className="border-t border-black/5 px-4 py-3 text-xs leading-relaxed text-gray-600">{f.a}</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-black/10 bg-gray-50 p-6 text-center text-sm text-gray-600">
        Chưa tìm thấy điều bạn cần? Đây là bản demo chạy local — nếu là dự án của bạn, hãy tự bổ sung kênh liên hệ
        (email, form…) tại đây. Xem thêm số dư & lịch sử sử dụng tại{" "}
        <Link href="/profile" className="font-medium text-black underline underline-offset-2">
          Trung tâm cá nhân
        </Link>{" "}
        hoặc nạp thêm tại{" "}
        <Link href="/pricing" className="font-medium text-black underline underline-offset-2">
          Giá cả
        </Link>
        .
      </div>
    </div>
  );
}
