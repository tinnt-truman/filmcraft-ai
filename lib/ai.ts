export const SCRIPT_FEW_SHOT = `### Cảnh 1-1
Đêm Ngoại Hải đăng Vareth・Bờ đá
Nhân vật xuất hiện: Lina
△ Toàn cảnh: sóng lớn đập vào vách đá dưới ánh đèn đỏ bất thường, góc máy từ trên cao
△ Cận cảnh: Lina nhìn ra cửa sổ, ánh mắt lo lắng
Lina (nhìn ra cửa sổ, giọng lo lắng): Đèn hải đăng chưa từng tắt một đêm nào suốt 100 năm...`;

const MODEL = process.env.LLM_MODEL ?? "muse-spark-1.2-contributor-free";
const BASE = (process.env.LLM_BASE_URL ?? "https://opencode.ai/zen/v1").replace(/\/$/, "");
const USE_RESPONSES = process.env.LLM_USE_RESPONSES_API === "true";
const FAST_MODEL = process.env.LLM_FAST_MODEL ?? "nemotron-3-ultra-free";
const FAST_BASE = (process.env.LLM_FAST_BASE_URL ?? BASE).replace(/\/$/, "");
const CHAT_MODEL = process.env.LLM_CHAT_MODEL ?? "ling-3.0-flash-free";

function postChatCompletions(base: string, model: string, key: string | undefined, messages: unknown[], maxTokens = 8000, temperature = 0.7) {
  const k = key ?? process.env.LLM_API_KEY;
  if (!k) return Promise.resolve(`[STUB-AI:${model}] ${JSON.stringify(messages).slice(0, 600)}`);
  return fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  }).then((r) => r.json()).then((j: any) => j.choices?.[0]?.message?.content ?? `[STUB-AI:${model}] empty`);
}

function postResponses(base: string, model: string, key: string | undefined, prompt: string, maxTokens = 8000) {
  const k = key ?? process.env.LLM_API_KEY;
  if (!k) return Promise.resolve(`[STUB-AI:${model}] ${prompt.slice(0, 600)}`);
  return fetch(`${base}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
    body: JSON.stringify({ model, input: prompt, max_output_tokens: maxTokens }),
  }).then((r) => r.json()).then((j: any) => j.output?.[0]?.content?.[0]?.text ?? j.response ?? `[STUB-AI:${model}] empty`);
}

export async function llmGenerate(prompt: string, system = ""): Promise<string> {
  const msgs = [{ role: "system", content: system }, { role: "user", content: prompt }];
  if (USE_RESPONSES && MODEL.startsWith("muse")) {
    return postResponses(BASE, MODEL, process.env.LLM_API_KEY, prompt, Number(process.env.LLM_MAX_TOKENS) ?? 131072);
  }
  return postChatCompletions(BASE, MODEL, process.env.LLM_API_KEY, msgs, Number(process.env.LLM_MAX_TOKENS) ?? 8000, Number(process.env.LLM_TEMPERATURE) ?? 0.7);
}

export async function llmGenerateFast(prompt: string, system = ""): Promise<string> {
  return postChatCompletions(FAST_BASE, FAST_MODEL, process.env.LLM_FAST_API_KEY, [{ role: "system", content: system }, { role: "user", content: prompt }], Number(process.env.LLM_FAST_MAX_TOKENS) ?? 128000, Number(process.env.LLM_FAST_TEMPERATURE) ?? 0.3);
}

export async function llmGenerateChat(prompt: string, system = ""): Promise<string> {
  return postChatCompletions(BASE, CHAT_MODEL, process.env.LLM_API_KEY, [{ role: "system", content: system }, { role: "user", content: prompt }], 32000, 0.7);
}

export function buildScriptPrompt(opts: { title: string; genre: string; logline: string; characters: string; episodeIndex: number; episodeSummary: string }) {
  return `Viết kịch bản tập ${opts.episodeIndex} cho phim "${opts.title}" (${opts.genre}). Logline: ${opts.logline}. Nhân vật: ${opts.characters}. Tóm tắt tập: ${opts.episodeSummary}.\nĐÚNG khuôn mẫu sau, thuật ngữ cỡ cảnh chỉ dùng: Toàn cảnh xa, Cảnh trung, Cận cảnh, Đặc tả, Toàn cảnh. Mỗi dòng △ là 1 shot. Thoại dạng "Tên (cảm xúc): lời thoại".\n\n${SCRIPT_FEW_SHOT}`;
}

export function fakeImageUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/768/1024`;
}
