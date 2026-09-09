import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

const UpdateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  characterType: z.enum(["PROTAGONIST", "DEUTERAGONIST", "ANTAGONIST", "SUPPORTING", "GROUP"]).optional(),
  visualDescription: z.string().optional(),
  coreTags: z.array(z.string()).optional(),
  background: z.string().optional(),
  personality: z.string().optional(),
  referenceImageUrl: z.string().nullable().optional(),
});

async function findOwnedCharacter(userId: string, id: string) {
  return prisma.character.findFirst({
    where: { id, project: { userId } },
  });
}

// PATCH /api/characters/:id
export const PATCH = withAuth(async (req, { userId, params }) => {
  const character = await findOwnedCharacter(userId, params.id);
  if (!character) return apiError(404, "NOT_FOUND", "Không tìm thấy nhân vật.");

  const body = await req.json().catch(() => null);
  const parsed = UpdateCharacterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu nhân vật không hợp lệ.", parsed.error.flatten());
  }

  const updated = await prisma.character.update({ where: { id: params.id }, data: parsed.data });
  return apiOk(updated);
});

// DELETE /api/characters/:id
export const DELETE = withAuth(async (_req, { userId, params }) => {
  const character = await findOwnedCharacter(userId, params.id);
  if (!character) return apiError(404, "NOT_FOUND", "Không tìm thấy nhân vật.");

  await prisma.character.delete({ where: { id: params.id } });
  return apiOk({ ok: true });
});
