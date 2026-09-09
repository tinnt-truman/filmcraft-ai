import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { validateSegment, buildSeedancePrompt } from "@/lib/seedance";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const seg = await prisma.segment.findFirst({ where: { id, episode: { project: { userId: u.id } } }, include: { lines: true, episode: { include: { project: { include: { summary: true } } } } } });
  if (!seg) return err("NOT_FOUND", "Không tìm thấy", 404);
  if (seg.status === "GENERATING") return err("BUSY", "Segment đang tạo", 409);
  const assets = await prisma.asset.findMany({ where: { userId: u.id } });
  const v = validateSegment(seg.lines.map((l) => ({ tag: l.tag, durationSec: l.durationSec, characterName: l.characterName, text: l.text })), assets.map((a) => ({ id: a.id, name: a.name, imageUrl: a.imageUrl })));
  if (v.errors.length) return err("VALIDATION", v.errors.join("; "), 422);
  if (v.missing.length) return err("ASSET_MISSING", "Thiếu tài sản: " + v.missing.join(", "), 422);
  if (!seg.episode.ratio || !seg.episode.resolution) return err("VALIDATION", "Chưa cấu hình ratio/resolution", 422);
  try {
    const bgm = seg.lines.find((l) => l.tag === "BGM")?.text ?? "";
    const prompt = buildSeedancePrompt({ visualStyle: seg.episode.project.summary?.visualStyle ?? "", subtitleMode: seg.episode.subtitleMode, bgm, voices: [], looks: [], places: [], body: seg.lines.map((l) => l.text).join("\n") });
    const cost = await holdForJob(u.id, "SHOT_VIDEO");
    const running = await prisma.generationJob.count({ where: { userId: u.id, status: { in: ["QUEUED", "RUNNING"] }, type: "SHOT_VIDEO" } });
    if (running >= 10) return err("QUEUE_FULL", "Hàng đợi đầy (tối đa 10 job song song)", 429);
    let payload = { model: seg.episode.videoModel, ratio: seg.episode.ratio, resolution: seg.episode.resolution, duration: v.total || seg.durationSec, generate_audio: seg.lines.some((l) => l.tag === "DIALOGUE"), text: prompt, reference_image: [] as string[], reference_audio: [] as string[], first_frame: undefined as string | undefined };
    if (seg.episode.stitchEnabled) {
      const prev = await prisma.segment.findFirst({ where: { episodeId: seg.episodeId, order: { lt: seg.order } }, orderBy: { order: "desc" } });
      if (prev?.lastFrameUrl) {
        if (v.assetIds.length) payload = { ...payload, reference_image: [prev.lastFrameUrl] };
        else payload = { ...payload, first_frame: prev.lastFrameUrl };
      }
    }
    const job = await prisma.generationJob.create({ data: { userId: u.id, type: "SHOT_VIDEO", status: "QUEUED", targetType: "Segment", targetId: seg.id, segmentId: seg.id, estimatedCost: cost, provider: seg.episode.videoModel, requestPayload: payload } });
    await prisma.segment.update({ where: { id }, data: { status: "GENERATING" } });
    completeJobAsync(job.id);
    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (e: unknown) {
    return err((e as { code?: string }).code ?? "ERR", (e as Error).message, (e as { status?: number }).status ?? 500);
  }
}
