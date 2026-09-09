"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  dramaProjects as fallbackProjects,
  episodes,
  characterAssets,
} from "@/lib/mockData";
import { api } from "@/lib/api-client";
type AssetCategory = "Vai trò" | "Bối cảnh" | "Đạo cụ" | "Âm sắc";

const steps = ["Tóm tắt cốt truyện", "Thư viện tài sản", "Video tập phim"];

const assetCategories: AssetCategory[] = ["Vai trò", "Bối cảnh", "Đạo cụ", "Âm sắc"];

export default function DramaDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<{ title: string; summary?: { logline?: string; visualStyle?: string; episodeCount?: number } | null; episodes?: { index: number; title: string; summary: string }[] } | null>(null);
  useEffect(() => { api<{ id: string; title: string; summary: { logline: string; visualStyle: string; episodeCount: number } | null; episodes: { index: number; title: string; summary: string }[] }>(`/api/drama/${params.id}`).then(setDetail).catch(() => {}); }, [params.id]);
  const fb = useMemo(
    () => fallbackProjects.find((p) => p.id === params.id) ?? fallbackProjects[0],
    [params.id]
  );
  const project = useMemo(() => ({
    ...fb,
    title: detail?.title ?? fb.title,
    synopsis: detail?.summary?.logline ?? fb.synopsis,
    style: detail?.summary?.visualStyle ?? fb.style,
    episodeCount: detail?.summary?.episodeCount ?? fb.episodeCount,
  }), [fb, detail]);
  const episodeList = useMemo(() => detail?.episodes?.map((e) => ({ id: e.index, title: e.title, summary: e.summary })) ?? episodes, [detail]);

  const [step, setStep] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>("idea");
  const [assetTab, setAssetTab] = useState<AssetCategory>("Vai trò");
  const [renderedEpisodes, setRenderedEpisodes] = useState<Set<number>>(new Set());

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/drama" className="text-gray-500 hover:text-black">
            ←
          </Link>
          <h1 className="line-clamp-1 max-w-xs text-sm font-bold sm:max-w-md">
            {project.title}
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 ${
                i === step ? "font-bold text-black" : "text-gray-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  i === step
                    ? "brand-btn"
                    : i < step
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>4,20 yên · 0 ảnh gốc · 0 video gốc · 14 cuộc gọi</span>
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
              {episodeList.map((ep: { id: number; title: string; summary: string }) => (
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
            <StoryStep
              project={project}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
          )}
          {step === 1 && (
            <AssetStep assetTab={assetTab} setAssetTab={setAssetTab} />
          )}
          {step === 2 && (
            <EpisodeVideoStep
              projectId={project.id}
              renderedEpisodes={renderedEpisodes}
              setRenderedEpisodes={setRenderedEpisodes}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  open,
  onToggle,
  action,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {action}
          <span className={`text-gray-400 transition ${open ? "rotate-90" : ""}`}>
            ›
          </span>
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
  project: { title: string; synopsis: string; style: string; episodeCount: number; id: string };
  openSection: string | null;
  setOpenSection: (v: string | null) => void;
}) {
  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">
            📖
          </span>
          <div>
            <h2 className="text-xl font-bold">Tóm tắt cốt truyện</h2>
            <p className="text-xs text-gray-500">
              Tổng cộng {project.episodeCount} tập · {project.style}
            </p>
          </div>
        </div>
        <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium">
          Phong cách dự án: {project.style.split(",")[0]}
        </div>
      </div>

      <div className="space-y-3">
        <Section id="idea" title="Ý tưởng ban đầu" open={openSection === "idea"} onToggle={() => toggle("idea")}>
          {project.synopsis}
        </Section>
        <Section
          id="summary"
          title="Tóm tắt kịch bản"
          open={openSection === "summary"}
          onToggle={() => toggle("summary")}
          action={
            <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white">
              Tóm tắt của biên tập viên
            </span>
          }
        >
          Câu chuyện được chia thành {project.episodeCount} tập, mỗi tập khoảng
          3–5 cảnh chính. Mạch truyện xoay quanh xung đột trung tâm, được đẩy
          dần đến cao trào ở tập giữa và mở ra một cái kết bất ngờ.
        </Section>
        <Section
          id="script"
          title="Kịch bản tập phim"
          open={openSection === "script"}
          onToggle={() => toggle("script")}
          action={
            <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white">
              Tái tạo
            </span>
          }
        >
          <ol className="list-decimal space-y-1 pl-4">
            {episodes.slice(0, 4).map((ep) => (
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
  assetTab,
  setAssetTab,
}: {
  assetTab: string;
  setAssetTab: (v: any) => void;
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
          <p className="text-xs text-gray-500">
            Tổng cộng {characterAssets.length} tài sản · 0 mục trong danh mục hiện tại
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-black/5 px-4 py-2.5 text-xs text-gray-600">
        ✦ Trước tiên, hãy hoàn thành việc dựng hình nhân vật/cảnh, sau đó tiến
        hành bước tạo video cho tập phim để tạo các cảnh quay.
      </div>

      <div className="mb-4 flex gap-2">
        {assetCategories.map((c) => (
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
          {characterAssets.map((c) => (
            <div key={c.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-3 h-28 w-full rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-gray-500">{c.role}</p>
              <span className="mt-2 inline-block rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                {c.tag}
              </span>
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

function EpisodeVideoStep({
  projectId,
  renderedEpisodes,
  setRenderedEpisodes,
}: {
  projectId: string;
  renderedEpisodes: Set<number>;
  setRenderedEpisodes: (v: Set<number>) => void;
}) {
  const toggleRender = (id: number) => {
    const next = new Set(renderedEpisodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRenderedEpisodes(next);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/40">🎬</span>
          <div>
            <h2 className="text-xl font-bold">Video tập phim</h2>
            <p className="text-xs text-gray-500">
              Tổng cộng {episodes.length} tập · {renderedEpisodes.size} đã dựng bảng phân cảnh
            </p>
          </div>
        </div>
        <button className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5">
          Quy tắc cắt lại tất cả
        </button>
      </div>

      <div className="mb-5 rounded-lg bg-black/5 px-4 py-2.5 text-xs text-gray-600">
        ✦ Bấm <b>AI phân cảnh</b> trên một tập để lên kế hoạch chi tiết; vào{" "}
        <b>Chỉnh sửa</b> để sửa kịch bản và tạo video.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((ep) => {
          const done = renderedEpisodes.has(ep.id);
          return (
            <div key={ep.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                {done ? "Đã có bảng phân cảnh" : "Chưa có cảnh quay"}
              </div>
              <p className="text-sm font-semibold">{ep.title}</p>
              <p className="line-clamp-2 text-xs text-gray-500">{ep.summary}</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/drama/${projectId}/episodes/${ep.id}`}
                  onClick={() => !done && toggleRender(ep.id)}
                  className={
                    done
                      ? "flex-1 rounded-full bg-black/5 px-3 py-1.5 text-center text-xs font-semibold text-gray-600"
                      : "brand-btn flex-1 rounded-full px-3 py-1.5 text-center text-xs font-semibold"
                  }
                >
                  {done ? "Đã dựng ✓" : "AI phân cảnh"}
                </Link>
                <Link
                  href={`/drama/${projectId}/episodes/${ep.id}`}
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
