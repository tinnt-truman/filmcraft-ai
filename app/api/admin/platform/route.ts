import { z } from "zod";
import { withAdmin } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { PRICING } from "@/lib/pricing";
import {
  getPricingOverrides,
  setPriceOverride,
  getProviderStatus,
  getConfigStatus,
  setConfigValue,
  CONFIG_KEYS,
} from "@/lib/platformSettings";

async function buildPricingResponse() {
  const overrides = await getPricingOverrides();
  return Object.fromEntries(
    Object.entries(PRICING).map(([type, def]) => [
      type,
      { default: def, override: overrides[type as keyof typeof PRICING] ?? null, effective: overrides[type as keyof typeof PRICING] ?? def },
    ])
  );
}

// GET /api/admin/platform — cấu hình nền tảng AI: giá mặc định/override/hiệu
// lực theo từng JobType, trạng thái provider (LLM/ảnh/video/giọng nói), và
// danh sách config (model/API key) — KHÔNG BAO GIỜ trả giá trị API key thật,
// chỉ booleans đã set hay chưa (xem lib/platformConfig.ts).
export const GET = withAdmin(async () => {
  const [pricing, providers, config] = await Promise.all([buildPricingResponse(), getProviderStatus(), getConfigStatus()]);
  return apiOk({ pricing, providers, config });
});

const PriceEntry = z.number().int().positive().nullable();
const CONFIG_KEY_NAMES = CONFIG_KEYS.map((c) => c.key) as [string, ...string[]];
const PatchSchema = z.object({
  pricing: z
    .object({
      SCRIPT: PriceEntry.optional(),
      SUMMARY: PriceEntry.optional(),
      CHARACTER_IMAGE: PriceEntry.optional(),
      SHOT_IMAGE: PriceEntry.optional(),
      SHOT_VIDEO: PriceEntry.optional(),
      VOICE: PriceEntry.optional(),
      STORYBOARD: PriceEntry.optional(),
    })
    .partial()
    .optional(),
  config: z.record(z.enum(CONFIG_KEY_NAMES), z.string().nullable()).optional(),
});

// PATCH /api/admin/platform — cập nhật override giá theo JobType và/hoặc
// config provider (model/base URL/API key). value = null (hoặc chuỗi rỗng)
// -> xoá override, quay về giá trị mặc định/.env.
export const PATCH = withAdmin(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", parsed.error.flatten());
  }

  if (parsed.data.pricing) {
    const entries = Object.entries(parsed.data.pricing) as [keyof typeof PRICING, number | null | undefined][];
    for (const [type, value] of entries) {
      if (value === undefined) continue;
      await setPriceOverride(type, value);
    }
  }

  if (parsed.data.config) {
    const entries = Object.entries(parsed.data.config) as [string, string | null | undefined][];
    for (const [key, value] of entries) {
      if (value === undefined) continue;
      await setConfigValue(key, value);
    }
  }

  const [pricing, providers, config] = await Promise.all([buildPricingResponse(), getProviderStatus(), getConfigStatus()]);
  return apiOk({ pricing, providers, config });
});
