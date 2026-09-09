import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { llmGenerate } from "@/lib/ai";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const p = await prisma.dramaProject.findFirst({ where: { id, userId: u.id }, include: { summary: true } });
  if (!p) return err("NOT_FOUND", "Không tìm thấy", 404);
  if (body.regenerate) {
    const text = await llmGenerate(`Tóm tắt phim ${p.title}`, "Bạn viết logline + fullSummary tiếng Việt");
    const s = await prisma.projectSummary.upsert({
      where: { projectId: id },
      create: { projectId: id, logline: text.slice(0, 300), fullSummary: text, visualStyle: body.visualStyle ?? "", episodeCount: body.episodeCount ?? 8, storyGenre: body.storyGenre ?? "", targetAudience: body.targetAudience ?? "", coreHook: body.coreHook ?? "" },
      update: { logline: text.slice(0, 300), fullSummary: text, ...(body.visualStyle ? { visualStyle: body.visualStyle } : {}) },
    });
    return NextResponse.json(s);
  }
  const s = await prisma.projectSummary.upsert({
    where: { projectId: id },
    create: { projectId: id, episodeCount: body.episodeCount ?? 8, storyGenre: body.storyGenre ?? "", targetAudience: body.targetAudience ?? "", coreHook: body.coreHook ?? "", logline: body.logline ?? "", fullSummary: body.fullSummary ?? "", visualStyle: body.visualStyle ?? "" },
    update: { episodeCount: body.episodeCount, storyGenre: body.storyGenre, targetAudience: body.targetAudience, coreHook: body.coreHook, logline: body.logline, fullSummary: body.fullSummary, visualStyle: body.visualStyle },
  });
  return NextResponse.json(s);
}
