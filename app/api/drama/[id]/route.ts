import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

// GET /api/drama/:id — chi tiết dự án + summary + characters + episodes.
export const GET = withAuth(async (_req, { userId, params }) => {
  const project = await prisma.dramaProject.findFirst({
    where: { id: params.id, userId },
    include: {
      summary: true,
      characters: true,
      episodes: { orderBy: { index: "asc" } },
    },
  });
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án.");
  return apiOk(project);
});
