"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";

const stepLabels = ["Chọn mẫu", "Nội dung đầu vào", "Cấu hình kiểu", "Bắt đầu tạo"];

export default function VideoWizardPage() {
  const params = useParams<{ id: string }>();
  const [config, setConfig] = useState<{ templates: { id: string; name: string; desc?: string }[]; styles: { id: string; name: string; ratio: string }[]; chars: { id: string; name: string; desc: string }[]; voices: { id: string; name: string; gender: string }[] } | null>(null);
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("1-3");
  const [audience, setAudience] = useState("Học sinh trung học cơ sở");
  const [style, setStyle] = useState("");
  const [charStyle, setCharStyle] = useState("");
  const [voice, setVoice] = useState("");
  const [ratio, setRatio] = useState<"16:9" | "9:16">("16:9");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    api<{ templates: { id: string; name: string; desc?: string }[]; styles: { id: string; name: string; ratio: string }[]; chars: { id: string; name: string; desc: string }[]; voices: { id: string; name: string; gender: string }[] }>("/api/config/video-templates").then((r) => {
      setConfig(r as any);
      const vt = (r as any).templates[0]; if (vt) setTemplate(vt.id);
      const st = (r as any).styles[0]; if (st) setStyle(st.id);
      const ct = (r as any).chars[0]; if (ct) setCharStyle(ct.id);
      const vo = (r as any).voices[0]; if (vo) setVoice(vo.id);
    }).catch(() => {}).finally(() => {});
  }, []);

  const selectedStyle = config?.styles.find((s: { id: string }) => s.id === style);
  const selectedVoice = config?.voices.find((v: { id: string }) => v.id === voice);
  const selectedTemplate = config?.templates.find((t: { id: string }) => t.id === template);

  const startGenerate = async () => {
    setDone(false);
    setProgress(0);
    setGenerating(true);
    try {
      const { api } = await import("@/lib/api-client");
      await api(`/api/video-projects/${params.id}`, { method: "PATCH", body: JSON.stringify({ templateId: template, topic, durationRange: duration, audience, visualStyleId: style, characterStyleId: charStyle, voiceId: voice, ratio }) });
      const { jobId } = await api<{ jobId: string }>(`/api/video-projects/${params.id}/storyboard`, { method: "POST" });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const j = await api<{ status: string }>(`/api/jobs/${jobId}`).catch(() => null);
        if (j?.status === "succeeded" || j?.status === "failed") break;
      }
    } catch {}
  };

  const showPreviewPanel = step >= 1;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/video" className="hover:underline">
          ← Quay lại nền tảng tạo nội dung
        </Link>
        <span className="text-gray-300">· dự án #{params.id}</span>
      </div>
      <h1 className="mb-4 text-2xl font-bold">{topic || "Video ngắn AI mới"}</h1>

      <div className="mb-6 flex flex-wrap items-center gap-6 text-sm">
        {stepLabels.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 ${
              i === step ? "font-bold text-black" : "text-gray-400"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                i === step ? "brand-btn" : i < step ? "bg-black text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {step === 0 && <TemplateStep template={template} setTemplate={setTemplate} config={config} />}
          {step === 1 && (
            <InputStep
              topic={topic}
              setTopic={setTopic}
              duration={duration}
              setDuration={setDuration}
              audience={audience}
              setAudience={setAudience}
            />
          )}
          {step === 2 && (
            <StyleStep
              style={style}
              setStyle={setStyle}
              charStyle={charStyle}
              setCharStyle={setCharStyle}
              voice={voice}
              setVoice={setVoice}
              config={config}
            />
          )}
          {step === 3 && (
            <GenerateStep
              generating={generating}
              progress={progress}
              done={done}
              onGenerate={startGenerate}
            />
          )}

          {step < 3 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep((s) => Math.min(s + 1, 3))}
                className="brand-btn rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                {step === 2 ? "Tạo bảng phân cảnh →" : "Bước tiếp theo →"}
              </button>
            </div>
          )}
        </div>

        {showPreviewPanel && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-black/10 bg-white p-4">
              <p className="mb-3 text-sm font-bold">Xem trước trực tiếp</p>
              <div className={`mb-3 h-40 w-full rounded-lg bg-gradient-to-br ${previewGradient(style)}`} />
              <p className="mb-3 text-xs text-gray-600">{selectedTemplate?.desc}</p>
              <p className="mb-2 text-xs font-bold text-gray-500">
                Tổng quan về cấu hình hiện tại
              </p>
              <dl className="space-y-1.5 text-xs">
                <Row label="Mẫu" value={selectedTemplate?.name} />
                <Row label="Phong cách" value={selectedStyle?.name} />
                <Row label="Lồng tiếng" value={selectedVoice?.name} />
                <Row
                  label="Tỷ lệ"
                  value={
                    <div className="flex gap-1">
                      {(["16:9", "9:16"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRatio(r)}
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            ratio === r ? "bg-black text-white" : "bg-black/5 text-gray-600"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  }
                />
                <Row label="Phim hoàn chỉnh" value="Video AI (demo)" />
              </dl>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-1.5 first:border-0 first:pt-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function previewGradient(styleId: string) {
  const map: Record<string, string> = {
    s1: "from-slate-200 to-slate-400",
    s2: "from-sky-200 to-blue-500",
    s3: "from-orange-200 to-rose-400",
    s4: "from-zinc-200 to-zinc-500",
    s5: "from-lime-200 to-emerald-400",
    s6: "from-slate-700 to-indigo-900",
  };
  return map[styleId] ?? "from-gray-200 to-gray-400";
}

function TemplateStep({
  template,
  setTemplate,
  config,
}: {
  template: string;
  setTemplate: (v: string) => void;
  config: { templates: { id: string; name: string; desc?: string }[] } | null;
}) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Chọn một kịch bản mẫu để bắt đầu</h2>
      <p className="mb-5 text-sm text-gray-500">
        Mẫu chỉ gợi ý cấu trúc kịch bản — bạn có thể chỉnh sửa toàn bộ nội dung ở bước sau.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(config?.templates ?? []).map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            className={`rounded-xl border p-4 text-left transition ${
              template === t.id
                ? "border-black bg-brand/20 ring-1 ring-black"
                : "border-black/10 bg-white hover:border-black/30"
            }`}
          >
            <div className="mb-3 h-24 rounded-lg bg-gray-100" />
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="mt-1 text-xs text-gray-500">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function InputStep({
  topic,
  setTopic,
  duration,
  setDuration,
  audience,
  setAudience,
}: {
  topic: string;
  setTopic: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  audience: string;
  setAudience: (v: string) => void;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 text-lg font-bold">Nội dung đầu vào</h2>
      <p className="mb-5 text-sm text-gray-500">
        Mô tả chủ đề hoặc dán bài viết bạn muốn chuyển thành video.
      </p>

      <label className="mb-1 block text-xs font-semibold text-gray-600">Chủ đề / ý tưởng</label>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={5}
        className="mb-5 w-full rounded-lg border border-black/10 bg-white p-3 text-sm outline-none focus:border-black/30"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Khoảng thời gian</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white p-2.5 text-sm outline-none focus:border-black/30"
          >
            <option value="1-3">~1–3 phút</option>
            <option value="3-5">~3–5 phút</option>
            <option value="5-8">~5–8 phút</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Đối tượng khán giả</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white p-2.5 text-sm outline-none focus:border-black/30"
          >
            <option>Học sinh trung học cơ sở</option>
            <option>Sinh viên đại học</option>
            <option>Người đi làm / đại chúng</option>
          </select>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">Số lượng cảnh: Tự động AI</p>
    </div>
  );
}

function StyleStep({
  style,
  setStyle,
  charStyle,
  setCharStyle,
  voice,
  setVoice,
  config,
}: {
  style: string;
  setStyle: (v: string) => void;
  charStyle: string;
  setCharStyle: (v: string) => void;
  voice: string;
  setVoice: (v: string) => void;
  config: { styles: { id: string; name: string; ratio: string }[]; chars: { id: string; name: string; desc: string }[]; voices: { id: string; name: string; gender: string }[] } | null;
}) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Phong cách hình ảnh</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(config?.styles ?? []).map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className={`overflow-hidden rounded-xl border text-left transition ${
              style === s.id ? "border-black ring-1 ring-black" : "border-black/10 hover:border-black/30"
            }`}
          >
            <div className={`h-28 bg-gradient-to-br ${previewGradient(s.id)}`} />
            <div className="p-3">
              <p className="text-xs font-semibold">{s.name}</p>
              <p className="text-[11px] text-gray-400">{s.ratio}</p>
            </div>
          </button>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-bold">Cài đặt nhân vật</h3>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(config?.chars ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCharStyle(c.id)}
            className={`rounded-xl border p-3 text-left transition ${
              charStyle === c.id ? "border-black bg-brand/20" : "border-black/10 bg-white hover:border-black/30"
            }`}
          >
            <div className="mb-2 h-20 rounded-lg bg-gray-100" />
            <p className="text-xs font-semibold">{c.name}</p>
            <p className="text-[11px] text-gray-500">{c.desc}</p>
          </button>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-bold">Âm sắc lồng tiếng</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(config?.voices ?? []).map((v) => (
          <div
            key={v.id}
            className={`flex items-center justify-between rounded-xl border p-3 ${
              voice === v.id ? "border-black bg-brand/20" : "border-black/10 bg-white"
            }`}
          >
            <button onClick={() => setVoice(v.id)} className="text-left">
              <p className="text-xs font-semibold">{v.name}</p>
              <p className="text-[11px] text-gray-500">{v.gender}</p>
            </button>
            <button className="rounded-full border border-black/10 px-2 py-1 text-[11px] hover:bg-black/5">
              ▸ Nghe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenerateStep({
  generating,
  progress,
  done,
  onGenerate,
}: {
  generating: boolean;
  progress: number;
  done: boolean;
  onGenerate: () => void;
}) {
  if (done) {
    return (
      <div>
        <h2 className="mb-1 text-lg font-bold">Bảng phân cảnh đã sẵn sàng</h2>
        <p className="mb-5 text-sm text-gray-500">
          Xem lại từng cảnh trước khi xuất video hoàn chỉnh (demo — không tạo video thật).
        </p>
        <div className="space-y-3">
          {[
            { id: 1, title: "Cảnh mở đầu", desc: "Toàn cảnh chủ đề, câu hỏi dẫn dắt người xem.", duration: "0:00–0:08" },
            { id: 2, title: "Bối cảnh", desc: "Giải thích bối cảnh / định nghĩa cơ bản.", duration: "0:08–0:20" },
            { id: 3, title: "Diễn biến chính", desc: "Đi sâu vào nội dung chính, minh hoạ bằng hình ảnh động.", duration: "0:20–0:45" },
            { id: 4, title: "Cao trào", desc: "Điểm nhấn thú vị nhất hoặc bất ngờ nhất của chủ đề.", duration: "0:45–0:55" },
            { id: 5, title: "Kết luận", desc: "Tóm tắt ngắn gọn và lời kêu gọi hành động.", duration: "0:55–1:05" },
          ].map((sc) => (
            <div key={sc.id} className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-3">
              <div className="h-16 w-24 shrink-0 rounded-lg bg-gray-100" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  Cảnh {sc.id} · {sc.title}
                </p>
                <p className="text-xs text-gray-500">{sc.desc}</p>
              </div>
              <span className="text-xs text-gray-400">{sc.duration}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button className="brand-btn rounded-full px-5 py-2.5 text-sm font-semibold">
            Xuất video hoàn chỉnh
          </button>
          <button
            onClick={onGenerate}
            className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold hover:bg-black/5"
          >
            Tạo lại bảng phân cảnh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h2 className="mb-1 text-lg font-bold">Bắt đầu tạo</h2>
      <p className="mb-6 text-sm text-gray-500">
        Đầu tiên tạo kịch bản cảnh, xác nhận các thay đổi, sau đó tự động bắt
        đầu tạo hình ảnh và thêm lời thoại.
      </p>

      {!generating ? (
        <button onClick={onGenerate} className="brand-btn rounded-full px-6 py-3 text-sm font-semibold">
          Tạo bảng phân cảnh →
        </button>
      ) : (
        <div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full bg-black transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">Đang dựng bảng phân cảnh… {progress}%</p>
        </div>
      )}
    </div>
  );
}
