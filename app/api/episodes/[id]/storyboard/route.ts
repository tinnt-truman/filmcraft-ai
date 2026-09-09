import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { parseScriptRaw } from "@/lib/scriptParser";
import { holdForJob } from "@/lib/wallet";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const e = await prisma.episode.findFirst({ where: { id, project: { userId: u.id } } });
  if (!e) return err("NOT_FOUND", "Không tìm thấy", 404);
  try {
    const cost = await holdForJob(u.id, "STORYBOARD");
    const scenes = parseScriptRaw(e.scriptRaw, e.index);
    await prisma.scene.deleteMany({ where: { episodeId: id } });
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const sc = await prisma.scene.create({ data: { episodeId: id, sceneNumber: s.sceneNumber, timeOfDay: s.timeOfDay, interiorExterior: s.interiorExterior, location: s.location, subLocation: s.subLocation, charactersPresent: s.charactersPresent, order: i } });
      for (let j = 0; j < s.shots.length; j++) {
        const sh = s.shots[j];
        const shot = await prisma.shot.create({ data: { sceneId: sc.id, order: j, shotSize: sh.shotSize as "WIDE", description: sh.description } });
        for (let k = 0; k < sh.dialogues.length; k++) {
          const d = sh.dialogues[k];
          await prisma.dialogueLine.create({ data: { shotId: shot.id, characterName: d.characterName, direction: d.direction, text: d.text, order: k } });
        }
      }
    }
    await prisma.episode.update({ where: { id }, data: { status: "STORYBOARD_READY" } });
    const job = await prisma.generationJob.create({ data: { userId: u.id, type: "STORYBOARD", status: "SUCCEEDED", targetType: "Episode", targetId: id, estimatedCost: cost, actualCost: cost } });
    const w = await prisma.wallet.findUnique({ where: { userId: u.id } });
    if (w) { const { settleJob } = await import("@/lib/wallet"); await settleJob(w.id, job.id, cost, cost); }
    return NextResponse.json({ jobId: job.id, sceneCount: scenes.length });
  } catch (e2: unknown) {
    return err((e2 as { code?: string }).code ?? "ERR", (e2 as Error).message, (e2 as { status?: number }).status ?? 500);
  }
}
