import { z } from "zod";
import { withPublic } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { runPublicTool } from "@/lib/publicToolRun";
import { getImageProvider } from "@/lib/providers/image";

const Schema = z.object({
  productImageUrl: z.string().min(1),
  outputType: z.enum(["Hình ảnh nền trắng", "Sơ đồ cảnh", "Xem chi tiết bằng hình ảnh dài."]),
  description: z.string().optional(),
});

export const POST = withPublic(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());

  const out = await runPublicTool({
    jobType: "SHOT_IMAGE",
    targetType: "Tool:image-to-product",
    execute: async () =>
      (await getImageProvider()).generateImage({
        prompt: `${parsed.data.outputType}${parsed.data.description ? " — " + parsed.data.description : ""}`,
        referenceImageUrl: parsed.data.productImageUrl,
      }),
    resultUrlOf: (r) => r.url,
  });
  return apiOk(out, out.demo ? 200 : 202);
});
