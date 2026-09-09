// app/api/profile/route.ts — hồ sơ cá nhân của user hiện tại.
// GET  → thông tin tài khoản + số dư ví + số lượng dự án/tài sản (cho trang
//        Trung tâm cá nhân, tránh phải gọi nhiều endpoint riêng lẻ).
// PATCH → đổi tên hiển thị, và/hoặc đổi mật khẩu (yêu cầu mật khẩu hiện tại).

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

export const GET = withAuth(async (_req, { userId }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      wallet: { select: { balance: true, heldAmount: true } },
      _count: {
        select: { dramaProjects: true, videoProjects: true, assets: true, jobs: true },
      },
    },
  });
  if (!user) return apiError(404, "NOT_FOUND", "Không tìm thấy tài khoản.");

  const { wallet, _count, ...rest } = user;
  return apiOk({
    ...rest,
    wallet: {
      balance: wallet?.balance ?? 0,
      heldAmount: wallet?.heldAmount ?? 0,
      available: (wallet?.balance ?? 0) - (wallet?.heldAmount ?? 0),
    },
    counts: {
      dramaProjects: _count.dramaProjects,
      videoProjects: _count.videoProjects,
      assets: _count.assets,
      jobs: _count.jobs,
    },
  });
});

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự").max(72).optional(),
});

export const PATCH = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());
  }
  const { name, currentPassword, newPassword } = parsed.data;

  if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Cần nhập cả mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu."
    );
  }

  const data: { name?: string; passwordHash?: string } = {};
  if (name !== undefined) data.name = name;

  if (currentPassword && newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) return apiError(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return apiError(400, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng.");
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return apiError(400, "VALIDATION_ERROR", "Không có thay đổi nào để lưu.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return apiOk(updated);
});
