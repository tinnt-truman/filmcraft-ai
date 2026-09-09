import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const c = await prisma.character.findFirst({ where: { id, project: { userId: u.id } } });
  if (!c) return err("NOT_FOUND", "Không tìm thấy nhân vật", 404);
  const upd = await prisma.character.update({ where: { id }, data: { name: b.name, characterType: b.characterType, visualDescription: b.visualDescription, coreTags: b.coreTags, background: b.background, personality: b.personality } });
  return NextResponse.json(upd);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const c = await prisma.character.findFirst({ where: { id, project: { userId: u.id } } });
  if (!c) return err("NOT_FOUND", "Không tìm thấy", 404);
  await prisma.character.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
