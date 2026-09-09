import { prisma } from "../lib/db";
import { hashPw } from "../lib/password";
import { dramaProjects, episodes, characterAssets, videoProjects, getSegmentsForEpisode } from "../lib/mockData";

async function main() {
  const email = "demo@filmcraft.ai";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, passwordHash: await hashPw("demo1234"), name: "Demo" },
    });
    await prisma.wallet.create({ data: { userId: user.id, balance: 200000 } });
  }
  for (const p of dramaProjects) {
    let proj = await prisma.dramaProject.findFirst({ where: { userId: user.id, title: p.title } });
    if (!proj) {
      proj = await prisma.dramaProject.create({
        data: {
          userId: user.id,
          title: p.title,
          coverGradient: p.cover,
          status: p.status === "in_progress" ? "IN_PROGRESS" : p.status === "completed" ? "COMPLETED" : "DRAFT",
        },
      });
      await prisma.projectSummary.create({
        data: {
          projectId: proj.id,
          episodeCount: p.episodeCount,
          storyGenre: p.style,
          targetAudience: "Đại chúng",
          coreHook: p.synopsis.slice(0, 80),
          logline: p.synopsis,
          fullSummary: p.synopsis,
          visualStyle: p.style,
        },
      });
      for (const c of characterAssets) {
        await prisma.character.create({
          data: { projectId: proj.id, name: c.name, characterType: "SUPPORTING", visualDescription: `${c.role} · ${c.tag}`, coreTags: [c.role], background: c.role, personality: c.tag },
        });
      }
      for (const e of episodes.slice(0, p.episodeCount)) {
        const ep = await prisma.episode.create({
          data: { projectId: proj.id, index: e.id, title: e.title, summary: e.summary, scriptRaw: `### Cảnh ${e.id}-1\nTối Ngoại ${p.title}・Bối cảnh chính\nNhân vật xuất hiện: Lina\n△ Toàn cảnh: ${e.summary}\nLina (tự nhủ): ${e.summary}` },
        });
        const segs = getSegmentsForEpisode(e.id);
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          const seg = await prisma.segment.create({ data: { episodeId: ep.id, order: i, title: s.title, durationSec: s.durationSec, status: "PENDING" } });
          for (let j = 0; j < s.lines.length; j++) {
            const l = s.lines[j];
            await prisma.segmentLine.create({
              data: { segmentId: seg.id, order: j, tag: l.tag.toUpperCase() as "SUBTITLE_CONFIG" | "BGM" | "DIALOGUE" | "VISUAL", durationSec: l.durationSec, characterName: l.character, direction: l.direction, shotType: l.shotType, text: l.text },
            });
          }
        }
      }
    }
  }
  for (const v of videoProjects) {
    const ex = await prisma.videoProject.findFirst({ where: { userId: user.id, title: v.title } });
    if (!ex) await prisma.videoProject.create({ data: { userId: user.id, title: v.title, status: v.status.toUpperCase() as "DRAFT", templateId: v.template, topic: v.title, ratio: v.ratio } });
  }
  console.log("seed ok:", email, "demo1234");
}

main().finally(() => process.exit(0));
