import { z } from "zod";
import { withPublic } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { runPublicTool } from "@/lib/publicToolRun";
import { getVideoProvider } from "@/lib/providers/video";

const Schema = z.object({
  script: z.string().min(1),
  durationSec: z.enum(["5", "10", "15"]).default("10"),
  ratio: z.enum(["16:9", "9:16"]).default("16:9"),
});

export const POST = withPublic(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());

  const out = await runPublicTool({
    jobType: "SHOT_VIDEO",
    targetType: "Tool:text-to-video",
    execute: async () =>
      (await getVideoProvider()).generateVideo({
        text: parsed.data.script,
        referenceImage: [],
        referenceAudio: [],
        model: "Seedance 2.5",
        ratio: parsed.data.ratio,
        resolution: "720p",
        duration: Number(parsed.data.durationSec),
        generateAudio: true,
      }),
    resultUrlOf: (r) => r.url,
  });
  return apiOk(out, out.demo ? 200 : 202);
});
