import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const list = await prisma.episode.findMany({ where: { projectId: id, project: { userId: u.id } }, orderBy: { index: "asc" }, include: { _count: { select: { scenes: true, segments: true } } } });
  return NextResponse.json(list.map((e) => ({ id: e.index, dbId: e.id, title: e.title, summary: e.summary, status: e.status })));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const p = await prisma.dramaProject.findFirst({ where: { id, userId: u.id } });
  if (!p) return err("NOT_FOUND", "Không tìm thấy", 404);
  const count = await prisma.episode.count({ where: { projectId: id } });
  const b = await req.json().catch(() => ({}));
  const e = await prisma.episode.create({ data: { projectId: id, index: count + 1, title: b.title ?? `Tập ${count + 1}`, summary: b.summary ?? "", scriptRaw: b.scriptRaw ?? "" } });
  return NextResponse.json(e, { status: 201 });
}
