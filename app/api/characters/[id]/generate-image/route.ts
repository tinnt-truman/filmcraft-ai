import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { createGenerationJob, settleJob } from "@/lib/jobs";
import { getImageProvider } from "@/lib/providers/image";

// POST /api/characters/:id/generate-image — sinh ảnh tham chiếu nhân vật.
export const POST = withAuth(async (_req, { userId, params }) => {
  const character = await prisma.character.findFirst({
    where: { id: params.id, project: { userId } },
    include: { project: { include: { summary: true } } },
  });
  if (!character) return apiError(404, "NOT_FOUND", "Không tìm thấy nhân vật.");

  const job = await createGenerationJob({
    userId,
    type: "CHARACTER_IMAGE",
    targetType: "Character",
    targetId: character.id,
    run: async (jobId) => {
      try {
        const provider = getImageProvider();
        const style = character.project.summary?.visualStyle ?? "";
        const prompt = `${character.visualDescription || character.name}. Phong cách: ${style}`;
        const { url } = await provider.generateImage({ prompt, ratio: "1:1" });
        await prisma.character.update({ where: { id: character.id }, data: { referenceImageUrl: url } });
        await settleJob(jobId, { status: "SUCCEEDED", resultUrl: url });
      } catch (err) {
        await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  return apiOk({ jobId: job.id, status: job.status }, 202);
});
