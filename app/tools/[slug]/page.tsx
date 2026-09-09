"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
type ToolField = { kind: string; label: string; placeholder?: string; optional?: boolean; options?: (string | { title: string; desc?: string })[] };
type ToolDetail = { id: string; intro: string; fields: ToolField[]; submitLabel: string };

const iconsMap: Record<string, string> = {
  t2i: "🖼", i2i: "✦", i2p: "📦", t2v: "▶", v2v: "🎞", ecom: "🗂",
};

export default function ToolDetailPage() {
  const params = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<ToolDetail | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  useEffect(() => { if (params.slug) api<ToolDetail>(`/api/config/tool-details/${params.slug}`).then((r) => setDetail(r as any)).catch(() => {}); }, [params.slug]);

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/tools" className="text-sm text-gray-500 hover:text-black">
          ← Tất cả các công cụ
        </Link>
        <p className="mt-4 text-sm text-gray-500">Không tìm thấy công cụ này.</p>
      </div>
    );
  }

  const setChip = (label: string, v: string) => setValues((s) => ({ ...s, [label]: v }));

  const submit = async () => {
    setStatus("generating");
    try {
      const { jobId } = await (await import("@/lib/api-client")).api<{ jobId: string }>(`/api/tools/${params.slug}`, { method: "POST", body: JSON.stringify(values) });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const j = await (await import("@/lib/api-client")).api<{ status: string }>(`/api/jobs/${jobId}`).catch(() => null);
        if (j && (j.status === "succeeded" || j.status === "failed")) break;
      }
      setStatus("done");
    } catch { setStatus("done"); }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/tools" className="text-sm text-gray-500 hover:text-black">
        ← Tất cả các công cụ
      </Link>

      <div className="mb-6 mt-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/40 text-lg">
          {iconsMap[detail.id] ?? "✦"}
        </span>
        <div>
          <h1 className="text-xl font-bold">{detail.id}</h1>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="mb-4 text-xs leading-relaxed text-gray-500">{detail.intro}</p>

          <div className="space-y-4">
            {detail.fields.map((f: ToolField) => (
              <div key={f.label}>
                <p className="mb-1.5 text-xs font-semibold text-gray-700">{f.label}</p>

                {f.kind === "upload" && (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-black/15 bg-black/[0.02] text-xs text-gray-400">
                    Nhấp hoặc kéo để tải lên
                  </div>
                )}

                {f.kind === "textarea" && (
                  <textarea
                    value={values[f.label] ?? ""}
                    onChange={(e) => setChip(f.label, e.target.value)}
                    placeholder={f.placeholder}
                    rows={f.label.toLowerCase().includes("bổ sung") || f.optional ? 2 : 4}
                    className="w-full resize-none rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-black/30"
                  />
                )}

                {f.kind === "chips" && (
                  <div className="flex flex-wrap gap-1.5">
{(f.options ?? []).map((o) => (
                        <button
                          key={String(o)}
                          onClick={() => setChip(f.label, String(o))}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            (values[f.label] ?? (f.options?.[0] as string ?? "")) === String(o)
                              ? "bg-brand text-black"
                              : "border border-black/10 text-gray-600"
                          }`}
                        >
                          {String(o)}
                        </button>
                      ))}
                  </div>
                )}

                {f.kind === "cards" && (
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {(f.options ?? []).map((o) => {
                      const item = o as { title: string; desc?: string };
                      return (
                      <button
                        key={item.title}
                        onClick={() => setChip(f.label, item.title)}
                        className={`rounded-lg border p-2 text-left text-[11px] font-medium ${
                          (values[f.label] ?? (f.options?.[0] as { title: string })?.title ?? "") === item.title
                            ? "border-black bg-brand/20"
                            : "border-black/10 hover:bg-black/5"
                        }`}
                      >
                        {item.title}
                      </button>
                    ); })}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={submit}
              disabled={status === "generating"}
              className="brand-btn w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {status === "generating" ? "Đang tạo…" : detail.submitLabel}
            </button>
          </div>
        </div>

        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-black/10 bg-white p-5 text-center">
          {status === "idle" && (
            <div>
              <p className="text-sm font-bold">Khu vực xem trước kết quả</p>
              <p className="mt-1 text-xs text-gray-400">
                Nó sẽ được hiển thị ở đây sau khi quá trình tạo ra bản in hoàn tất.
              </p>
            </div>
          )}
          {status === "generating" && <p className="text-xs text-gray-400">Đang tạo… (demo)</p>}
          {status === "done" && (
            <div>
              <div className="mb-2 text-2xl">✓</div>
              <p className="text-xs text-gray-500">Kết quả demo đã sẵn sàng.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
