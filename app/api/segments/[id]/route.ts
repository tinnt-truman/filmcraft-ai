import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const s = await prisma.segment.findFirst({ where: { id, episode: { project: { userId: u.id } } } });
  if (!s) return err("NOT_FOUND", "Không tìm thấy segment", 404);
  if (s.status === "GENERATING") return err("BUSY", "Segment đang tạo, không sửa được", 409);
  const upd = await prisma.segment.update({ where: { id }, data: { title: b.title, durationSec: b.durationSec } });
  if (Array.isArray(b.lines)) {
    await prisma.segmentLine.deleteMany({ where: { segmentId: id } });
    for (let i = 0; i < b.lines.length; i++) {
      const l = b.lines[i];
      await prisma.segmentLine.create({ data: { segmentId: id, order: i, tag: String(l.tag).toUpperCase() as "VISUAL", durationSec: l.durationSec ?? 0, characterName: l.character ?? l.characterName, direction: l.direction, shotType: l.shotType, text: l.text ?? "" } });
    }
  }
  return NextResponse.json(upd);
}
