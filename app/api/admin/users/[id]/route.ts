import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

const PatchSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  grantBalance: z.number().int().positive().optional(),
});

// PATCH /api/admin/users/:id — đổi role (USER/ADMIN) và/hoặc cấp thêm tiền
// vào ví (ghi Transaction loại TOPUP, mô tả rõ là admin cấp tay).
export const PATCH = withAdmin(async (req, { userId: adminId, params }) => {
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return apiError(404, "NOT_FOUND", "Không tìm thấy user.");

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());
  }
  const { role, grantBalance } = parsed.data;

  if (role && role !== target.role && target.role === "ADMIN" && role === "USER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return apiError(409, "LAST_ADMIN", "Không thể hạ quyền admin cuối cùng trong hệ thống.");
    }
  }

  if (role) {
    await prisma.user.update({ where: { id: target.id }, data: { role } });
  }

  if (grantBalance) {
    const wallet = await prisma.wallet.upsert({
      where: { userId: target.id },
      update: { balance: { increment: grantBalance } },
      create: { userId: target.id, balance: grantBalance, heldAmount: 0 },
    });
    await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: "TOPUP",
        amount: grantBalance,
        description: `Admin (${adminId}) cấp tay ${grantBalance}đ`,
      },
    });
  }

  const updated = await prisma.user.findUnique({
    where: { id: target.id },
    select: { id: true, email: true, name: true, role: true, wallet: { select: { balance: true, heldAmount: true } } },
  });
  return apiOk(updated);
});
