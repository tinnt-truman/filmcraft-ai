"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  dramaProjects,
  episodes,
  getSegmentsForEpisode,
  subtitleModel,
  shotAiModel,
  videoModels,
  aspectRatios,
  resolutions,
  subtitleModes,
  cameraStitchInfo,
  episodeHelpTabs,
  type Segment,
  type SegmentLine,
} from "@/lib/mockData";
import { api } from "@/lib/api-client";
type AssetCategory = "Vai trò" | "Bối cảnh" | "Đạo cụ" | "Âm sắc";

export default function EpisodeEditorPage() {
  const params = useParams<{ id: string; episodeId: string }>();
  const episodeId = Number(params.episodeId) || 1;

  const project = useMemo(
    () => dramaProjects.find((p) => p.id === params.id) ?? dramaProjects[0],
    [params.id]
  );
  const episode = useMemo(
    () => episodes.find((e) => e.id === episodeId) ?? episodes[0],
    [episodeId]
  );

  const [segments, setSegments] = useState<Segment[]>(() => getSegmentsForEpisode(episodeId));
  const [activeId, setActiveId] = useState(segments[0]?.id ?? 1);
  const [segError, setSegError] = useState("");
  useEffect(() => { api<AssetCategory[]>("/api/config/asset-categories").then(setAssetCategories).catch(() => {}); }, []);
  useEffect(() => {
    let alive = true;
    api<{ dbId: string }[]>(`/api/drama/${params.id}/episodes`).then((list) => {
      const found = list.find((e) => (e as unknown as { id: number }).id === episodeId);
      if (found?.dbId && alive) {
        api<Segment[]>(`/api/episodes/${found.dbId}/segments`).then((segs) => {
          if (segs.length && alive) { setSegments(segs); setActiveId(segs[0].id); }
        }).catch(() => {});
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [params.id, episodeId]);
  const [leftTab, setLeftTab] = useState<"episode" | "all">("episode");
  const [assetTab, setAssetTab] = useState<AssetCategory>("Vai trò");
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>(["Vai trò", "Bối cảnh", "Đạo cụ", "Âm sắc"]);
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]);
  const [resolution, setResolution] = useState(resolutions[0]);
  const [videoModel, setVideoModel] = useState(videoModels[0]);
  const [subtitleModeId, setSubtitleModeId] = useState<(typeof subtitleModes)[number]["id"]>("auto");
  const [stitchEnabled, setStitchEnabled] = useState(false);
  const [openMenu, setOpenMenu] = useState<
    "ratio" | "model" | "subtitle" | "stitch" | "help" | null
  >(null);
  const [helpTab, setHelpTab] = useState<"transfer" | "script" | "recommend">("transfer");
  const [showNewCharacter, setShowNewCharacter] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");

  const active = segments.find((s) => s.id === activeId) ?? segments[0];

  const counts = {
    done: segments.filter((s) => s.status === "done").length,
    generating: segments.filter((s) => s.status === "generating").length,
    failed: segments.filter((s) => s.status === "failed").length,
    total: segments.length,
  };

  const pollJob = async (jobId: string, segId: number) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const j = await api<{ status: string }>(`/api/jobs/${jobId}`);
        if (j.status === "succeeded") { setSegments((prev) => prev.map((s) => (s.id === segId ? { ...s, status: "done" } : s))); return; }
        if (j.status === "failed") { setSegments((prev) => prev.map((s) => (s.id === segId ? { ...s, status: "failed" } : s))); return; }
      } catch {}
    }
  };
  const generate = async (id: number) => {
    const seg = segments.find((s) => s.id === id) as (Segment & { dbId?: string }) | undefined;
    setSegError("");
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status: "generating" } : s)));
    try {
      if (seg?.dbId && seg.dbId.length > 10) {
        const { jobId } = await api<{ jobId: string }>(`/api/segments/${seg.dbId}/generate`, { method: "POST" });
        pollJob(jobId, id);
        return;
      }
    } catch (e) { setSegError((e as Error).message); }
    setTimeout(() => {
      setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status: "done" } : s)));
    }, 1800);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      {/* top bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/drama/${project.id}`} className="text-gray-500 hover:text-black">
            ←
          </Link>
          <h1 className="line-clamp-1 max-w-xs text-sm font-bold sm:max-w-md">
            {episode.summary}
          </h1>
        </div>

        <div className="relative flex flex-wrap items-center gap-2 text-xs">
          {openMenu && openMenu !== "help" && (
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
          )}
          {/* ratio + resolution */}
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
                <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
                  Chỉ dùng cho phân cảnh của tập này; nếu không đặt riêng sẽ kế thừa mặc định của dự
                  án. Vui lòng tạo lại video cho mỗi đoạn sau khi thay đổi.
                </p>
                <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Tỷ lệ khung hình</p>
                <div className="mb-3 flex gap-1.5">
                  {aspectRatios.map((r) => (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
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
                      onClick={() => setResolution(r)}
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

          <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium text-gray-600">
            {project.style.split(",")[0]}
          </span>

          {/* subtitle mode */}
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
                        onChange={() => setSubtitleModeId(m.id)}
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

          {/* video model */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "model" ? null : "model")}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium text-gray-600"
            >
              {videoModel} ⌄
            </button>
            {openMenu === "model" && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-black/10 bg-white p-2 text-left shadow-lg">
                <p className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase text-gray-400">
                  Mô hình video
                </p>
                {videoModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setVideoModel(m);
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

          {/* camera stitch toggle */}
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
                    onChange={(e) => setStitchEnabled(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-[12px] font-medium">{cameraStitchInfo.optionLabel}</span>
                </label>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{cameraStitchInfo.desc}</p>
              </div>
            )}
          </div>

          {/* help */}
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
                  <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
                    {episodeHelpTabs.transfer.intro}
                  </p>
                  <div className="mb-3 flex gap-1 rounded-full bg-black/5 p-1 text-[11px] font-semibold">
                    {(Object.keys(episodeHelpTabs) as (keyof typeof episodeHelpTabs)[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setHelpTab(k)}
                        className={`flex-1 rounded-full py-1.5 ${
                          helpTab === k ? "bg-white shadow-sm" : "text-gray-500"
                        }`}
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

          <button className="rounded-full bg-black px-3 py-1.5 font-semibold text-white">
            Tái lập kịch bản bằng AI
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-gray-500">
        Đã hoàn thành {counts.done}/{counts.total} · Đang tiến hành {counts.generating} · Thất bại{" "}
        {counts.failed}
        {segError && <span className="ml-2 text-red-500">{segError}</span>}
      </p>

      <div className="flex gap-5">
        {/* left sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="mb-4 flex gap-1 rounded-full bg-black/5 p-1 text-xs font-semibold">
            <button
              onClick={() => setLeftTab("episode")}
              className={`flex-1 rounded-full py-1.5 ${leftTab === "episode" ? "bg-white shadow-sm" : "text-gray-500"}`}
            >
              Tập này
            </button>
            <button
              onClick={() => setLeftTab("all")}
              className={`flex-1 rounded-full py-1.5 ${leftTab === "all" ? "bg-white shadow-sm" : "text-gray-500"}`}
            >
              Trọn bộ
            </button>
          </div>

          <div className="mb-3 flex gap-1.5">
            {assetCategories.slice(0, 3).map((c) => (
              <button
                key={c}
                onClick={() => setAssetTab(c)}
                className={
                  assetTab === c
                    ? "rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white"
                    : "rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium text-gray-600"
                }
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowNewCharacter(true)}
              className="brand-btn flex-1 rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              Tạo nhân vật mới
            </button>
            <button className="flex-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5">
              Nhập khẩu
            </button>
          </div>

          {showNewCharacter && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5">
                <h3 className="mb-1 text-sm font-bold">Tạo nhân vật mới</h3>
                <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
                  Nhập tên nhân vật, sau khi tạo sẽ được chèn vào phân cảnh hiện tại, và bạn có thể
                  tiếp tục tải lên / tạo ảnh đại diện.
                </p>
                <input
                  autoFocus
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  placeholder="Tên nhân vật"
                  className="mb-4 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowNewCharacter(false);
                      setNewCharacterName("");
                    }}
                    className="rounded-full border border-black/10 px-4 py-1.5 text-xs font-semibold hover:bg-black/5"
                  >
                    Hủy
                  </button>
                  <button
                    disabled={!newCharacterName.trim()}
                    onClick={() => {
                      setShowNewCharacter(false);
                      setNewCharacterName("");
                    }}
                    className="brand-btn rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Tạo
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="rounded-lg bg-black/5 p-3 text-[11px] leading-relaxed text-gray-500">
            {leftTab === "episode"
              ? 'Tập này hiện chưa có tài nguyên tham chiếu nào. Thêm bằng nút "Tạo nhân vật mới" ở trên, hoặc chuyển sang "Trọn bộ" để xem tài nguyên của cả dự án.'
              : "Đang hiển thị tài nguyên dùng chung của toàn bộ dự án (nhân vật, bối cảnh, đạo cụ đã tạo ở Thư viện tài sản)."}
          </p>
        </aside>

        {/* middle: segment editor */}
        <div className="min-w-0 flex-1">
          {active && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  {active.title} · {active.durationSec} giây
                </h2>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  Khoảng thời gian
                  <input
                    type="number"
                    value={active.durationSec}
                    readOnly
                    className="w-14 rounded border border-black/10 px-2 py-1 text-center"
                  />
                  s
                </label>
              </div>
              <p className="mb-3 text-[11px] text-gray-400">
                Nội dung liên quan đến đoạn này; gõ @ để tham chiếu tài sản hoặc chèn thẻ thời
                lượng.
              </p>
              <p className="mb-4 rounded-lg bg-black/5 px-3 py-2 text-[11px] text-gray-500">
                Không có tài sản liên quan nào. Nhấp vào thẻ bên trái hoặc nhập @asset:id
              </p>

              <div className="space-y-3">
                {active.lines.map((l) => (
                  <LineRow key={l.id} line={l} />
                ))}
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
                Hiện tại, tính năng ghép khung hình cuối chưa được bật: các đoạn sẽ được tạo độc
                lập và đồng thời, phù hợp với sản xuất hàng loạt nhanh chóng.
              </p>

              <div className="mt-4 flex gap-2">
                <button className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5">
                  biên tập
                </button>
                <button
                  onClick={() => generate(active.id)}
                  disabled={active.status === "generating"}
                  className="brand-btn rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {active.status === "generating" ? "Đang tạo…" : "phát ra"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* right: preview */}
        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="mb-3 flex gap-4 text-xs font-semibold text-gray-400">
              <button className="text-black">Xem trước</button>
              <button>vải bố</button>
              <span className="ml-auto flex items-center gap-1 text-gray-300">
                <button disabled className="cursor-not-allowed">
                  ⭳ Tải xuống phim đầy đủ
                </button>
              </span>
            </div>
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-lg bg-gray-100 text-center text-xs text-gray-400">
              {active?.status === "done" ? (
                <div className="p-4">
                  <div className="mb-2 text-2xl">▶</div>
                  Video đã sẵn sàng (demo)
                </div>
              ) : active?.status === "generating" ? (
                "Đang dựng video…"
              ) : (
                "Video đang chờ tạo"
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">00:00 / 05:39</p>
            <button className="mt-3 w-full rounded-full border border-black/10 py-2 text-xs font-medium hover:bg-black/5">
              Mở khung vẽ kịch bản
            </button>

            <div className="mt-5 border-t border-black/10 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Bảng phụ đề</p>
                  <p className="text-[11px] text-gray-400">{subtitleModel} · 82 mục</p>
                </div>
                <button className="rounded-full border border-black/10 px-3 py-1 text-[11px] font-medium hover:bg-black/5">
                  Xuất SRT
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* bottom filmstrip */}
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
              {s.status === "done" ? "✓" : s.status === "generating" ? "…" : "+"}
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

  if (l.tag === "subtitle_config" || l.tag === "bgm") {
    return (
      <div className="flex items-start gap-2 text-[11px] text-gray-500">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium">
          【{l.tag === "subtitle_config" ? "Phụ đề" : "BGM"}】
        </span>
        <span>{l.text}</span>
      </div>
    );
  }

  if (l.tag === "dialogue") {
    return (
      <div className="flex items-start gap-2 text-sm">
        {badge}
        <p>
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            Đối thoại · chậm rõ · đồng bộ phụ đề
          </span>{" "}
          <span className="font-semibold">{l.character}</span>
          {l.direction && <span className="text-gray-400"> ({l.direction})</span>}: {l.text}
        </p>
      </div>
    );
  }

  // visual
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
