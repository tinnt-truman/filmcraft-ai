"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
type AssetCategory = "Vai trò" | "Bối cảnh" | "Đạo cụ" | "Âm sắc";
type A = { id: string; name: string; imageUrl?: string | null; metadata?: { role?: string } | null };
const projectScopes = ["Dự án phim", "Lịch sử khoa học", "Trung tâm cá nhân"];

export default function AssetsPage() {
  const [tab, setTab] = useState<"Tất cả" | AssetCategory>("Tất cả");
  const [scope, setScope] = useState(projectScopes[0]);
  const [items, setItems] = useState<A[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>(["Vai trò", "Bối cảnh", "Đạo cụ", "Âm sắc"]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<A[]>("/api/assets").then((l) => { if (l.length) setItems(l); }).catch(() => {}).finally(() => setLoading(false)); api<AssetCategory[]>("/api/config/asset-categories").then(setCategories).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quản lý tài sản</h1>
          <p className="text-sm text-gray-500">Tìm kiếm theo nhân vật, cảnh, đạo cụ và giọng nói.</p>
        </div>
        <div className="flex gap-2">
          {projectScopes.map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={
                scope === s
                  ? "rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5"
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["Tất cả", ...categories] as const).map((c) => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={
                tab === c
                  ? "brand-btn rounded-full px-4 py-1.5 text-sm font-semibold"
                  : "rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-black/5"
              }
            >
              {c}
            </button>
          ))}
        </div>
        <input
          placeholder="Tìm kiếm theo tên hoặc mặt hàng"
          className="w-64 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm outline-none focus:border-black/30"
        />
      </div>

      {tab === "Tất cả" || tab === "Vai trò" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-3 h-28 w-full rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-gray-500">{(c.metadata as { role?: string })?.role ?? ""} · {scope}</p>
              <button className="mt-3 w-full rounded-full border border-black/10 py-1.5 text-xs font-medium hover:bg-black/5">
                Mở dự án
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-gray-400">
          Chưa có tài sản nào thuộc danh mục &ldquo;{tab}&rdquo;.
        </p>
      )}

      <p className="mt-6 text-right text-xs text-gray-400">Trang 1/1 · {tab === "Vai trò" || tab === "Tất cả" ? items.length : 0} mục</p>
    </div>
  );
}
