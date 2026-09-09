"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dramaProjects as fallback } from "@/lib/mockData";
import { api } from "@/lib/api-client";
type P = { id: string; title: string; cover: string; status: string; synopsis: string; style: string; episodeCount: number; updatedAt: string };

const tabs = [
  { id: "all", label: "Tất cả" },
  { id: "in_progress", label: "Đang tiến hành" },
  { id: "completed", label: "Đã hoàn thành" },
  { id: "draft", label: "Bản nháp" },
] as const;

const statusLabel: Record<string, string> = {
  in_progress: "Đang tiến hành",
  completed: "Đã hoàn thành",
  draft: "Bản nháp",
};

export default function DramaListPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<P[]>(fallback as P[]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<P[]>("/api/drama").then(setItems).catch(() => {}).finally(() => setLoading(false)); }, []);
  const createProject = async () => {
    const title = prompt("Tên dự án mới?");
    if (!title) return;
    const p = await api<{ id: string }>("/api/drama", { method: "POST", body: JSON.stringify({ title }) }).catch(() => null);
    if (p) setItems(await api<P[]>("/api/drama").catch(() => items));
  };

  const projects = items.filter((p) => {
    const matchesTab = tab === "all" || p.status === tab;
    const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dự án phim của tôi</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5">
            Thư viện tài sản
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5">
            Khung vẽ tự do
          </button>
          <button onClick={createProject} className="brand-btn rounded-full px-4 py-2 text-sm font-semibold">
            + Dự án mới
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm tên dự án"
          className="w-56 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm outline-none focus:border-black/30"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/drama/${p.id}`}
            className="group overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:shadow-md"
          >
            <div className={`h-36 w-full bg-gradient-to-br ${p.cover}`} />
            <div className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {statusLabel[p.status]}
                </span>
                <span className="text-[11px] text-gray-400">{p.updatedAt}</span>
              </div>
              <h3 className="mt-1 line-clamp-1 text-sm font-bold group-hover:underline">
                {p.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">{p.synopsis}</p>
              <p className="mt-3 text-[11px] font-medium text-gray-500">
                {p.episodeCount} tập · {p.style}
              </p>
            </div>
          </Link>
        ))}

        <Link
          href="/drama/1"
          className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-white/50 text-gray-500 hover:border-black/30 hover:text-black"
        >
          <span className="text-3xl leading-none">+</span>
          <span className="text-sm font-medium">Tạo dự án phim mới</span>
        </Link>
      </div>
    </div>
  );
}
