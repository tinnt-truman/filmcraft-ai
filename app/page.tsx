"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aiTools as fallbackTools } from "@/lib/mockData";
import { api } from "@/lib/api-client";

const capabilities = [
  {
    title: "19 phong cách phim khác nhau",
    desc: "Từ sử thi thần thoại đến chủ nghĩa hiện thực đô thị và phong cách cyberpunk — chọn tông màu xuyên suốt cả series.",
  },
  {
    title: "Tài sản có thể tái sử dụng",
    desc: "Nhân vật, bối cảnh, đạo cụ và giọng nói được tạo một lần và dùng lại xuyên suốt series, tránh phải vẽ lại từng cảnh.",
  },
  {
    title: "Bảng phân cảnh có thể chỉnh sửa",
    desc: "Mỗi cảnh tham chiếu tới tài sản, thời lượng và chuyển động máy quay — hình dung rõ trước khi tạo video thật.",
  },
  {
    title: "Hai đường dẫn đầu ra",
    desc: "Kịch bản phim kể chuyện theo từng tập, video ngắn AI dàn dựng theo kịch bản có sẵn — cùng một bộ tài sản.",
  },
];

const audiences = [
  {
    title: "Nhà sản xuất phim ngắn",
    desc: "Chia nhỏ câu chuyện thành các tập phim, phát hành trailer trước rồi mới sản xuất bản hoàn chỉnh.",
  },
  {
    title: "Người làm nội dung tri thức",
    desc: "Chuyển bài viết thành video giải thích dạng dọc, giữ phong cách nhất quán và nhịp độ dễ điều chỉnh.",
  },
  {
    title: "Sản xuất theo nhóm",
    desc: "Dự án, tài sản và lịch sử được lưu ở một nơi, giảm việc phải chuyển đồ qua lại giữa các công cụ.",
  },
];

export default function HomePage() {
  const [tools, setTools] = useState<typeof fallbackTools>(fallbackTools);
  useEffect(() => { api<typeof fallbackTools>("/api/config/tools").then(setTools).catch(() => {}); }, []);
  return (
    <div>
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10">
        <p className="text-xs font-bold tracking-widest text-gray-500">
          FILMCRAFT AI · BẢN DEMO GIAO DIỆN
        </p>
        <div className="mt-4 grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Hãy chuyển câu chuyện thành{" "}
              <span className="bg-brand px-1">một bộ phim có thể trình chiếu.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-gray-600">
              Các bộ phim ngắn được hỗ trợ bởi AI, đi từ kịch bản đến sản xuất
              từng tập, trong khi video ngắn AI đi từ kịch bản phân cảnh đến
              tổng hợp giọng nói. Một công cụ, hai phương pháp sản xuất.
            </p>
            <div className="mt-7 flex gap-3">
              <Link
                href="/drama"
                className="brand-btn rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Bắt đầu tạo →
              </Link>
              <Link
                href="/video"
                className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold hover:bg-black/5"
              >
                Trình duyệt
              </Link>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <div className="h-64 w-44 rounded-2xl bg-gradient-to-b from-slate-600 to-slate-900 shadow-lg" />
            <div className="mt-8 h-64 w-44 rounded-2xl bg-gradient-to-b from-indigo-500 to-fuchsia-900 shadow-lg" />
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <Link
            href="/drama"
            className="rounded-2xl border border-black/10 bg-brand/20 p-6 transition hover:bg-brand/30"
          >
            <p className="text-xs font-semibold text-gray-500">Dành cho nhà làm phim ngắn</p>
            <h3 className="mt-1 text-lg font-bold">Kịch bản phim AI</h3>
            <p className="mt-2 text-sm text-gray-600">
              Kịch bản được tạo từ một câu duy nhất, nhân vật và bối cảnh được
              phát triển, sau đó chia thành các tập phim và cảnh quay.
            </p>
          </Link>
          <Link
            href="/video"
            className="rounded-2xl border border-black/10 bg-white p-6 transition hover:bg-black/5"
          >
            <p className="text-xs font-semibold text-gray-500">Dành cho người viết tri thức</p>
            <h3 className="mt-1 text-lg font-bold">Video ngắn AI</h3>
            <p className="mt-2 text-sm text-gray-600">
              Sau khi chọn phong cách hình ảnh và viết kịch bản tường thuật,
              video được sản xuất theo dây chuyền lắp ráp tự động.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-xs font-bold tracking-widest text-gray-500">KHẢ NĂNG</p>
        <h2 className="mt-1 text-2xl font-bold">
          Những bộ phận duy nhất của bàn làm việc là có thể sử dụng được.
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {capabilities.map((c) => (
            <div key={c.title} className="rounded-xl border border-black/10 bg-white p-5">
              <h3 className="text-sm font-bold">{c.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-500">CÔNG CỤ</p>
            <h2 className="mt-1 text-2xl font-bold">Công cụ tạo điểm đơn</h2>
          </div>
          <Link href="/tools" className="text-sm font-semibold hover:underline">
            Tất cả công cụ →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t: { id: string; name: string; desc: string }) => (
            <div key={t.id} className="rounded-xl border border-black/10 bg-white p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">
                ✦
              </div>
              <h3 className="text-sm font-bold">{t.name}</h3>
              <p className="mt-1 text-xs text-gray-600">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-bold tracking-widest text-gray-500">VÌ AI</p>
        <h2 className="mt-1 text-2xl font-bold">Sản phẩm này phù hợp với đối tượng nào?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-xl border border-black/10 bg-white p-5">
              <h3 className="text-sm font-bold">{a.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand/30 p-8 md:flex-row md:items-center">
          <div>
            <h3 className="text-xl font-bold">Hãy bắt đầu với một ý tưởng</h3>
            <p className="mt-1 text-sm text-gray-700">
              Chọn kịch bản phim hoặc video ngắn AI để vào bàn làm việc tương ứng.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/drama" className="brand-btn rounded-full px-5 py-2.5 text-sm font-semibold">
              Bắt đầu tạo →
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-black/5"
            >
              Xem giá
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-black">FILMCRAFT AI</p>
            <p className="mt-1">
              Bản demo giao diện, mô phỏng workflow — không kết nối mô hình AI
              thật, không thu thập dữ liệu.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/drama">Kịch bản phim</Link>
            <Link href="/video">Video ngắn AI</Link>
            <Link href="/tools">Dụng cụ</Link>
            <Link href="/pricing">Giá cả</Link>
          </div>
          <p>© 2026 FilmCraft AI — demo.</p>
        </div>
      </footer>
    </div>
  );
}
