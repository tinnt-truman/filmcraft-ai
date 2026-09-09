import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/routeAuth";
import { apiOk } from "@/lib/apiError";

// GET /api/admin/stats — số liệu tổng quan cho dashboard quản trị.
export const GET = withAdmin(async () => {
  const [userCount, dramaCount, videoCount, jobsByStatus, topupAgg] = await Promise.all([
    prisma.user.count(),
    prisma.dramaProject.count(),
    prisma.videoProject.count(),
    prisma.generationJob.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.transaction.aggregate({ where: { type: "TOPUP" }, _sum: { amount: true } }),
  ]);

  return apiOk({
    userCount,
    dramaCount,
    videoCount,
    jobsByStatus: Object.fromEntries(jobsByStatus.map((j) => [j.status, j._count._all])),
    totalTopupAmount: topupAgg._sum.amount ?? 0,
  });
});
