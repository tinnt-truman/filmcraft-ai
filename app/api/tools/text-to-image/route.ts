import { z } from "zod";
import { withPublic } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { runPublicTool } from "@/lib/publicToolRun";
import { getImageProvider } from "@/lib/providers/image";

const Schema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  ratio: z.enum(["1:1", "16:9", "9:16"]).default("1:1"),
});

export const POST = withPublic(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());

  const out = await runPublicTool({
    jobType: "SHOT_IMAGE",
    targetType: "Tool:text-to-image",
    execute: async () => (await getImageProvider()).generateImage({ prompt: parsed.data.prompt, ratio: parsed.data.ratio }),
    resultUrlOf: (r) => r.url,
  });
  return apiOk(out, out.demo ? 200 : 202);
});
