"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

const assetCategories = ["Vai trò", "Bối cảnh", "Đạo cụ", "Âm sắc"] as const;
const categoryToApi: Record<(typeof assetCategories)[number], string> = {
  "Vai trò": "CHARACTER",
  "Bối cảnh": "SCENE",
  "Đạo cụ": "PROP",
  "Âm sắc": "VOICE",
};
const projectScopes = ["Dự án phim", "Lịch sử khoa học", "Trung tâm cá nhân"];

type Asset = {
  id: string;
  name: string;
  category: "CHARACTER" | "SCENE" | "PROP" | "VOICE";
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
};

export default function AssetsPage() {
  const [tab, setTab] = useState<"Tất cả" | (typeof assetCategories)[number]>("Tất cả");
  const [scope, setScope] = useState(projectScopes[0]);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (tab !== "Tất cả") qs.set("category", categoryToApi[tab]);
    if (scope === "Trung tâm cá nhân") qs.set("scope", "personal");

    apiFetch<{ assets: Asset[] }>(`/api/assets?${qs.toString()}`)
      .then((d) => !cancelled && setAssets(d.assets))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được tài sản."));
    return () => {
      cancelled = true;
    };
  }, [tab, scope]);

  const characterAssets = (assets ?? []).filter((a) => a.category === "CHARACTER");

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
          {(["Tất cả", ...assetCategories] as const).map((c) => (
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
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {tab === "Tất cả" || tab === "Vai trò" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {characterAssets.map((c) => (
            <div key={c.id} className="rounded-xl border border-black/10 bg-white p-4">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt={c.name} className="mb-3 h-28 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 h-28 w-full rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
              )}
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-gray-500">
                {(c.metadata?.role as string) ?? "Nhân vật"} · {scope}
              </p>
              <button className="mt-3 w-full rounded-full border border-black/10 py-1.5 text-xs font-medium hover:bg-black/5">
                Mở dự án
              </button>
            </div>
          ))}
          {assets && characterAssets.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-gray-400">
              Chưa có tài sản nào.
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-gray-400">
          Chưa có tài sản nào thuộc danh mục &ldquo;{tab}&rdquo;.
        </p>
      )}

      <p className="mt-6 text-right text-xs text-gray-400">
        Trang 1/1 · {tab === "Vai trò" || tab === "Tất cả" ? characterAssets.length : 0} mục
      </p>
    </div>
  );
}
