import { z } from "zod";
import { withPublic } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { runPublicTool } from "@/lib/publicToolRun";
import { getVideoProvider } from "@/lib/providers/video";

const Schema = z.object({
  sourceVideoUrl: z.string().min(1),
  transformDescription: z.string().min(1),
  intensity: z.enum(["yếu đuối", "ở giữa", "mạnh mẽ"]).default("ở giữa"),
});

export const POST = withPublic(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());

  const out = await runPublicTool({
    jobType: "SHOT_VIDEO",
    targetType: "Tool:video-to-video",
    execute: async () =>
      (await getVideoProvider()).generateVideo({
        text: `${parsed.data.transformDescription} (cường độ: ${parsed.data.intensity})`,
        referenceImage: [],
        referenceAudio: [],
        model: "Seedance 2.5",
        ratio: "16:9",
        resolution: "720p",
        duration: 8,
        generateAudio: false,
      }),
    resultUrlOf: (r) => r.url,
  });
  return apiOk(out, out.demo ? 200 : 202);
});
