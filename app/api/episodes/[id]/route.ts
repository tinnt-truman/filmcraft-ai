import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } }, include: { scenes: { include: { shots: { include: { dialogue: true } } } } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy tập", 404);
  return NextResponse.json(e);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  const data: Record<string, unknown> = {
    title: b.title,
    summary: b.summary,
    scriptRaw: b.scriptRaw,
    ratio: b.ratio,
    resolution: b.resolution,
    videoModel: b.videoModel,
    subtitleMode: b.subtitleMode,
    stitchEnabled: b.stitchEnabled,
  };
  const upd = await prisma.episode.update({ where: { id }, data });
  return NextResponse.json(upd);
}
