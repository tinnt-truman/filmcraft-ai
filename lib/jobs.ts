import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getWallet } from "@/lib/wallet";
import { fakeImageUrl } from "@/lib/ai";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function completeJobAsync(jobId: string) {
  after(async () => {
    try {
      await delay(2500);
      const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== "QUEUED" && job.status !== "RUNNING") return;
      await prisma.generationJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });
      const resultUrl = fakeImageUrl(jobId);
      await prisma.generationJob.update({ where: { id: jobId }, data: { status: "SUCCEEDED", actualCost: job.estimatedCost, resultUrl } });
      const w = await getWallet(job.userId);
      const { settleJob } = await import("@/lib/wallet");
      await settleJob(w.id, jobId, job.estimatedCost, job.estimatedCost);
      if (job.targetType === "Segment" && job.segmentId) {
        await prisma.segment.update({ where: { id: job.segmentId }, data: { status: "DONE", videoUrl: resultUrl, lastFrameUrl: resultUrl } });
      }
      if (job.targetType === "Character") {
        await prisma.character.update({ where: { id: job.targetId }, data: { referenceImageUrl: resultUrl } }).catch(() => null);
      }
      if (job.targetType === "VideoProject" && job.videoProjectId) {
        await prisma.videoProject.update({ where: { id: job.videoProjectId }, data: { status: "COMPLETED" } }).catch(() => null);
      }
    } catch {}
  });
}
