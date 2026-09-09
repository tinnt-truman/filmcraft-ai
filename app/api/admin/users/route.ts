import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/routeAuth";
import { apiOk } from "@/lib/apiError";

// GET /api/admin/users — danh sách user kèm ví + role (tìm theo email/tên).
export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      wallet: { select: { balance: true, heldAmount: true } },
      _count: { select: { dramaProjects: true, videoProjects: true, jobs: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return apiOk({ users });
});
