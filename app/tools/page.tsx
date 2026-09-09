"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aiTools as fallbackTools } from "@/lib/mockData";
import { api } from "@/lib/api-client";

export default function ToolsPage() {
  const [tools, setTools] = useState<typeof fallbackTools>(fallbackTools);
  useEffect(() => { api<typeof fallbackTools>("/api/config/tools").then(setTools).catch(() => {}); }, []);
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold">Công cụ soạn thảo AI</h1>
      <p className="mb-6 text-sm text-gray-500">
        Truy cập vào giao diện công cụ để tạo hình ảnh và video ngắn.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t: { id: string; name: string; desc: string }) => (
          <Link
            key={t.id}
            href={`/tools/${t.id}`}
            className="flex flex-col items-start rounded-xl border border-black/10 bg-white p-5 text-left transition hover:shadow-md"
          >
            <div className="mb-3 flex w-full items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">✦</span>
              <span className="text-gray-300">→</span>
            </div>
            <p className="text-sm font-bold">{t.name}</p>
            <p className="mt-1 text-xs text-gray-500">{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/drama"
          className="flex items-center justify-between rounded-xl bg-brand/30 p-5 hover:bg-brand/40"
        >
          <div>
            <p className="text-sm font-bold">Hãy truy cập vào phần tạo kịch bản phim.</p>
            <p className="text-xs text-gray-600">Kịch bản · Tập phim · Phim hoàn chỉnh</p>
          </div>
          <span>→</span>
        </Link>
        <Link
          href="/video"
          className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-5 hover:bg-black/5"
        >
          <div>
            <p className="text-sm font-bold">Hãy phổ biến lịch sử</p>
            <p className="text-xs text-gray-600">Sản lượng dây chuyền sản xuất bảng phân cảnh</p>
          </div>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
