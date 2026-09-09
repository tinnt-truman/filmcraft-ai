import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";
import type { JobType } from "@prisma/client";

const MAP: Record<string, JobType> = { "text-to-image": "SHOT_IMAGE", "image-to-image": "SHOT_IMAGE", "image-to-product": "SHOT_IMAGE", "text-to-video": "SHOT_VIDEO", "video-to-video": "SHOT_VIDEO" };

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const type = MAP[slug] ?? "SHOT_IMAGE";
  const body = await req.json().catch(() => ({}));
  const u = await requireUser();
  if (!u) {
    void body;
    void type;
    return NextResponse.json({ jobId: `demo-${randomUUID()}`, demo: true, resultUrl: "https://picsum.photos/seed/tool/768/512" }, { status: 201 });
  }
  try {
    const cost = await holdForJob(u.id, type);
    const job = await prisma.generationJob.create({ data: { userId: u.id, type, status: "QUEUED", targetType: "Tool", targetId: slug, estimatedCost: cost, requestPayload: body } });
    completeJobAsync(job.id);
    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (e: unknown) {
    return err((e as { code?: string }).code ?? "ERR", (e as Error).message, (e as { status?: number }).status ?? 500);
  }
}
