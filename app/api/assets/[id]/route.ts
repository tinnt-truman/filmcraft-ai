import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { findOwnedAsset } from "@/lib/ownership";

const UpdateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// PATCH /api/assets/:id
export const PATCH = withAuth(async (req, { userId, params }) => {
  const asset = await findOwnedAsset(userId, params.id);
  if (!asset) return apiError(404, "NOT_FOUND", "Không tìm thấy tài sản.");

  const body = await req.json().catch(() => null);
  const parsed = UpdateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());
  }

  const updated = await prisma.asset.update({
    where: { id: params.id },
    data: { ...parsed.data, metadata: parsed.data.metadata as never },
  });
  return apiOk(updated);
});

// DELETE /api/assets/:id
export const DELETE = withAuth(async (_req, { userId, params }) => {
  const asset = await findOwnedAsset(userId, params.id);
  if (!asset) return apiError(404, "NOT_FOUND", "Không tìm thấy tài sản.");

  await prisma.asset.delete({ where: { id: params.id } });
  return apiOk({ ok: true });
});
