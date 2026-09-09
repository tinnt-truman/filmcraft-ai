import { apiError, apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { prisma } from "@/lib/prisma";
import { createGenerationJob, settleJob } from "@/lib/jobs";
import { getImageProvider } from "@/lib/providers/image";
import { getVideoProvider } from "@/lib/providers/video";

// POST /api/video-projects/:id/render — xuất video hoàn chỉnh: sinh ảnh +
// video cho từng VideoScene chưa có, rồi trả jobId để FE poll.
//
// Lưu ý (ghi trong docs/ARCHITECTURE.md): bản demo này KHÔNG ghép
// (concatenate) các đoạn video từng cảnh thành 1 file phim hoàn chỉnh bằng
// ffmpeg — mỗi VideoScene có videoUrl riêng; việc dựng hậu kỳ ghép cảnh cần
// bổ sung sau khi có provider video thật trả về file thật (không phải mock).
export const POST = withAuth(async (_req, { userId, params }) => {
  const project = await prisma.videoProject.findFirst({
    where: { id: params.id, userId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án video.");
  if (project.scenes.length === 0) {
    return apiError(422, "NO_SCENES", "Dự án chưa có bảng phân cảnh — chạy bước 'Bắt đầu tạo' trước.");
  }

  const job = await createGenerationJob({
    userId,
    type: "SHOT_VIDEO",
    targetType: "VideoProject",
    targetId: project.id,
    videoProjectId: project.id,
    run: async (jobId) => {
      try {
        await prisma.videoProject.update({ where: { id: project.id }, data: { status: "GENERATING" } });
        const imageProvider = getImageProvider();
        const videoProvider = getVideoProvider();

        for (const scene of project.scenes) {
          const { url: imageUrl } = await imageProvider.generateImage({
            prompt: `${scene.title}: ${scene.description}`,
            ratio: project.ratio,
          });
          const { url: videoUrl } = await videoProvider.generateVideo({
            text: `${scene.title}: ${scene.description}`,
            referenceImage: [imageUrl],
            referenceAudio: [],
            model: "Seedance 2.5",
            ratio: project.ratio,
            resolution: "720p",
            duration: Math.max(1, scene.endSec - scene.startSec),
            generateAudio: true,
          });
          await prisma.videoScene.update({ where: { id: scene.id }, data: { imageUrl, videoUrl } });
        }

        await prisma.videoProject.update({ where: { id: project.id }, data: { status: "PUBLISHED" } });
        await settleJob(jobId, { status: "SUCCEEDED" });
      } catch (err) {
        await prisma.videoProject.update({ where: { id: project.id }, data: { status: "COMPLETED" } });
        await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  return apiOk({ jobId: job.id, status: job.status }, 202);
});
