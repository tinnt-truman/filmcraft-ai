// lib/providers/types.ts — interface chung cho mọi AI provider adapter.
// Mỗi adapter có 1 bản mock (chạy offline, không cần API key — dùng cho demo
// local) và có thể thay bằng bản gọi API thật khi có key trong .env.

export interface LlmProvider {
  /** Sinh văn bản tự do (kịch bản, tóm tắt, tiểu sử nhân vật...). */
  generateText(input: { systemPrompt?: string; prompt: string; maxTokens?: number }): Promise<string>;
}

export interface ImageProvider {
  /** Sinh 1 ảnh từ mô tả text (+ ảnh tham chiếu tuỳ chọn, cho image-to-image). */
  generateImage(input: {
    prompt: string;
    referenceImageUrl?: string | null;
    ratio?: string;
  }): Promise<{ url: string }>;
}

export interface VideoProvider {
  /** Sinh video từ request đa phương thức đã lắp ráp (xem lib/promptAssembler.ts). */
  generateVideo(input: {
    text: string;
    referenceImage: string[];
    referenceAudio: string[];
    model: string;
    ratio: string;
    resolution: string;
    duration: number;
    generateAudio: boolean;
  }): Promise<{ url: string | null; lastFrameUrl: string | null }>;

  /** Cắt mẫu âm thanh tham chiếu còn dưới 15s (giới hạn API) — no-op ở bản mock. */
  trimReferenceAudio(url: string, maxSec?: number): Promise<string>;
}

export interface TtsProvider {
  synthesize(input: { text: string; voiceId: string }): Promise<{ url: string; durationSec: number }>;
}
