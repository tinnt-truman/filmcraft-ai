import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { llmGenerate, buildScriptPrompt } from "@/lib/ai";
import { holdForJob } from "@/lib/wallet";
import { completeJobAsync } from "@/lib/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } }, include: { project: { include: { summary: true, characters: true } } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  try {
    const cost = await holdForJob(u.id, "SCRIPT");
    const text = await llmGenerate(buildScriptPrompt({ title: e.project.title, genre: e.project.summary?.storyGenre ?? "", logline: e.project.summary?.logline ?? "", characters: e.project.characters.map((c) => c.name).join(", "), episodeIndex: e.index, episodeSummary: e.summary }), "Viết kịch bản tiếng Việt đúng khuôn mẫu Cảnh/△/thoại");
    await prisma.episode.update({ where: { id }, data: { scriptRaw: text } });
    const job = await prisma.generationJob.create({ data: { userId: u.id, type: "SCRIPT", status: "SUCCEEDED", targetType: "Episode", targetId: id, estimatedCost: cost, actualCost: cost } });
    const w = await prisma.wallet.findUnique({ where: { userId: u.id } });
    if (w) { const { settleJob } = await import("@/lib/wallet"); await settleJob(w.id, job.id, cost, cost); }
    void completeJobAsync;
    return NextResponse.json({ scriptRaw: text, jobId: job.id });
  } catch (e2: unknown) {
    return err((e2 as { code?: string }).code ?? "ERR", (e2 as Error).message, (e2 as { status?: number }).status ?? 500);
  }
}
