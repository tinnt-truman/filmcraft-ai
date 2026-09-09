import { apiError, apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { prisma } from "@/lib/prisma";
import { findOwnedEpisode } from "@/lib/ownership";
import { createGenerationJob, settleJob } from "@/lib/jobs";
import { parseScriptRaw } from "@/lib/scriptParser";

// POST /api/episodes/:id/storyboard — nút "AI phân cảnh": parse scriptRaw ->
// tạo Scene/Shot/DialogueLine, trả về jobId để FE poll.
export const POST = withAuth(async (_req, { userId, params }) => {
  const episode = await findOwnedEpisode(userId, params.id);
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");
  if (!episode.scriptRaw?.trim()) {
    return apiError(422, "EMPTY_SCRIPT", "Tập phim chưa có kịch bản (scriptRaw) để phân cảnh.");
  }

  const job = await createGenerationJob({
    userId,
    type: "STORYBOARD",
    targetType: "Episode",
    targetId: episode.id,
    run: async (jobId) => {
      try {
        const scenes = parseScriptRaw(episode.scriptRaw);
        if (scenes.length === 0) {
          throw new Error("Không phân tích được cảnh nào từ scriptRaw — kiểm tra định dạng kịch bản.");
        }

        await prisma.$transaction([
          prisma.scene.deleteMany({ where: { episodeId: episode.id } }),
          ...scenes.map((scene) =>
            prisma.scene.create({
              data: {
                episodeId: episode.id,
                sceneNumber: scene.sceneNumber,
                order: scene.order,
                timeOfDay: scene.timeOfDay,
                interiorExterior: scene.interiorExterior,
                location: scene.location,
                subLocation: scene.subLocation,
                charactersPresent: scene.charactersPresent,
                shots: {
                  create: scene.shots.map((shot) => ({
                    order: shot.order,
                    shotSize: shot.shotSize,
                    description: shot.description,
                    dialogue: {
                      create: shot.dialogue.map((d) => ({
                        order: d.order,
                        characterName: d.characterName,
                        direction: d.direction,
                        text: d.text,
                      })),
                    },
                  })),
                },
              },
            })
          ),
        ]);

        await prisma.episode.update({ where: { id: episode.id }, data: { status: "STORYBOARD_READY" } });
        await settleJob(jobId, { status: "SUCCEEDED" });
      } catch (err) {
        await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  return apiOk({ jobId: job.id, status: job.status }, 202);
});
