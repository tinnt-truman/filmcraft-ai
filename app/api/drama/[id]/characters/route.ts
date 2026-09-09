import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

const CreateCharacterSchema = z.object({
  name: z.string().min(1),
  characterType: z.enum(["PROTAGONIST", "DEUTERAGONIST", "ANTAGONIST", "SUPPORTING", "GROUP"]).optional(),
  visualDescription: z.string().optional(),
  coreTags: z.array(z.string()).optional(),
  background: z.string().optional(),
  personality: z.string().optional(),
});

// POST /api/drama/:id/characters — thêm nhân vật (form "Nhân vật mới").
export const POST = withAuth(async (req, { userId, params }) => {
  const project = await prisma.dramaProject.findFirst({ where: { id: params.id, userId } });
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án.");

  const body = await req.json().catch(() => null);
  const parsed = CreateCharacterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu nhân vật không hợp lệ.", parsed.error.flatten());
  }

  const character = await prisma.character.create({
    data: {
      projectId: project.id,
      name: parsed.data.name,
      characterType: parsed.data.characterType ?? "SUPPORTING",
      visualDescription: parsed.data.visualDescription ?? "",
      coreTags: parsed.data.coreTags ?? [],
      background: parsed.data.background ?? "",
      personality: parsed.data.personality ?? "",
    },
  });

  return apiOk(character, 201);
});
