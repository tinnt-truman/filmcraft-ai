"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  subtitleModel,
  videoModels,
  aspectRatios,
  resolutions,
  subtitleModes,
  cameraStitchInfo,
  episodeHelpTabs,
} from "@/lib/mockData";
import { apiFetch, pollJob } from "@/lib/apiClient";

type LineTag = "SUBTITLE_CONFIG" | "BGM" | "DIALOGUE" | "VISUAL";
type SegmentLine = {
  id: string;
  order: number;
  tag: LineTag;
  durationSec: number;
  characterName: string | null;
  direction: string | null;
  shotType: string | null;
  text: string;
};
type Segment = {
  id: string;
  order: number;
  title: string;
  durationSec: number;
  status: "PENDING" | "GENERATING" | "DONE" | "FAILED";
  videoUrl: string | null;
  lines: SegmentLine[];
};
type EpisodeMeta = {
  id: string;
  title: string;
  summary: string;
  ratio: string | null;
  resolution: string | null;
  videoModel: string | null;
  subtitleMode: string | null;
  stitchEnabled: boolean;
};

export default function EpisodeEditorPage() {
  const params = useParams<{ id: string; episodeId: string }>();

  const [episode, setEpisode] = useState<EpisodeMeta | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]);
  const [resolution, setResolution] = useState(resolutions[0]);
  const [videoModel, setVideoModel] = useState(videoModels[0]);
  const [subtitleModeId, setSubtitleModeId] = useState<(typeof subtitleModes)[number]["id"]>("auto");
  const [stitchEnabled, setStitchEnabled] = useState(false);
  const [openMenu, setOpenMenu] = useState<"ratio" | "model" | "subtitle" | "stitch" | "help" | null>(null);
  const [helpTab, setHelpTab] = useState<"transfer" | "script" | "recommend">("transfer");
  const [regeneratingAll, setRegeneratingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ episode: EpisodeMeta; segments: Segment[] }>(
        `/api/episodes/${params.episodeId}/segments`
      );
      setEpisode(data.episode);
      setSegments(data.segments);
      setActiveId((prev) => prev ?? data.segments[0]?.id ?? null);
      if (data.episode.ratio) setAspectRatio(data.episode.ratio);
      if (data.episode.resolution) setResolution(data.episode.resolution);
      if (data.episode.videoModel) setVideoModel(data.episode.videoModel);
      if (data.episode.subtitleMode) setSubtitleModeId(data.episode.subtitleMode as "auto" | "post");
      setStitchEnabled(data.episode.stitchEnabled);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không tải được dữ liệu tập phim.");
    }
  }, [params.episodeId]);

  useEffect(() => {
    // `load` chỉ gọi setState *sau* khi await xong request — an toàn, không
    // gây cascading render đồng bộ — nhưng eslint-plugin-react-hooks không
    // theo dõi qua ranh giới hàm async nên báo nhầm ở đây.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const saveSettings = async (patch: Record<string, unknown>) => {
    try {
      await apiFetch(`/api/episodes/${params.episodeId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    } catch {
      // best-effort — UI vẫn phản ánh lựa chọn cục bộ dù lưu lỗi
    }
  };

  const active = useMemo(() => segments.find((s) => s.id === activeId) ?? segments[0], [segments, activeId]);

  const counts = {
    done: segments.filter((s) => s.status === "DONE").length,
    generating: segments.filter((s) => s.status === "GENERATING").length,
    failed: segments.filter((s) => s.status === "FAILED").length,
    total: segments.length,
  };

  const generate = async (id: string) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status: "GENERATING" } : s)));
    try {
      const { jobId } = await apiFetch<{ jobId: string }>(`/api/segments/${id}/generate`, { method: "POST" });
      const job = await pollJob(jobId);
      setSegments((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: job.status === "SUCCEEDED" ? "DONE" : "FAILED", videoUrl: job.resultUrl }
            : s
        )
      );
    } catch (err) {
      setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status: "FAILED" } : s)));
      if (typeof window !== "undefined") window.alert(err instanceof Error ? err.message : "Tạo video thất bại.");
    }
  };

  const regenerateAll = async () => {
    setRegeneratingAll(true);
    try {
      await apiFetch(`/api/episodes/${params.episodeId}/regenerate-all`, { method: "POST" });
      await load();
    } catch (err) {
      if (typeof window !== "undefined") window.alert(err instanceof Error ? err.message : "Không thể tái lập kịch bản.");
    } finally {
      setRegeneratingAll(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <Link href={`/drama/${params.id}`} className="text-sm text-gray-500 hover:text-black">
          ← Quay lại
        </Link>
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!episode) {
    return <div className="mx-auto max-w-[1400px] px-4 py-10 text-sm text-gray-400">Đang tải…</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      {/* top bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/drama/${params.id}`} className="text-gray-500 hover:text-black">
            ←
          </Link>
          <h1 className="line-clamp-1 max-w-xs text-sm font-bold sm:max-w-md">{episode.summary}</h1>
        </div>

        <div className="relative flex flex-wrap items-center gap-2 text-xs">
          {openMenu && openMenu !== "help" && (
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
          )}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "ratio" ? null : "ratio")}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium"
            >
              {aspectRatio} · {resolution} ⌄
            </button>
            {openMenu === "ratio" && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-72 rounded-xl border border-black/10 bg-white p-4 text-left shadow-lg">
                <p className="mb-2 text-xs font-bold">Tỷ lệ khung hình & Độ sắc nét</p>
                <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Tỷ lệ khung hình</p>
                <div className="mb-3 flex gap-1.5">
                  {aspectRatios.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setAspectRatio(r);
                        saveSettings({ ratio: r });
                      }}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        aspectRatio === r ? "bg-brand text-black" : "border border-black/10 text-gray-600"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Độ sắc nét</p>
                <div className="flex gap-1.5">
                  {resolutions.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setResolution(r);
                        saveSettings({ resolution: r });
                      }}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        resolution === r ? "bg-brand text-black" : "border border-black/10 text-gray-600"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "subtitle" ? null : "subtitle")}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium"
            >
              Phụ đề mẫu ⌄
            </button>
            {openMenu === "subtitle" && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-80 rounded-xl border border-black/10 bg-white p-4 text-left shadow-lg">
                <p className="mb-2 text-xs font-bold">Cài đặt phụ đề</p>
                <div className="space-y-3">
                  {subtitleModes.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        checked={subtitleModeId === m.id}
                        onChange={() => {
                          setSubtitleModeId(m.id);
                          saveSettings({ subtitleMode: m.id });
                        }}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-[12px] font-semibold">{m.label}</span>
                        <span className="block text-[11px] leading-relaxed text-gray-400">{m.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "model" ? null : "model")}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium text-gray-600"
            >
              {videoModel} ⌄
            </button>
            {openMenu === "model" && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-black/10 bg-white p-2 text-left shadow-lg">
                {videoModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setVideoModel(m);
                      saveSettings({ videoModel: m });
                      setOpenMenu(null);
                    }}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium ${
                      videoModel === m ? "bg-black/5 text-black" : "text-gray-600 hover:bg-black/5"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "stitch" ? null : "stitch")}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium text-gray-600"
            >
              ⇆ {cameraStitchInfo.title} ⌄
            </button>
            {openMenu === "stitch" && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-80 rounded-xl border border-black/10 bg-white p-4 text-left shadow-lg">
                <p className="mb-2 text-xs font-bold">{cameraStitchInfo.title}</p>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={stitchEnabled}
                    onChange={(e) => {
                      setStitchEnabled(e.target.checked);
                      saveSettings({ stitchEnabled: e.target.checked });
                    }}
                    className="mt-0.5"
                  />
                  <span className="text-[12px] font-medium">{cameraStitchInfo.optionLabel}</span>
                </label>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{cameraStitchInfo.desc}</p>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "help" ? null : "help")}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-gray-500"
            >
              ?
            </button>
            {openMenu === "help" && (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
                <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Quy tắc truyền và sử dụng Seedance</h3>
                    <button onClick={() => setOpenMenu(null)} className="text-gray-400 hover:text-black">
                      ✕
                    </button>
                  </div>
                  <div className="mb-3 flex gap-1 rounded-full bg-black/5 p-1 text-[11px] font-semibold">
                    {(Object.keys(episodeHelpTabs) as (keyof typeof episodeHelpTabs)[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setHelpTab(k)}
                        className={`flex-1 rounded-full py-1.5 ${helpTab === k ? "bg-white shadow-sm" : "text-gray-500"}`}
                      >
                        {episodeHelpTabs[k].label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {episodeHelpTabs[helpTab].sections.map((s) => (
                      <div key={s.heading}>
                        <p className="mb-1.5 text-[12px] font-bold">{s.heading}</p>
                        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-gray-500">
                          {s.items.map((it) => (
                            <li key={it}>{it}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={regenerateAll}
            disabled={regeneratingAll}
            className="rounded-full bg-black px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            {regeneratingAll ? "Đang xếp hàng…" : "Tái lập kịch bản bằng AI"}
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-gray-500">
        Đã hoàn thành {counts.done}/{counts.total} · Đang tiến hành {counts.generating} · Thất bại {counts.failed}
      </p>

      <div className="flex gap-5">
        <div className="min-w-0 flex-1">
          {active && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  {active.title} · {active.durationSec} giây
                </h2>
              </div>

              <div className="space-y-3">
                {active.lines.map((l) => (
                  <LineRow key={l.id} line={l} />
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => generate(active.id)}
                  disabled={active.status === "GENERATING"}
                  className="brand-btn rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {active.status === "GENERATING" ? "Đang tạo…" : "phát ra"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="mb-3 flex gap-4 text-xs font-semibold text-gray-400">
              <button className="text-black">Xem trước</button>
              <a
                href={`/api/episodes/${params.episodeId}/subtitles.srt`}
                className="ml-auto text-gray-500 hover:text-black"
              >
                Xuất SRT
              </a>
            </div>
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-lg bg-gray-100 text-center text-xs text-gray-400">
              {active?.status === "DONE" ? (
                active.videoUrl ? (
                  <video src={active.videoUrl} controls className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <div className="p-4">
                    <div className="mb-2 text-2xl">▶</div>
                    Đã xử lý xong (provider mock — chưa có file video thật)
                  </div>
                )
              ) : active?.status === "GENERATING" ? (
                "Đang dựng video…"
              ) : (
                "Video đang chờ tạo"
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">{subtitleModel}</p>
          </div>
        </aside>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {segments.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`flex w-32 shrink-0 flex-col items-center gap-1 rounded-lg border p-2 text-center ${
              s.id === activeId ? "border-black ring-1 ring-black" : "border-black/10 bg-white"
            }`}
          >
            <div className="flex h-16 w-full items-center justify-center rounded bg-gray-100 text-lg text-gray-300">
              {s.status === "DONE" ? "✓" : s.status === "GENERATING" ? "…" : "+"}
            </div>
            <p className="text-[11px] font-semibold">
              {s.title} · {s.durationSec} giây
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function LineRow({ line: l }: { line: SegmentLine }) {
  const badge = (
    <span className="mt-0.5 flex h-5 shrink-0 items-center gap-1 rounded bg-black/5 px-1.5 text-[10px] font-medium text-gray-500">
      🎬 {l.durationSec}s
    </span>
  );

  if (l.tag === "SUBTITLE_CONFIG" || l.tag === "BGM") {
    return (
      <div className="flex items-start gap-2 text-[11px] text-gray-500">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium">
          【{l.tag === "SUBTITLE_CONFIG" ? "Phụ đề" : "BGM"}】
        </span>
        <span>{l.text}</span>
      </div>
    );
  }

  if (l.tag === "DIALOGUE") {
    return (
      <div className="flex items-start gap-2 text-sm">
        {badge}
        <p>
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            Đối thoại · chậm rõ · đồng bộ phụ đề
          </span>{" "}
          <span className="font-semibold">{l.characterName}</span>
          {l.direction && <span className="text-gray-400"> ({l.direction})</span>}: {l.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      {badge}
      <p>
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
          Hình ảnh · không lồng tiếng, chỉ tiếng môi trường
        </span>{" "}
        △ <span className="font-semibold">{l.shotType}:</span> {l.text}
      </p>
    </div>
  );
}
