// lib/platformSettings.ts — tổng hợp trạng thái provider AI cho /admin (mục
// "Cấu hình AI"). Lưu trữ key/value gốc nằm ở ./platformConfig (tách riêng
// để tránh circular import: lib/providers/*.ts cũng cần đọc config đó).

import { getConfigValue } from "./platformConfig";
import { getLlmProvider } from "./providers/llm";
import { getImageProvider } from "./providers/image";
import { getVideoProvider } from "./providers/video";
import { getTtsProvider } from "./providers/tts";

export {
  getPricingOverrides,
  getEffectivePricing,
  getEffectiveCost,
  setPriceOverride,
  getConfigValue,
  setConfigValue,
  getConfigStatus,
  CONFIG_KEYS,
} from "./platformConfig";

const MODE_LABEL: Record<string, string> = {
  MockLlmProvider: "Mock (offline)",
  RealLlmProvider: "Thật (chưa hoàn thiện)",
  NineRouterLlmProvider: "9Router",
  MockImageProvider: "Mock (offline)",
  RealImageProvider: "Thật (chưa hoàn thiện)",
  NineRouterImageProvider: "9Router",
  MockVideoProvider: "Mock (offline)",
  RealVideoProvider: "Thật (chưa hoàn thiện)",
  NineRouterVideoProvider: "9Router",
  MockTtsProvider: "Mock (offline)",
  RealTtsProvider: "Thật (chưa hoàn thiện)",
  NineRouterTtsProvider: "9Router",
};

function modeLabel(instance: object): string {
  return MODE_LABEL[instance.constructor.name] ?? instance.constructor.name;
}

/**
 * Trạng thái provider AI hiện tại (đã tính cả override từ DB) — chỉ trả
 * booleans/label, KHÔNG BAO GIỜ trả giá trị thật của API key.
 */
export async function getProviderStatus() {
  const [llm, image, video, tts, nineRouterKey, nineRouterBaseUrl] = await Promise.all([
    getLlmProvider(),
    getImageProvider(),
    getVideoProvider(),
    getTtsProvider(),
    getConfigValue("NINE_ROUTER_API_KEY"),
    getConfigValue("NINE_ROUTER_BASE_URL"),
  ]);

  return {
    nineRouter: {
      enabled: Boolean(nineRouterKey),
      baseUrl: nineRouterBaseUrl || "http://localhost:20128/v1",
    },
    capabilities: {
      llm: { active: modeLabel(llm) },
      image: { active: modeLabel(image) },
      video: { active: modeLabel(video) },
      tts: { active: modeLabel(tts) },
    },
  };
}
