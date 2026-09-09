import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { findOwnedSegment } from "@/lib/ownership";

const LineSchema = z.object({
  order: z.number().int(),
  tag: z.enum(["SUBTITLE_CONFIG", "BGM", "DIALOGUE", "VISUAL"]),
  durationSec: z.number().int().min(0).default(0),
  characterName: z.string().nullable().optional(),
  direction: z.string().nullable().optional(),
  shotType: z.string().nullable().optional(),
  text: z.string(),
});

const UpdateSegmentSchema = z.object({
  title: z.string().min(1).optional(),
  durationSec: z.number().int().min(1).max(30).optional(),
  lines: z.array(LineSchema).optional(), // gửi toàn bộ mảng lines mới -> thay thế hết
});

// PATCH /api/segments/:id — sửa tay nội dung / durationSec / thêm-xoá dòng
// của 1 đoạn (gửi `lines` để thay thế toàn bộ danh sách dòng).
export const PATCH = withAuth(async (req, { userId, params }) => {
  const segment = await findOwnedSegment(userId, params.id);
  if (!segment) return apiError(404, "NOT_FOUND", "Không tìm thấy đoạn.");
  if (segment.status === "GENERATING") {
    return apiError(409, "CONFLICT", "Đoạn đang được tạo video, không thể chỉnh sửa lúc này.");
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSegmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu đoạn không hợp lệ.", parsed.error.flatten());
  }

  const { lines, ...rest } = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(rest).length > 0) {
      await tx.segment.update({ where: { id: params.id }, data: rest });
    }
    if (lines) {
      await tx.segmentLine.deleteMany({ where: { segmentId: params.id } });
      await tx.segmentLine.createMany({
        data: lines.map((l) => ({ ...l, segmentId: params.id })),
      });
      // Sửa tay -> trạng thái quay lại PENDING (video cũ không còn khớp nội dung).
      await tx.segment.update({ where: { id: params.id }, data: { status: "PENDING", videoUrl: null } });
    }
  });

  const updated = await prisma.segment.findUniqueOrThrow({
    where: { id: params.id },
    include: { lines: { orderBy: { order: "asc" } } },
  });
  return apiOk(updated);
});
