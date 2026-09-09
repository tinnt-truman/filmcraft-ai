import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, AuthError } from "@/lib/auth";
import { apiError } from "@/lib/apiError";

function formatSrtTime(totalSec: number): string {
  const ms = Math.round((totalSec % 1) * 1000);
  const s = Math.floor(totalSec) % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

// GET /api/episodes/:id/subtitles.srt — xuất file phụ đề, ghép từ các
// SegmentLine loại "dialogue" của toàn bộ segment trong tập (nút "Xuất SRT").
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "UNAUTHORIZED", "Chưa đăng nhập.");
    throw err;
  }

  const { id } = await ctx.params;
  const episode = await prisma.episode.findFirst({
    where: { id, project: { userId } },
    include: { segments: { orderBy: { order: "asc" }, include: { lines: { orderBy: { order: "asc" } } } } },
  });
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");

  let cursor = 0;
  let index = 1;
  const blocks: string[] = [];

  for (const segment of episode.segments) {
    for (const line of segment.lines) {
      if (line.tag !== "VISUAL" && line.tag !== "DIALOGUE") continue;
      const start = cursor;
      cursor += line.durationSec || 0;
      if (line.tag !== "DIALOGUE") continue;
      const who = line.characterName ? `${line.characterName}: ` : "";
      blocks.push(`${index}\n${formatSrtTime(start)} --> ${formatSrtTime(cursor)}\n${who}${line.text}\n`);
      index += 1;
    }
  }

  const srt = blocks.join("\n");
  return new NextResponse(srt, {
    status: 200,
    headers: {
      "Content-Type": "application/x-subrip; charset=utf-8",
      "Content-Disposition": `attachment; filename="${episode.title.replace(/[^a-zA-Z0-9-_]+/g, "_")}.srt"`,
    },
  });
}
