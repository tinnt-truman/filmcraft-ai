import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/routeAuth";
import { apiOk } from "@/lib/apiError";

// GET /api/admin/jobs — job gần đây trên toàn hệ thống (mọi user), để theo
// dõi vận hành (job lỗi, chi phí thực tế...).
export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const jobs = await prisma.generationJob.findMany({
    where: status ? { status: status.toUpperCase() as never } : undefined,
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return apiOk({ jobs });
});
