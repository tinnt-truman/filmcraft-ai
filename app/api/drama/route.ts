import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

// GET /api/drama — danh sách dự án của user (filter status, search — khớp
// tabs ở app/drama/page.tsx: all/in_progress/completed/draft).
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const projects = await prisma.dramaProject.findMany({
    where: {
      userId,
      ...(status && status !== "all" ? { status: status.toUpperCase() as never } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { summary: true, _count: { select: { episodes: true, characters: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return apiOk({ projects });
});

const CreateDramaSchema = z.object({
  title: z.string().min(1),
  style: z.string().optional(),
  coverGradient: z.string().optional(),
});

// POST /api/drama — tạo dự án mới (title, style ban đầu).
export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateDramaSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu tạo dự án không hợp lệ.", parsed.error.flatten());
  }

  const project = await prisma.dramaProject.create({
    data: {
      userId,
      title: parsed.data.title,
      coverGradient: parsed.data.coverGradient ?? "from-slate-400 to-slate-700",
      status: "DRAFT",
      summary: {
        create: {
          episodeCount: 0,
          storyGenre: parsed.data.style ?? "",
          targetAudience: "",
          coreHook: "",
          logline: "",
          fullSummary: "",
          visualStyle: parsed.data.style ?? "",
        },
      },
    },
    include: { summary: true },
  });

  return apiOk(project, 201);
});
