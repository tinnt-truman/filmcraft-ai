import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const v = await prisma.videoProject.findFirst({ where: { id, userId: u.id }, include: { scenes: { orderBy: { order: "asc" } } } });
  if (!v) return err("NOT_FOUND", "Không tìm thấy", 404);
  return NextResponse.json(v);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const v = await prisma.videoProject.findFirst({ where: { id, userId: u.id } });
  if (!v) return err("NOT_FOUND", "Không tìm thấy", 404);
  const data: Record<string, unknown> = { title: b.title, templateId: b.templateId, topic: b.topic, durationRange: b.durationRange, audience: b.audience, visualStyleId: b.visualStyleId, characterStyleId: b.characterStyleId, voiceId: b.voiceId, ratio: b.ratio };
  if (b.status !== undefined) data.status = b.status?.toUpperCase();
  const upd = await prisma.videoProject.update({ where: { id }, data });
  return NextResponse.json(upd);
}
