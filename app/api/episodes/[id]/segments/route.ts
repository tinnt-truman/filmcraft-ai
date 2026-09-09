import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  const segs = await prisma.segment.findMany({ where: { episodeId: id }, orderBy: { order: "asc" }, include: { lines: { orderBy: { order: "asc" } } } });
  return NextResponse.json(segs.map((s) => ({ id: s.order + 1, dbId: s.id, title: s.title, durationSec: s.durationSec, status: s.status === "GENERATING" ? "generating" : s.status === "DONE" ? "done" : s.status === "FAILED" ? "failed" : "pending", videoUrl: s.videoUrl, lines: s.lines.map((l) => ({ id: l.id, durationSec: l.durationSec, tag: l.tag.toLowerCase(), character: l.characterName, direction: l.direction, shotType: l.shotType, text: l.text })) })));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  const upd = await prisma.episode.update({ where: { id }, data: { ratio: b.ratio, resolution: b.resolution, videoModel: b.videoModel, subtitleMode: b.subtitleMode, stitchEnabled: b.stitchEnabled } });
  return NextResponse.json(upd);
}
