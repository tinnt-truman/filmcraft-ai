import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const p = await prisma.dramaProject.findFirst({ where: { id, userId: u.id } });
  if (!p) return err("NOT_FOUND", "Không tìm thấy", 404);
  const b = await req.json().catch(() => ({}));
  if (!b.name) return err("VALIDATION", "Thiếu name", 422);
  const c = await prisma.character.create({ data: { projectId: id, name: b.name, characterType: b.characterType ?? "SUPPORTING", visualDescription: b.visualDescription ?? "", coreTags: b.coreTags ?? [], background: b.background ?? "", personality: b.personality ?? "" } });
  return NextResponse.json(c, { status: 201 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const list = await prisma.character.findMany({ where: { projectId: id, project: { userId: u.id } } });
  return NextResponse.json(list);
}
