import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

// GET /api/jobs/:id — FE poll trạng thái job (thay cho setTimeout giả lập).
export const GET = withAuth(async (_req, { userId, params }) => {
  const job = await prisma.generationJob.findFirst({ where: { id: params.id, userId } });
  if (!job) return apiError(404, "NOT_FOUND", "Không tìm thấy job.");
  return apiOk(job);
});
