import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { findOwnedEpisode } from "@/lib/ownership";

// GET /api/episodes/:id/segments — danh sách segment + lines (filmstrip +
// panel giữa của màn hình editor cấp đoạn).
export const GET = withAuth(async (_req, { userId, params }) => {
  const episode = await findOwnedEpisode(userId, params.id);
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");

  const segments = await prisma.segment.findMany({
    where: { episodeId: episode.id },
    orderBy: { order: "asc" },
    include: { lines: { orderBy: { order: "asc" } } },
  });

  return apiOk({
    episode: {
      id: episode.id,
      title: episode.title,
      summary: episode.summary,
      ratio: episode.ratio,
      resolution: episode.resolution,
      videoModel: episode.videoModel,
      subtitleMode: episode.subtitleMode,
      stitchEnabled: episode.stitchEnabled,
    },
    segments,
  });
});
