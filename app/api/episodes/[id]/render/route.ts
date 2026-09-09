import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } }, include: { segments: true } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  if (e.segments.some((s) => s.status === "GENERATING")) return err("BUSY", "Còn segment đang tạo, thử lại sau", 409);
  try {
    const cost = await holdForJob(u.id, "SHOT_VIDEO", 0);
    const job = await prisma.generationJob.create({ data: { userId: u.id, type: "SHOT_VIDEO", status: "QUEUED", targetType: "Episode", targetId: id, estimatedCost: cost } });
    await prisma.episode.update({ where: { id }, data: { status: "RENDERED" } });
    completeJobAsync(job.id);
    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (e2: unknown) {
    return err((e2 as { code?: string }).code ?? "ERR", (e2 as Error).message, (e2 as { status?: number }).status ?? 500);
  }
}
