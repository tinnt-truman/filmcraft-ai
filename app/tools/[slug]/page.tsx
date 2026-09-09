"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { aiTools, toolDetails, type ToolField } from "@/lib/mockData";
import { apiFetch, pollJob } from "@/lib/apiClient";

const ENDPOINT_BY_TOOL: Record<string, string> = {
  t2i: "/api/tools/text-to-image",
  i2i: "/api/tools/image-to-image",
  i2p: "/api/tools/image-to-product",
  t2v: "/api/tools/text-to-video",
  v2v: "/api/tools/video-to-video",
};

function buildPayload(toolId: string, values: Record<string, string>): Record<string, unknown> {
  switch (toolId) {
    case "t2i":
      return { prompt: values["Từ khóa"] || "", ratio: values["Khung"] || "1:1" };
    case "i2i":
      return {
        referenceImageUrl: values["Hình ảnh tham khảo"] || "https://placehold.co/512x512",
        prompt: values["Từ khóa"] || "",
        similarity: values["Sự tương đồng"] || "ở giữa",
      };
    case "i2p":
      return {
        productImageUrl: values["Hình ảnh sản phẩm"] || "https://placehold.co/512x512",
        outputType: values["Loại đầu ra"] || "Hình ảnh nền trắng",
        description: values["Mô tả bổ sung (tùy chọn)"] || undefined,
      };
    case "t2v":
      return {
        script: values["Kịch bản video"] || "",
        durationSec: (values["Khoảng thời gian"] || "10 giây").replace(" giây", ""),
        ratio: values["Khung"] || "16:9",
      };
    case "v2v":
      return {
        sourceVideoUrl: values["Video nguồn / Khung hình đầu tiên"] || "https://placehold.co/512x512.mp4",
        transformDescription: values["Mô tả chuyển đổi"] || "",
        intensity: values["Cường độ tập luyện"] || "ở giữa",
      };
    default:
      return values;
  }
}

const icons: Record<string, string> = {
  image: "🖼",
  sparkles: "✦",
  package: "📦",
  play: "▶",
  film: "🎞",
  layers: "🗂",
};

export default function ToolDetailPage() {
  const params = useParams<{ slug: string }>();
  const tool = useMemo(() => aiTools.find((t) => t.id === params.slug), [params.slug]);
  const detail = params.slug ? toolDetails[params.slug] : undefined;

  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!tool || !detail) {
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
    setErrorMsg(null);
    setResultUrl(null);
    try {
      const endpoint = ENDPOINT_BY_TOOL[tool.id];
      const payload = buildPayload(tool.id, values);
      const out = await apiFetch<{ demo: boolean; jobId?: string; result?: { url: string | null } }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (out.demo) {
        setResultUrl(out.result?.url ?? null);
        setStatus("done");
        return;
      }
      const job = await pollJob(out.jobId!);
      if (job.status === "FAILED") throw new Error(job.error ?? "Xử lý thất bại.");
      setResultUrl(job.resultUrl);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi khi tạo — vui lòng thử lại.");
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/tools" className="text-sm text-gray-500 hover:text-black">
        ← Tất cả các công cụ
      </Link>

      <div className="mb-6 mt-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/40 text-lg">
          {icons[tool.icon] ?? "✦"}
        </span>
        <div>
          <h1 className="text-xl font-bold">{tool.name}</h1>
          <p className="text-sm text-gray-500">{tool.desc}</p>
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
                    {f.options.map((o) => (
                      <button
                        key={o}
                        onClick={() => setChip(f.label, o)}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          (values[f.label] ?? f.options[0]) === o
                            ? "bg-brand text-black"
                            : "border border-black/10 text-gray-600"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}

                {f.kind === "cards" && (
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {f.options.map((o) => (
                      <button
                        key={o.title}
                        onClick={() => setChip(f.label, o.title)}
                        className={`rounded-lg border p-2 text-left text-[11px] font-medium ${
                          (values[f.label] ?? f.options[0].title) === o.title
                            ? "border-black bg-brand/20"
                            : "border-black/10 hover:bg-black/5"
                        }`}
                      >
                        {o.title}
                      </button>
                    ))}
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
          {status === "generating" && <p className="text-xs text-gray-400">Đang tạo…</p>}
          {status === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
          {status === "done" && (
            <div className="w-full">
              {resultUrl ? (
                tool.icon === "play" || tool.icon === "film" ? (
                  <video src={resultUrl} controls className="max-h-72 w-full rounded-lg object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultUrl} alt="Kết quả" className="max-h-72 w-full rounded-lg object-contain" />
                )
              ) : (
                <>
                  <div className="mb-2 text-2xl">✓</div>
                  <p className="text-xs text-gray-500">
                    Đã xử lý xong (provider mock — chưa cắm API key thật nên chưa có file kết quả thật).
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
