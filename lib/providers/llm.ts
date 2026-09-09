import type { LlmProvider } from "./types";
import { getConfigValue } from "../platformConfig";
import { nineRouterEnabled, nineRouterPost, requireNineRouterModel } from "./nineRouter";

/**
 * Mock LLM — chạy offline, không cần API key. Trả về văn bản giả lập nhưng
 * có cấu trúc hợp lý (đủ để FE hiển thị & test luồng end-to-end).
 *
 * Để dùng LLM thật: set ANTHROPIC_API_KEY hoặc OPENAI_API_KEY trong .env
 * (hoặc qua /admin -> "Cấu hình AI") rồi hoàn thiện `RealLlmProvider` bên
 * dưới (gọi Anthropic Messages API / OpenAI Chat Completions API với
 * systemPrompt + prompt).
 */
class MockLlmProvider implements LlmProvider {
  async generateText({ prompt }: { systemPrompt?: string; prompt: string }): Promise<string> {
    await new Promise((r) => setTimeout(r, 300));
    return [
      "[Nội dung do mock LLM provider sinh ra — thay ANTHROPIC_API_KEY/OPENAI_API_KEY",
      " trong .env (hoặc /admin -> Cấu hình AI) và hoàn thiện lib/providers/llm.ts để gọi model thật.]",
      "",
      `Yêu cầu gốc: ${prompt.slice(0, 400)}${prompt.length > 400 ? "…" : ""}`,
    ].join("\n");
  }
}

class RealLlmProvider implements LlmProvider {
  async generateText(): Promise<string> {
    // TODO: gọi Anthropic Messages API (client.messages.create) hoặc OpenAI
    // Chat Completions API tại đây, dùng input.systemPrompt làm system prompt
    // và few-shot mẫu kịch bản trong BACKEND_PROMPT.md.
    throw new Error(
      "RealLlmProvider chưa được implement — hoàn thiện lib/providers/llm.ts hoặc bỏ API key để dùng mock."
    );
  }
}

/**
 * 9Router — gateway local OpenAI-compatible (xem lib/providers/nineRouter.ts).
 * Gọi thẳng POST /v1/chat/completions, endpoint đã xác nhận có trong 9Router.
 */
class NineRouterLlmProvider implements LlmProvider {
  async generateText(input: { systemPrompt?: string; prompt: string; maxTokens?: number }): Promise<string> {
    const model = await requireNineRouterModel("NINE_ROUTER_LLM_MODEL", "cc/claude-opus-4-7");
    const messages = [
      ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
      { role: "user", content: input.prompt },
    ];
    const res = await nineRouterPost("/chat/completions", {
      model,
      messages,
      ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("9Router (/chat/completions) trả về response không đúng định dạng OpenAI chat completions.");
    }
    return text;
  }
}

export async function getLlmProvider(): Promise<LlmProvider> {
  if (await nineRouterEnabled()) {
    return new NineRouterLlmProvider();
  }
  const anthropicKey = await getConfigValue("ANTHROPIC_API_KEY");
  const openaiKey = await getConfigValue("OPENAI_API_KEY");
  if (anthropicKey || openaiKey) {
    return new RealLlmProvider();
  }
  return new MockLlmProvider();
}
