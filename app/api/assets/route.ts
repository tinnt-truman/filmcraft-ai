import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

// GET /api/assets?category=&projectId=&scope= — khớp bộ lọc Tất cả/Vai trò/
// Bối cảnh/Đạo cụ/Âm sắc và 3 nút phạm vi (Dự án phim/Lịch sử khoa học/
// Trung tâm cá nhân — "Trung tâm cá nhân" = projectId null, dùng chung).
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category"); // CHARACTER | SCENE | PROP | VOICE
  const projectId = searchParams.get("projectId");
  const scope = searchParams.get("scope"); // "personal" -> projectId null

  const assets = await prisma.asset.findMany({
    where: {
      userId,
      ...(category ? { category: category.toUpperCase() as never } : {}),
      ...(scope === "personal" ? { projectId: null } : projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return apiOk({ assets });
});

const CreateAssetSchema = z.object({
  category: z.enum(["CHARACTER", "SCENE", "PROP", "VOICE"]),
  name: z.string().min(1),
  projectId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// POST /api/assets
export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu tài sản không hợp lệ.", parsed.error.flatten());
  }

  const asset = await prisma.asset.create({
    data: {
      userId,
      category: parsed.data.category,
      name: parsed.data.name,
      projectId: parsed.data.projectId ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      metadata: (parsed.data.metadata ?? {}) as never,
    },
  });
  return apiOk(asset, 201);
});
