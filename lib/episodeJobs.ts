// lib/episodeJobs.ts — logic dùng chung để enqueue sinh video cho 1 Segment,
// và điều phối "phát ra" từng đoạn / "Tái lập kịch bản bằng AI" (toàn tập) /
// "render" (toàn tập) — dùng chung giữa các route trong app/api/segments/**
// và app/api/episodes/**.

import { prisma } from "./prisma";
import { createGenerationJob, settleJob } from "./jobs";
import { assembleSeedanceRequest, type AssemblerAsset, type AssemblerLine } from "./promptAssembler";
import { validateSegmentForGenerate } from "./segmentValidate";
import { getVideoProvider } from "./providers/video";

export class ValidationFailedError extends Error {
  constructor(public errors: { code: string; message: string; details?: unknown }[]) {
    super("Segment chưa hợp lệ để tạo video.");
  }
}

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

function assetMetaVoiceUrl(asset: { category: string; metadata: unknown }): string | null {
  const meta = (asset.metadata ?? {}) as Record<string, unknown>;
  if (asset.category === "VOICE") return (meta.audioUrl as string) ?? null;
  if (asset.category === "CHARACTER") return (meta.voiceAudioUrl as string) ?? null;
  return null;
}

async function loadAssetsById(projectId: string): Promise<Record<string, AssemblerAsset>> {
  const assets = await prisma.asset.findMany({ where: { projectId } });
  const map: Record<string, AssemblerAsset> = {};
  for (const a of assets) {
    map[a.id] = {
      id: a.id,
      name: a.name,
      category: a.category as AssemblerAsset["category"],
      imageUrl: a.imageUrl,
      voiceUrl: assetMetaVoiceUrl(a),
    };
  }
  return map;
}

function toAssemblerLines(
  lines: { order: number; tag: string; durationSec: number; characterName: string | null; direction: string | null; shotType: string | null; text: string }[]
): AssemblerLine[] {
  return lines.map((l) => ({
    order: l.order,
    tag: l.tag as AssemblerLine["tag"],
    durationSec: l.durationSec,
    characterName: l.characterName,
    direction: l.direction,
    shotType: l.shotType,
    text: l.text,
  }));
}

export type GenerateSegmentResult = { jobId: string; done: Promise<void> };

/**
 * Validate + tính phí + hold ví + lắp prompt + enqueue job sinh video cho 1
 * Segment. Trả về jobId (để FE poll qua GET /api/jobs/:id) và promise `done`
 * (resolve sau khi job settle — dùng nội bộ để nối tuần tự khi "Chuyển đổi
 * giữa các camera" được bật).
 */
export async function generateSegment(
  userId: string,
  segmentId: string,
  opts: { waitFor?: Promise<unknown>; extraReferenceImage?: string | null } = {}
): Promise<GenerateSegmentResult> {
  const segment = await prisma.segment.findFirst({
    where: { id: segmentId, episode: { project: { userId } } },
    include: { lines: { orderBy: { order: "asc" } }, episode: { include: { project: { include: { summary: true } } } } },
  });
  if (!segment) throw new NotFoundError(`Không tìm thấy đoạn ${segmentId}.`);

  if (segment.status === "GENERATING") {
    throw new ConflictError(`Đoạn ${segment.title} đang được tạo, vui lòng đợi.`);
  }

  const episode = segment.episode;
  const project = episode.project;
  const ratio = episode.ratio ?? "9:16";
  const resolution = episode.resolution ?? "720p";
  const model = episode.videoModel ?? "Seedance 2.5";
  const subtitleMode = (episode.subtitleMode as "auto" | "post" | null) ?? "auto";
  const visualStyle = project.summary?.visualStyle ?? project.title;

  const assemblerLines = toAssemblerLines(segment.lines);
  const assetsById = await loadAssetsById(project.id);

  const validationErrors = validateSegmentForGenerate({
    lines: assemblerLines,
    assetsById,
    ratio,
    resolution,
    model,
    visualStyle,
  });
  if (validationErrors.length > 0) throw new ValidationFailedError(validationErrors);

  const request = assembleSeedanceRequest({
    lines: assemblerLines,
    visualStyle,
    assetsById,
    model,
    ratio,
    resolution,
    segmentDurationSecFallback: segment.durationSec,
    subtitleMode,
  });

  if (opts.extraReferenceImage) {
    // Nối khung hình cuối: đính kèm làm reference_image bổ sung (không trộn
    // với first_frame — 2 cơ chế loại trừ nhau, xem BACKEND_PROMPT.md).
    request.referenceImage = [...request.referenceImage, opts.extraReferenceImage];
  }

  await prisma.segment.update({ where: { id: segmentId }, data: { status: "GENERATING" } });

  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const job = await createGenerationJob({
    userId,
    type: "SHOT_VIDEO",
    targetType: "Segment",
    targetId: segment.id,
    segmentId: segment.id,
    provider: model.toLowerCase().includes("1.5") ? "seedance-1.5" : "seedance-2.5",
    requestPayload: request,
    run: async (jobId) => {
      try {
        if (opts.waitFor) await opts.waitFor;
        const videoProvider = await getVideoProvider();
        const result = await videoProvider.generateVideo(request);
        await prisma.segment.update({
          where: { id: segmentId },
          data: {
            status: "DONE",
            videoUrl: result.url,
            lastFrameUrl: result.lastFrameUrl,
          },
        });
        await settleJob(jobId, { status: "SUCCEEDED", resultUrl: result.url });
      } catch (err) {
        await prisma.segment.update({ where: { id: segmentId }, data: { status: "FAILED" } });
        await settleJob(jobId, {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        resolveDone();
      }
    },
  });

  return { jobId: job.id, done };
}

/**
 * "Tái lập kịch bản bằng AI" (episodes/:id/regenerate-all) — enqueue TOÀN
 * BỘ segment của tập theo thứ tự; chặn nếu còn segment đang GENERATING.
 * Nếu episode.stitchEnabled: sinh TUẦN TỰ, nối lastFrameUrl segment trước
 * làm reference_image bổ sung cho segment sau. Nếu tắt (mặc định): sinh
 * đồng thời (không chờ nhau) — enqueue hết rồi để hàng đợi tự xử lý.
 */
export async function regenerateAllSegments(userId: string, episodeId: string): Promise<{ jobIds: string[] }> {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, project: { userId } },
    include: { segments: { orderBy: { order: "asc" } } },
  });
  if (!episode) throw new NotFoundError(`Không tìm thấy tập phim ${episodeId}.`);

  const hasGenerating = episode.segments.some((s) => s.status === "GENERATING");
  if (hasGenerating) {
    throw new ConflictError("Còn đoạn đang được tạo trong tập này — vui lòng đợi hoàn tất trước khi tái lập toàn bộ.");
  }

  const jobIds: string[] = [];

  if (episode.stitchEnabled) {
    let chain: Promise<unknown> = Promise.resolve();
    let lastFrame: string | null = null;
    for (const seg of episode.segments) {
      const currentLastFrame: string | null = lastFrame;
      const { jobId, done } = await generateSegment(userId, seg.id, {
        waitFor: chain,
        extraReferenceImage: currentLastFrame,
      });
      jobIds.push(jobId);
      chain = done;
      // Best-effort: đợi job này xong để lấy lastFrameUrl cho segment kế tiếp.
      await done;
      const updated = await prisma.segment.findUnique({ where: { id: seg.id } });
      lastFrame = updated?.lastFrameUrl ?? currentLastFrame;
    }
  } else {
    for (const seg of episode.segments) {
      const { jobId } = await generateSegment(userId, seg.id);
      jobIds.push(jobId);
    }
  }

  return { jobIds };
}
