import { apiError, apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { prisma } from "@/lib/prisma";
import { findOwnedEpisode } from "@/lib/ownership";
import { regenerateAllSegments } from "@/lib/episodeJobs";

// POST /api/episodes/:id/render — render video tập phim đầy đủ (enqueue
// sinh video cho toàn bộ segment chưa DONE của tập; xem lib/episodeJobs.ts
// cho cơ chế hàng đợi + nối khung hình).
export const POST = withAuth(async (_req, { userId, params }) => {
  const episode = await findOwnedEpisode(userId, params.id);
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");

  const segmentCount = await prisma.segment.count({ where: { episodeId: episode.id } });
  if (segmentCount === 0) {
    return apiError(
      422,
      "NO_SEGMENTS",
      "Tập phim chưa có đoạn (segment) nào — chạy AI phân cảnh / thêm đoạn trước khi render."
    );
  }

  const { jobIds } = await regenerateAllSegments(userId, episode.id);

  if (episode.stitchEnabled) {
    // Chế độ tuần tự: regenerateAllSegments() đã await từng đoạn xong mới
    // sang đoạn kế -> tới đây toàn bộ segment đã settle.
    await prisma.episode.update({ where: { id: episode.id }, data: { status: "RENDERED" } });
  }
  // Chế độ đồng thời (mặc định): job vẫn đang chạy nền — FE poll từng
  // jobId hoặc GET /api/episodes/:id/segments để biết tiến độ.

  return apiOk({ jobIds }, 202);
});
