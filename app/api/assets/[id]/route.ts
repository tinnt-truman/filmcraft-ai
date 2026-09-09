import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const a = await prisma.asset.findFirst({ where: { id, userId: u.id } });
  if (!a) return err("NOT_FOUND", "Không tìm thấy", 404);
  return NextResponse.json(await prisma.asset.update({ where: { id }, data: { name: b.name, imageUrl: b.imageUrl, metadata: b.metadata, projectId: b.projectId } }));
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  await prisma.asset.deleteMany({ where: { id, userId: u.id } });
  return NextResponse.json({ ok: true });
}
