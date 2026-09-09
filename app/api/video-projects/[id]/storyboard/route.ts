import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { scenesSample } from "@/lib/mockData";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const v = await prisma.videoProject.findFirst({ where: { id, userId: u.id } });
  if (!v) return err("NOT_FOUND", "Không tìm thấy", 404);
  try {
    const cost = await holdForJob(u.id, "STORYBOARD");
    await prisma.videoScene.deleteMany({ where: { videoProjectId: id } });
    for (let i = 0; i < scenesSample.length; i++) {
      const s = scenesSample[i];
      await prisma.videoScene.create({ data: { videoProjectId: id, order: i, title: s.title, description: `${s.desc} — ${v.topic}`.slice(0, 500), startSec: i * 12, endSec: i * 12 + 12 } });
    }
    await prisma.videoProject.update({ where: { id }, data: { status: "GENERATING" } });
    const job = await prisma.generationJob.create({ data: { userId: u.id, type: "STORYBOARD", status: "QUEUED", targetType: "VideoProject", targetId: id, videoProjectId: id, estimatedCost: cost } });
    completeJobAsync(job.id);
    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (e: unknown) {
    return err((e as { code?: string }).code ?? "ERR", (e as Error).message, (e as { status?: number }).status ?? 500);
  }
}
