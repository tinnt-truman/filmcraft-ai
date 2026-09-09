import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { findOwnedEpisode } from "@/lib/ownership";

const SettingsSchema = z.object({
  ratio: z.enum(["9:16", "16:9", "1:1"]).nullable().optional(),
  resolution: z.enum(["480p", "720p", "1080p"]).nullable().optional(),
  videoModel: z.enum(["Seedance 2.5", "Seedance 1.5"]).nullable().optional(),
  subtitleMode: z.enum(["auto", "post"]).nullable().optional(),
  stitchEnabled: z.boolean().optional(),
});

// PATCH /api/episodes/:id/settings — lưu ratio/resolution/videoModel/
// subtitleMode/stitchEnabled cấp tập (kế thừa mặc định dự án nếu chưa set).
export const PATCH = withAuth(async (req, { userId, params }) => {
  const episode = await findOwnedEpisode(userId, params.id);
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");

  const body = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Cài đặt không hợp lệ.", parsed.error.flatten());
  }

  const updated = await prisma.episode.update({ where: { id: params.id }, data: parsed.data });
  return apiOk(updated);
});
