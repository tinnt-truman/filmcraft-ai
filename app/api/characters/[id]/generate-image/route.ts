import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const c = await prisma.character.findFirst({ where: { id, project: { userId: u.id } } });
  if (!c) return err("NOT_FOUND", "Không tìm thấy", 404);
  try {
    const cost = await holdForJob(u.id, "CHARACTER_IMAGE");
    const job = await prisma.generationJob.create({ data: { userId: u.id, type: "CHARACTER_IMAGE", status: "QUEUED", targetType: "Character", targetId: id, estimatedCost: cost } });
    completeJobAsync(job.id);
    return NextResponse.json({ jobId: job.id, estimatedCost: cost }, { status: 201 });
  } catch (e: unknown) {
    const s = (e as { status?: number }).status ?? 500;
    return err((e as { code?: string }).code ?? "WALLET", (e as Error).message, s);
  }
}
