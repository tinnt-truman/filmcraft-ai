"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

type Character = {
  id: string;
  name: string;
  characterType: string;
  visualDescription: string;
  referenceImageUrl: string | null;
};

type Episode = {
  id: string;
  index: number;
  title: string;
  summary: string;
  status: "DRAFT" | "STORYBOARD_READY" | "RENDERED";
};

type ProjectDetail = {
  id: string;
  title: string;
  coverGradient: string;
  status: string;
  summary: {
    episodeCount: number;
    storyGenre: string;
    fullSummary: string;
    logline: string;
  } | null;
  characters: Character[];
  episodes: Episode[];
};

const steps = ["Tóm tắt cốt truyện", "Thư viện tài sản", "Video tập phim"];
const assetTabs = ["Vai trò", "Bối cảnh", "Đạo cụ", "Âm sắc"] as const;

export default function DramaDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>("idea");
  const [assetTab, setAssetTab] = useState<(typeof assetTabs)[number]>(assetTabs[0]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ProjectDetail>(`/api/drama/${params.id}`)
      .then((data) => !cancelled && setProject(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được dự án."));
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/drama" className="text-sm text-gray-500 hover:text-black">
          ← Quay lại
        </Link>
        <p className="mt-4 text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!project) {
    return <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-gray-400">Đang tải…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/drama" className="text-gray-500 hover:text-black">
            ←
          </Link>
          <h1 className="line-clamp-1 max-w-xs text-sm font-bold sm:max-w-md">{project.title}</h1>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 ${i === step ? "font-bold text-black" : "text-gray-400"}`}
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

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <button
            onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
            className="brand-btn rounded-full px-4 py-2 text-sm font-semibold"
          >
            Bước tiếp theo
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {step === 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <p className="mb-3 text-xs font-bold text-gray-500">Danh mục tập phim</p>
            <div className="space-y-3">
              {project.episodes.map((ep) => (
                <div key={ep.id}>
                  <p className="text-sm font-semibold">{ep.title}</p>
                  <p className="line-clamp-1 text-xs text-gray-500">{ep.summary}</p>
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className="flex-1">
          {step === 0 && (
            <StoryStep project={project} openSection={openSection} setOpenSection={setOpenSection} />
          )}
          {step === 1 && <AssetStep project={project} assetTab={assetTab} setAssetTab={setAssetTab} />}
          {step === 2 && <EpisodeVideoStep project={project} />}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {action}
          <span className={`text-gray-400 transition ${open ? "rotate-90" : ""}`}>›</span>
        </div>
      </button>
      {open && <div className="border-t border-black/10 px-5 py-4 text-sm text-gray-600">{children}</div>}
    </div>
  );
}

function StoryStep({
  project,
  openSection,
  setOpenSection,
}: {
  project: ProjectDetail;
  openSection: string | null;
  setOpenSection: (v: string | null) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [summary, setSummary] = useState(project.summary?.fullSummary ?? "");
  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await apiFetch<{ jobId: string }>(`/api/drama/${project.id}/summary`, {
        method: "PATCH",
        body: JSON.stringify({ regenerate: true }),
      });
      const { pollJob } = await import("@/lib/apiClient");
      await pollJob(res.jobId);
      const updated = await apiFetch<ProjectDetail>(`/api/drama/${project.id}`);
      setSummary(updated.summary?.fullSummary ?? "");
    } catch {
      // giữ nguyên nội dung cũ nếu lỗi — có thể hiển thị toast ở bản đầy đủ hơn
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">📖</span>
          <div>
            <h2 className="text-xl font-bold">Tóm tắt cốt truyện</h2>
            <p className="text-xs text-gray-500">
              Tổng cộng {project.summary?.episodeCount ?? project.episodes.length} tập ·{" "}
              {project.summary?.storyGenre || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Section title="Ý tưởng ban đầu" open={openSection === "idea"} onToggle={() => toggle("idea")}>
          {project.summary?.logline || "Chưa có logline."}
        </Section>
        <Section
          title="Tóm tắt kịch bản"
          open={openSection === "summary"}
          onToggle={() => toggle("summary")}
          action={
            <button
              onClick={(e) => {
                e.stopPropagation();
                regenerate();
              }}
              disabled={regenerating}
              className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {regenerating ? "Đang tạo…" : "Tóm tắt của biên tập viên"}
            </button>
          }
        >
          {summary || "Chưa có tóm tắt — bấm nút bên phải để AI sinh tóm tắt."}
        </Section>
        <Section
          title="Kịch bản tập phim"
          open={openSection === "script"}
          onToggle={() => toggle("script")}
        >
          <ol className="list-decimal space-y-1 pl-4">
            {project.episodes.slice(0, 4).map((ep) => (
              <li key={ep.id}>
                <span className="font-medium text-black">{ep.title}:</span> {ep.summary}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}

function AssetStep({
  project,
  assetTab,
  setAssetTab,
}: {
  project: ProjectDetail;
  assetTab: string;
  setAssetTab: (v: (typeof assetTabs)[number]) => void;
}) {
  const actions = [
    "Nhân vật mới",
    "Giọng người dẫn chuyện",
    "Chọn từ nhóm tài sản",
    "Xem tất cả tài sản",
    "Tái khai thác tài sản",
    "Tạo hàng loạt âm sắc",
    "Mở khung vẽ",
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">🧬</span>
        <div>
          <h2 className="text-xl font-bold">Thư viện tài sản</h2>
          <p className="text-xs text-gray-500">Tổng cộng {project.characters.length} nhân vật</p>
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-black/5 px-4 py-2.5 text-xs text-gray-600">
        ✦ Trước tiên, hãy hoàn thành việc dựng hình nhân vật/cảnh, sau đó tiến
        hành bước tạo video cho tập phim để tạo các cảnh quay.
      </div>

      <div className="mb-4 flex gap-2">
        {assetTabs.map((c) => (
          <button
            key={c}
            onClick={() => setAssetTab(c)}
            className={
              assetTab === c
                ? "brand-btn rounded-full px-4 py-1.5 text-sm font-semibold"
                : "rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-black/5"
            }
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5"
          >
            {a}
          </button>
        ))}
      </div>

      {assetTab === "Vai trò" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {project.characters.map((c) => (
            <div key={c.id} className="rounded-xl border border-black/10 bg-white p-4">
              {c.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.referenceImageUrl} alt={c.name} className="mb-3 h-28 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 h-28 w-full rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
              )}
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-gray-500">{c.characterType}</p>
            </div>
          ))}
          <button className="flex h-full min-h-[170px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 text-gray-400 hover:border-black/30 hover:text-black">
            <span className="text-2xl">+</span>
            <span className="text-xs font-medium">Nhân vật mới</span>
          </button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center text-sm text-gray-400">
          Hiện tại không có tài sản nào thuộc danh mục &ldquo;{assetTab}&rdquo;.
        </p>
      )}
    </div>
  );
}

function EpisodeVideoStep({ project }: { project: ProjectDetail }) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">🎬</span>
          <div>
            <h2 className="text-xl font-bold">Video tập phim</h2>
            <p className="text-xs text-gray-500">
              Tổng cộng {project.episodes.length} tập ·{" "}
              {project.episodes.filter((e) => e.status !== "DRAFT").length} đã dựng bảng phân cảnh
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-black/5 px-4 py-2.5 text-xs text-gray-600">
        ✦ Bấm <b>AI phân cảnh</b> trên một tập để lên kế hoạch chi tiết; vào{" "}
        <b>Chỉnh sửa</b> để sửa kịch bản và tạo video.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {project.episodes.map((ep) => {
          const done = ep.status !== "DRAFT";
          return (
            <div key={ep.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                {done ? "Đã có bảng phân cảnh" : "Chưa có cảnh quay"}
              </div>
              <p className="text-sm font-semibold">{ep.title}</p>
              <p className="line-clamp-2 text-xs text-gray-500">{ep.summary}</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/drama/${project.id}/episodes/${ep.id}`}
                  className={
                    done
                      ? "flex-1 rounded-full bg-black/5 px-3 py-1.5 text-center text-xs font-semibold text-gray-600"
                      : "brand-btn flex-1 rounded-full px-3 py-1.5 text-center text-xs font-semibold"
                  }
                >
                  {done ? "Đã dựng ✓" : "AI phân cảnh"}
                </Link>
                <Link
                  href={`/drama/${project.id}/episodes/${ep.id}`}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                >
                  Chỉnh sửa
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
