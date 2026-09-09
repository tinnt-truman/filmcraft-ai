"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type VideoProject = {
  id: string;
  title: string;
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "PUBLISHED";
  templateId: string;
  ratio: string;
  updatedAt: string;
};

const tabs = [
  { id: "all", label: "Tất cả" },
  { id: "draft", label: "Bản nháp" },
  { id: "generating", label: "Đang tạo" },
  { id: "completed", label: "Hoàn thành" },
  { id: "published", label: "Đã phát hành" },
] as const;

const statusLabel: Record<string, string> = {
  DRAFT: "Bản nháp",
  GENERATING: "Đang tạo",
  COMPLETED: "Hoàn thành",
  PUBLISHED: "Đã phát hành",
};

export default function VideoListPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all");
  const [projects, setProjects] = useState<VideoProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ projects: VideoProject[] }>("/api/video-projects")
      .then((d) => !cancelled && setProjects(d.projects))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được danh sách."));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (projects ?? []).filter((p) => tab === "all" || p.status === tab.toUpperCase());

  const stats = [
    { label: "Tổng số tác phẩm", value: projects?.length ?? 0 },
    { label: "Đang tạo", value: (projects ?? []).filter((p) => p.status === "GENERATING").length },
    { label: "Hoàn thành", value: (projects ?? []).filter((p) => p.status === "COMPLETED").length },
    { label: "Thời lượng tháng này", value: "—" },
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
          <Link href="/video/336" className="brand-btn rounded-full px-4 py-2 text-sm font-semibold">
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
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {filtered.map((p, i) => (
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
                  <span className="rounded-full bg-black/5 px-2 py-0.5 font-medium">{statusLabel[p.status]}</span>
                  <span>· {new Date(p.updatedAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">{p.ratio}</span>
              <Link href={`/video/${p.id}`} className="font-semibold hover:underline">
                Tiếp tục chỉnh sửa
              </Link>
            </div>
          </div>
        ))}
        {projects && filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-400">Chưa có dự án nào.</p>
        )}
        {!projects && !error && <p className="p-8 text-center text-sm text-gray-400">Đang tải…</p>}
      </div>
    </div>
  );
}
