import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { findOwnedVideoProject } from "@/lib/ownership";

// GET /api/video-projects/:id
export const GET = withAuth(async (_req, { userId, params }) => {
  const project = await prisma.videoProject.findFirst({
    where: { id: params.id, userId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án video.");
  return apiOk(project);
});

const UpdateVideoProjectSchema = z.object({
  title: z.string().min(1).optional(),
  templateId: z.string().optional(),
  topic: z.string().optional(),
  durationRange: z.string().optional(),
  audience: z.string().optional(),
  visualStyleId: z.string().optional(),
  characterStyleId: z.string().optional(),
  voiceId: z.string().optional(),
  ratio: z.enum(["16:9", "9:16"]).optional(),
  status: z.enum(["DRAFT", "GENERATING", "COMPLETED", "PUBLISHED"]).optional(),
});

// PATCH /api/video-projects/:id — lưu từng bước wizard (template -> input ->
// style).
export const PATCH = withAuth(async (req, { userId, params }) => {
  const project = await findOwnedVideoProject(userId, params.id);
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án video.");

  const body = await req.json().catch(() => null);
  const parsed = UpdateVideoProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());
  }

  const updated = await prisma.videoProject.update({ where: { id: params.id }, data: parsed.data });
  return apiOk(updated);
});
