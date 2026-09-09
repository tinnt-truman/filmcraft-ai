import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } }, include: { segments: { orderBy: { order: "asc" } } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  if (e.segments.some((s) => s.status === "GENERATING")) return err("BUSY", "Còn job đang GENERATING trong tập", 409);
  const jobIds: string[] = [];
  for (const s of e.segments) {
    try {
      const cost = await holdForJob(u.id, "SHOT_VIDEO");
      const job = await prisma.generationJob.create({ data: { userId: u.id, type: "SHOT_VIDEO", status: "QUEUED", targetType: "Segment", targetId: s.id, segmentId: s.id, estimatedCost: cost, provider: e.videoModel } });
      await prisma.segment.update({ where: { id: s.id }, data: { status: "GENERATING" } });
      completeJobAsync(job.id);
      jobIds.push(job.id);
      if (e.stitchEnabled) break;
    } catch {}
  }
  return NextResponse.json({ jobIds }, { status: 201 });
}
