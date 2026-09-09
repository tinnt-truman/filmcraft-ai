import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

// GET /api/drama/:id/episodes — danh sách tập.
export const GET = withAuth(async (_req, { userId, params }) => {
  const project = await prisma.dramaProject.findFirst({ where: { id: params.id, userId } });
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án.");

  const episodes = await prisma.episode.findMany({
    where: { projectId: project.id },
    orderBy: { index: "asc" },
    include: { _count: { select: { scenes: true, segments: true } } },
  });

  return apiOk({ episodes });
});
