import { z } from "zod";
import { withPublic } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { runPublicTool } from "@/lib/publicToolRun";
import { getImageProvider } from "@/lib/providers/image";

const Schema = z.object({
  referenceImageUrl: z.string().min(1),
  prompt: z.string().min(1),
  similarity: z.enum(["Thấp", "ở giữa", "cao"]).default("ở giữa"),
});

export const POST = withPublic(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());

  const out = await runPublicTool({
    jobType: "SHOT_IMAGE",
    targetType: "Tool:image-to-image",
    execute: async () =>
      (await getImageProvider()).generateImage({
        prompt: `${parsed.data.prompt} (độ tương đồng: ${parsed.data.similarity})`,
        referenceImageUrl: parsed.data.referenceImageUrl,
      }),
    resultUrlOf: (r) => r.url,
  });
  return apiOk(out, out.demo ? 200 : 202);
});
