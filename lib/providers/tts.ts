import type { TtsProvider } from "./types";
import { nineRouterEnabled, nineRouterPost, requireNineRouterModel } from "./nineRouter";

/**
 * Mock TTS — không sinh audio thật, chỉ ước lượng thời lượng theo số từ.
 *
 * Để dùng TTS thật: set ELEVENLABS_API_KEY trong .env rồi hoàn thiện
 * `RealTtsProvider` (ElevenLabs hỗ trợ tiếng Việt).
 */
class MockTtsProvider implements TtsProvider {
  async synthesize({ text }: { text: string; voiceId: string }) {
    await new Promise((r) => setTimeout(r, 200));
    const words = text.trim().split(/\s+/u).filter(Boolean).length;
    const durationSec = Math.max(1, Math.round(words * 0.4 * 10) / 10);
    return { url: null as unknown as string, durationSec };
  }
}

class RealTtsProvider implements TtsProvider {
  async synthesize(): Promise<{ url: string; durationSec: number }> {
    // TODO: gọi ElevenLabs API tại đây.
    throw new Error(
      "RealTtsProvider chưa được implement — hoàn thiện lib/providers/tts.ts hoặc bỏ API key để dùng mock."
    );
  }
}

/**
 * 9Router — POST /v1/audio/speech (endpoint đã xác nhận có trong 9Router,
 * cùng shape OpenAI: { model, input, voice } -> trả thẳng file audio, không
 * phải JSON). Vì app này chưa có tầng lưu file/blob storage, kết quả được
 * encode thành data: URI (giống cách MockImageProvider làm với SVG) thay vì
 * upload lên đâu đó rồi trả URL — phù hợp cho demo local, không phù hợp cho
 * production (data URI dài, không nên lưu thẳng vào cột DB dùng lâu dài).
 *
 * durationSec ƯỚC LƯỢNG theo số từ (API không trả thời lượng thật) — muốn
 * chính xác cần đọc metadata file audio (VD package `music-metadata`).
 */
class NineRouterTtsProvider implements TtsProvider {
  async synthesize({ text }: { text: string; voiceId: string }): Promise<{ url: string; durationSec: number }> {
    const model = requireNineRouterModel("NINE_ROUTER_TTS_MODEL", "openai/tts-1");
    const voice = process.env.NINE_ROUTER_TTS_VOICE || "alloy";
    const res = await nineRouterPost("/audio/speech", { model, input: text, voice });
    const contentType = res.headers.get("content-type") || "audio/mpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const url = `data:${contentType};base64,${buffer.toString("base64")}`;

    const words = text.trim().split(/\s+/u).filter(Boolean).length;
    const durationSec = Math.max(1, Math.round(words * 0.4 * 10) / 10);
    return { url, durationSec };
  }
}

export function getTtsProvider(): TtsProvider {
  if (nineRouterEnabled()) {
    return new NineRouterTtsProvider();
  }
  if (process.env.ELEVENLABS_API_KEY) {
    return new RealTtsProvider();
  }
  return new MockTtsProvider();
}
