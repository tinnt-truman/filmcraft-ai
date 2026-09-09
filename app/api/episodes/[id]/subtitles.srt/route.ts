import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

function fmt(t: number) {
  const m = Math.floor(t / 60); const s = Math.floor(t % 60);
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},000`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const segs = await prisma.segment.findMany({ where: { episodeId: id, episode: { project: { userId: u.id } } }, orderBy: { order: "asc" }, include: { lines: { orderBy: { order: "asc" } } } });
  let t = 0; let n = 0; const out: string[] = [];
  for (const s of segs) for (const l of s.lines) {
    if (l.tag !== "DIALOGUE") continue;
    n += 1; const d = l.durationSec || 4;
    out.push(`${n}\n${fmt(t)} --> ${fmt(t + d)}\n${l.characterName ?? ""}: ${l.text}\n`);
    t += d;
  }
  return new NextResponse(out.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": "attachment; filename=subtitles.srt" } });
}
