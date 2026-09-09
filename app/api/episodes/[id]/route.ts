import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { findOwnedEpisode } from "@/lib/ownership";

const UpdateEpisodeSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  scriptRaw: z.string().optional(), // nút "Chỉnh sửa văn bản chính"
});

// PATCH /api/episodes/:id — sửa scriptRaw tay (hoặc title/summary).
export const PATCH = withAuth(async (req, { userId, params }) => {
  const episode = await findOwnedEpisode(userId, params.id);
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");

  const body = await req.json().catch(() => null);
  const parsed = UpdateEpisodeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu tập phim không hợp lệ.", parsed.error.flatten());
  }

  const updated = await prisma.episode.update({ where: { id: params.id }, data: parsed.data });
  return apiOk(updated);
});
