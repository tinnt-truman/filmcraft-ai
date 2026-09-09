import type { VideoProvider } from "./types";
import { getConfigValue } from "../platformConfig";
import { nineRouterEnabled, nineRouterPost, requireNineRouterModel } from "./nineRouter";

/**
 * Mock video provider — không sinh video thật (cần model nặng + network),
 * chỉ mô phỏng độ trễ xử lý và trả về `url: null` kèm cờ để FE hiển thị
 * đúng trạng thái "đã xử lý xong nhưng chưa có provider thật được cắm vào".
 *
 * Để dùng model thật: set SEEDANCE_API_KEY (hoặc REPLICATE_API_TOKEN cho
 * Kling/Runway/Luma qua Replicate) trong .env (hoặc qua /admin -> "Cấu hình
 * AI") rồi hoàn thiện `RealVideoProvider` — gửi đúng shape request đã lắp ở
 * lib/promptAssembler.ts (text + reference_image[] + reference_audio[]).
 */
class MockVideoProvider implements VideoProvider {
  async generateVideo(input: { duration: number }) {
    await new Promise((r) => setTimeout(r, Math.min(2500, 400 + input.duration * 60)));
    return { url: null, lastFrameUrl: null };
  }

  async trimReferenceAudio(url: string): Promise<string> {
    // Mock: không xử lý audio thật, trả nguyên URL.
    // Real impl: dùng ffmpeg cắt còn <15s trước khi gửi (giới hạn API).
    return url;
  }
}

class RealVideoProvider implements VideoProvider {
  async generateVideo(): Promise<{ url: string | null; lastFrameUrl: string | null }> {
    // TODO: gọi Seedance / Kling / Runway / Luma tại đây với đúng shape
    // request đa phương thức (xem lib/promptAssembler.ts).
    throw new Error(
      "RealVideoProvider chưa được implement — hoàn thiện lib/providers/video.ts hoặc bỏ API key để dùng mock."
    );
  }

  async trimReferenceAudio(url: string): Promise<string> {
    // TODO: dùng ffmpeg (child_process hoặc fluent-ffmpeg) để cắt còn <15s.
    return url;
  }
}

/**
 * 9Router — POST /v1/videos/generations. **PHỎNG ĐOÁN, CHƯA XÁC NHẬN**:
 * không có chuẩn OpenAI chính thức nào cho sinh video, và endpoint này
 * không có trong README gốc của 9Router (xem lib/providers/nineRouter.ts).
 * Chỉ kích hoạt khi bạn CHỦ ĐỘNG set NINE_ROUTER_VIDEO_MODEL — sau khi cài
 * 9Router, hãy gọi GET {NINE_ROUTER_BASE_URL}/models để xác nhận có model
 * sinh video khả dụng thật không, và đối chiếu lại request/response shape
 * bên dưới (có thể cần sửa path hoặc field name cho khớp thực tế).
 */
class NineRouterVideoProvider implements VideoProvider {
  async generateVideo(input: {
    text: string;
    referenceImage: string[];
    referenceAudio: string[];
    model: string;
    ratio: string;
    resolution: string;
    duration: number;
    generateAudio: boolean;
  }): Promise<{ url: string | null; lastFrameUrl: string | null }> {
    const model = await requireNineRouterModel("NINE_ROUTER_VIDEO_MODEL", "kling/kling-v2");
    const res = await nineRouterPost("/videos/generations", {
      model,
      prompt: input.text,
      reference_image: input.referenceImage,
      reference_audio: input.referenceAudio,
      ratio: input.ratio,
      resolution: input.resolution,
      duration: input.duration,
      generate_audio: input.generateAudio,
    });
    const data = await res.json();
    const item = data?.data?.[0] ?? data;
    return {
      url: item?.url ?? null,
      lastFrameUrl: item?.last_frame_url ?? item?.lastFrameUrl ?? null,
    };
  }

  async trimReferenceAudio(url: string): Promise<string> {
    // 9Router không có endpoint xử lý audio kiểu này — vẫn cần ffmpeg riêng
    // nếu muốn cắt mẫu giọng tham chiếu còn <15s (xem RealVideoProvider).
    return url;
  }
}

export async function getVideoProvider(): Promise<VideoProvider> {
  if ((await nineRouterEnabled()) && (await getConfigValue("NINE_ROUTER_VIDEO_MODEL"))) {
    return new NineRouterVideoProvider();
  }
  const seedanceKey = await getConfigValue("SEEDANCE_API_KEY");
  if (seedanceKey) {
    return new RealVideoProvider();
  }
  return new MockVideoProvider();
}
