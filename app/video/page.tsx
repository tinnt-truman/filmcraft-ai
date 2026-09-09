"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { videoProjects as fallback } from "@/lib/mockData";
import { api } from "@/lib/api-client";
type VP = { id: string; title: string; status: string; template: string; ratio: string; updatedAt: string };

const tabs = [
  { id: "all", label: "Tất cả" },
  { id: "draft", label: "Bản nháp" },
  { id: "generating", label: "Đang tạo" },
  { id: "completed", label: "Hoàn thành" },
  { id: "published", label: "Đã phát hành" },
] as const;

const statusLabel: Record<string, string> = {
  draft: "Bản nháp",
  generating: "Đang tạo",
  completed: "Hoàn thành",
  published: "Đã phát hành",
};

export default function VideoListPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all");
  const [items, setItems] = useState<VP[]>(fallback as unknown as VP[]);
  useEffect(() => { api<VP[]>("/api/video-projects").then(setItems).catch(() => {}); }, []);
  const projects = items.filter((p) => tab === "all" || p.status === tab);

  const stats = [
    { label: "Tổng số tác phẩm", value: items.length },
    { label: "Đang tạo", value: items.filter((p) => p.status === "generating").length, sub: "Hiện không có nhiệm vụ nào." },
    { label: "Hoàn thành", value: items.filter((p) => p.status === "completed").length },
    { label: "Thời lượng tháng này", value: "—", sub: "Số liệu thống kê sẽ sớm được công bố." },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Khoa học Phổ biến</h1>
          <p className="text-sm text-gray-500">
            Quản lý dự án video ngắn AI của bạn và tiếp tục chỉnh sửa hoặc tải xuống sản phẩm hoàn chỉnh.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/video/336"
            className="brand-btn rounded-full px-4 py-2 text-sm font-semibold"
          >
            + Phổ biến khoa học mới
          </Link>
          <Link
            href="/drama"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Hãy vào xem kịch bản phim
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-black/10 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            {s.sub && <p className="mt-1 text-[11px] text-emerald-600">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "brand-btn rounded-full px-4 py-1.5 text-sm font-semibold"
                  : "rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-black/5"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Tìm kiếm tên dự án"
          className="w-56 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm outline-none focus:border-black/30"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {projects.map((p, i) => (
          <div
            key={p.id}
            className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
              i !== 0 ? "border-t border-black/10" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                Không có vỏ bọc
              </div>
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 font-medium">
                    {statusLabel[p.status]}
                  </span>
                  <span>{p.template}</span>
                  <span>· {p.updatedAt}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">{p.ratio}</span>
              <Link href={`/video/${p.id}`} className="font-semibold hover:underline">
                Tiếp tục chỉnh sửa
              </Link>
              <button className="text-gray-500 hover:text-black">Xem trước</button>
              <button className="text-gray-500 hover:text-black">tải xuống</button>
              <button className="text-gray-500 hover:text-black">bản sao</button>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-400">Chưa có dự án nào.</p>
        )}
      </div>
    </div>
  );
}
