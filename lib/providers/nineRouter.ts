// lib/providers/nineRouter.ts
//
// Helper dùng chung cho tích hợp 9Router (https://9router.com,
// https://github.com/decolua/9router) — 1 gateway chạy LOCAL trên máy bạn
// (`npm install -g 9router`, mặc định lắng nghe http://localhost:20128/v1),
// gộp nhiều provider AI (Claude Code, GLM, Kimi, Qwen, Vertex...) phía sau
// CÙNG 1 API kiểu OpenAI-compatible — nên 4 file provider trong thư mục này
// (llm/image/video/tts) đều có thể dùng chung 1 client fetch tối giản, không
// cần cài SDK riêng (`openai` npm package) cho từng loại.
//
// ĐÃ XÁC NHẬN từ README chính thức của 9Router (github.com/decolua/9router):
//   - POST /v1/chat/completions   — dùng ở lib/providers/llm.ts
//   - POST /v1/audio/speech       — dùng ở lib/providers/tts.ts
//   - GET  /v1/models             — liệt kê model/provider bạn đã kết nối
//     trong dashboard 9Router (dùng để biết chính xác tên model cần điền
//     vào các biến NINE_ROUTER_*_MODEL bên dưới).
//
// CHƯA XÁC NHẬN (không có trong README gốc — chỉ thấy nhắc ở 1 fork tên
// "OmniRoute", nên bản 9Router bạn cài có thể KHÔNG hỗ trợ):
//   - Sinh ảnh — lib/providers/image.ts dưới đây gọi `/v1/images/generations`
//     theo đúng quy ước chuẩn OpenAI Images API (khớp tuyên bố "OpenAI-
//     compatible" của 9Router), nhưng CHƯA kiểm chứng được là endpoint này
//     có thật trên 9Router hay không.
//   - Sinh video — KHÔNG có chuẩn OpenAI nào cho việc này. Endpoint
//     `/v1/videos/generations` ở lib/providers/video.ts là PHỎNG ĐOÁN theo
//     quy ước chung của 9Router, chưa xác nhận được bằng tài liệu chính
//     thức nào.
// => Sau khi cài 9Router thật, hãy gọi GET {NINE_ROUTER_BASE_URL}/models để
//    xem model/loại nào thực sự khả dụng, rồi đối chiếu lại 2 hàm
//    NineRouterImageProvider/NineRouterVideoProvider bên dưới — có thể cần
//    sửa lại path/shape request cho khớp.
//
// Cấu hình đọc qua lib/platformConfig.ts: DB override (set qua /admin ->
// "Cấu hình AI") được ưu tiên hơn biến .env cùng tên — xem đó để biết danh
// sách đầy đủ (NINE_ROUTER_API_KEY, NINE_ROUTER_BASE_URL,
// NINE_ROUTER_*_MODEL, NINE_ROUTER_TTS_VOICE).

import { getConfigValue } from "../platformConfig";

export async function nineRouterEnabled(): Promise<boolean> {
  return Boolean(await getConfigValue("NINE_ROUTER_API_KEY"));
}

export async function nineRouterBaseUrl(): Promise<string> {
  const v = await getConfigValue("NINE_ROUTER_BASE_URL");
  return (v || "http://localhost:20128/v1").replace(/\/+$/, "");
}

/** Đọc 1 biến model bắt buộc, báo lỗi rõ ràng (kèm cách tra đúng tên) nếu thiếu. */
export async function requireNineRouterModel(envVar: string, example: string): Promise<string> {
  const model = await getConfigValue(envVar);
  if (!model) {
    const base = await nineRouterBaseUrl();
    throw new Error(
      `Thiếu cấu hình ${envVar} — set trong /admin (mục "Cấu hình AI") hoặc .env đúng tên model bạn đã kết nối ` +
        `trong 9Router (gọi GET ${base}/models hoặc xem dashboard 9Router để biết tên chính xác, VD: "${example}").`
    );
  }
  return model;
}

/** POST JSON tới 9Router, trả về Response thô (caller tự đọc json()/arrayBuffer() tuỳ endpoint). */
export async function nineRouterPost(path: string, body: unknown): Promise<Response> {
  const base = await nineRouterBaseUrl();
  const apiKey = await getConfigValue("NINE_ROUTER_API_KEY");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`9Router ${path} trả lỗi HTTP ${res.status}: ${detail.slice(0, 500)}`);
  }
  return res;
}
