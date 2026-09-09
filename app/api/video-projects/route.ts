import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

// GET /api/video-projects — danh sách dự án video ngắn AI của user.
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const projects = await prisma.videoProject.findMany({
    where: {
      userId,
      ...(status && status !== "all" ? { status: status.toUpperCase() as never } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return apiOk({ projects });
});

const CreateVideoProjectSchema = z.object({
  title: z.string().min(1).default("Video ngắn AI mới"),
  templateId: z.string().default("tpl6"),
  topic: z.string().default(""),
  durationRange: z.string().default("1-3"),
  audience: z.string().default(""),
  visualStyleId: z.string().default("s1"),
  characterStyleId: z.string().default("real"),
  voiceId: z.string().default("v1"),
  ratio: z.enum(["16:9", "9:16"]).default("16:9"),
});

// POST /api/video-projects — tạo dự án mới (bước 0 của wizard).
export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateVideoProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu dự án video không hợp lệ.", parsed.error.flatten());
  }

  const project = await prisma.videoProject.create({
    data: { userId, status: "DRAFT", ...parsed.data },
  });
  return apiOk(project, 201);
});
