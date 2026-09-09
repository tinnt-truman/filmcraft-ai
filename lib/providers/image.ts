import type { ImageProvider } from "./types";
import { getConfigValue } from "../platformConfig";
import { nineRouterEnabled, nineRouterPost, requireNineRouterModel } from "./nineRouter";

function hashColor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const h1 = h % 360;
  const h2 = (h1 + 60) % 360;
  return [`hsl(${h1},55%,55%)`, `hsl(${h2},55%,35%)`];
}

/**
 * Mock image provider — sinh 1 SVG placeholder (data: URI) offline, không
 * cần API key/network. Màu sắc suy ra từ prompt để mỗi ảnh khác nhau 1 chút,
 * đủ để phân biệt trong demo local.
 *
 * Để dùng model thật: set REPLICATE_API_TOKEN hoặc FAL_KEY trong .env (hoặc
 * qua /admin -> "Cấu hình AI") rồi hoàn thiện `RealImageProvider` (gọi
 * Replicate/fal.ai, model SDXL/Flux; dùng referenceImageUrl cho
 * image-to-image / IP-Adapter để giữ nhân vật nhất quán xuyên suốt series).
 */
class MockImageProvider implements ImageProvider {
  async generateImage({ prompt, ratio }: { prompt: string; referenceImageUrl?: string | null; ratio?: string }) {
    await new Promise((r) => setTimeout(r, 400));
    const [c1, c2] = hashColor(prompt);
    const [w, h] = ratio === "9:16" ? [540, 960] : ratio === "1:1" ? [720, 720] : [960, 540];
    const label = prompt.slice(0, 60).replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
</linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<text x="24" y="${h - 24}" font-family="sans-serif" font-size="20" fill="rgba(255,255,255,0.85)">${label}</text>
</svg>`;
    const base64 = Buffer.from(svg).toString("base64");
    return { url: `data:image/svg+xml;base64,${base64}` };
  }
}

class RealImageProvider implements ImageProvider {
  async generateImage(): Promise<{ url: string }> {
    // TODO: gọi Replicate (SDXL/Flux) hoặc fal.ai tại đây, truyền
    // referenceImageUrl cho image-to-image khi có.
    throw new Error(
      "RealImageProvider chưa được implement — hoàn thiện lib/providers/image.ts hoặc bỏ API key để dùng mock."
    );
  }
}

/**
 * 9Router — POST /v1/images/generations, theo đúng quy ước OpenAI Images
 * API. CHƯA XÁC NHẬN endpoint này có thật trên 9Router (không thấy trong
 * README chính thức, chỉ thấy nhắc ở 1 fork tên "OmniRoute") — xem
 * lib/providers/nineRouter.ts. Sau khi cài 9Router, gọi GET
 * {NINE_ROUTER_BASE_URL}/models để xác nhận có model sinh ảnh khả dụng
 * không; nếu 404/không có, dùng REPLICATE_API_TOKEN/FAL_KEY (RealImageProvider)
 * thay vì set NINE_ROUTER_IMAGE_MODEL.
 */
class NineRouterImageProvider implements ImageProvider {
  async generateImage({
    prompt,
    referenceImageUrl,
    ratio,
  }: {
    prompt: string;
    referenceImageUrl?: string | null;
    ratio?: string;
  }): Promise<{ url: string }> {
    const model = await requireNineRouterModel("NINE_ROUTER_IMAGE_MODEL", "openai/dall-e-3");
    const size = ratio === "9:16" ? "1024x1792" : ratio === "16:9" ? "1792x1024" : "1024x1024";
    const res = await nineRouterPost("/images/generations", {
      model,
      prompt,
      size,
      ...(referenceImageUrl ? { image: referenceImageUrl } : {}),
    });
    const data = await res.json();
    const item = data?.data?.[0];
    if (item?.url) return { url: item.url as string };
    if (item?.b64_json) return { url: `data:image/png;base64,${item.b64_json}` };
    throw new Error("9Router (/images/generations) trả về response không đúng định dạng OpenAI images API.");
  }
}

export async function getImageProvider(): Promise<ImageProvider> {
  if ((await nineRouterEnabled()) && (await getConfigValue("NINE_ROUTER_IMAGE_MODEL"))) {
    return new NineRouterImageProvider();
  }
  const replicateToken = await getConfigValue("REPLICATE_API_TOKEN");
  const falKey = await getConfigValue("FAL_KEY");
  if (replicateToken || falKey) {
    return new RealImageProvider();
  }
  return new MockImageProvider();
}
