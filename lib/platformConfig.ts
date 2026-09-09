// lib/platformConfig.ts — lớp lưu trữ gốc cho cấu hình nền tảng (bảng
// PlatformSetting, key/value), KHÔNG import bất kỳ provider nào (tránh
// circular import với lib/providers/*.ts, nơi cũng cần đọc config này).
//
// Có 2 loại key:
//  - "price:<JobType>"  — override giá, xem lib/pricing.ts cho giá mặc định.
//  - "config:<ENV_VAR>" — override cho 1 biến môi trường provider (model,
//    base URL, hoặc chính API key) — value ở DB được ưu tiên hơn process.env
//    khi cả 2 cùng tồn tại. Set qua /admin (mục "Cấu hình AI").

import { prisma } from "./prisma";
import { PRICING, type JobTypeLiteral } from "./pricing";

const PRICE_KEY_PREFIX = "price:";
const CONFIG_KEY_PREFIX = "config:";
const JOB_TYPES = Object.keys(PRICING) as JobTypeLiteral[];

// ---------------------------------------------------------------------------
// Giá theo JobType
// ---------------------------------------------------------------------------

export async function getPricingOverrides(): Promise<Partial<Record<JobTypeLiteral, number>>> {
  const rows = await prisma.platformSetting.findMany({ where: { key: { startsWith: PRICE_KEY_PREFIX } } });
  const out: Partial<Record<JobTypeLiteral, number>> = {};
  for (const r of rows) {
    const type = r.key.slice(PRICE_KEY_PREFIX.length) as JobTypeLiteral;
    const n = Number(r.value);
    if (JOB_TYPES.includes(type) && Number.isFinite(n) && n > 0) out[type] = n;
  }
  return out;
}

/** Giá hiệu lực = override trong DB (nếu có) đè lên giá mặc định ở lib/pricing.ts. */
export async function getEffectivePricing(): Promise<Record<JobTypeLiteral, number>> {
  const overrides = await getPricingOverrides();
  return { ...PRICING, ...overrides };
}

/** Dùng trong lib/jobs.ts khi tạo job — 1 lần tra DB thay vì tải hết bảng giá. */
export async function getEffectiveCost(type: JobTypeLiteral): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key: `${PRICE_KEY_PREFIX}${type}` } });
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : PRICING[type];
}

/** value = null -> xoá override, quay về giá mặc định. */
export async function setPriceOverride(type: JobTypeLiteral, value: number | null): Promise<void> {
  const key = `${PRICE_KEY_PREFIX}${type}`;
  if (value == null) {
    await prisma.platformSetting.deleteMany({ where: { key } });
    return;
  }
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

// ---------------------------------------------------------------------------
// Config provider AI (model/base URL/API key) — mỗi biến khớp 1 biến .env
// cùng tên (xem CONFIG_KEYS bên dưới), override trong DB được ưu tiên hơn.
// ---------------------------------------------------------------------------

export type ConfigGroup = "nineRouter" | "llm" | "image" | "video" | "tts";

export type ConfigKeyDef = {
  key: string;
  label: string;
  secret: boolean;
  group: ConfigGroup;
};

export const CONFIG_KEYS: ConfigKeyDef[] = [
  { key: "NINE_ROUTER_API_KEY", label: "9Router — API key", secret: true, group: "nineRouter" },
  { key: "NINE_ROUTER_BASE_URL", label: "9Router — Base URL", secret: false, group: "nineRouter" },
  { key: "NINE_ROUTER_LLM_MODEL", label: "9Router — Model LLM", secret: false, group: "llm" },
  { key: "DEEPSEEK_API_KEY", label: "DeepSeek API key", secret: true, group: "llm" },
  { key: "DEEPSEEK_MODEL", label: "DeepSeek — Model", secret: false, group: "llm" },
  { key: "DEEPSEEK_BASE_URL", label: "DeepSeek — Base URL", secret: false, group: "llm" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic API key", secret: true, group: "llm" },
  { key: "OPENAI_API_KEY", label: "OpenAI API key", secret: true, group: "llm" },
  { key: "NINE_ROUTER_IMAGE_MODEL", label: "9Router — Model sinh ảnh", secret: false, group: "image" },
  { key: "REPLICATE_API_TOKEN", label: "Replicate API token", secret: true, group: "image" },
  { key: "FAL_KEY", label: "fal.ai API key", secret: true, group: "image" },
  { key: "NINE_ROUTER_VIDEO_MODEL", label: "9Router — Model sinh video", secret: false, group: "video" },
  { key: "SEEDANCE_API_KEY", label: "Seedance API key", secret: true, group: "video" },
  { key: "NINE_ROUTER_TTS_MODEL", label: "9Router — Model TTS", secret: false, group: "tts" },
  { key: "NINE_ROUTER_TTS_VOICE", label: "9Router — Giọng đọc", secret: false, group: "tts" },
  { key: "ELEVENLABS_API_KEY", label: "ElevenLabs API key", secret: true, group: "tts" },
];

const CONFIG_KEY_SET = new Set(CONFIG_KEYS.map((c) => c.key));

/** Đọc 1 giá trị config: DB override (nếu có) > process.env > null. */
export async function getConfigValue(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key: `${CONFIG_KEY_PREFIX}${key}` } });
  if (row && row.value) return row.value;
  return process.env[key] || null;
}

/** value = null/"" -> xoá override trong DB, quay về giá trị .env (nếu có). */
export async function setConfigValue(key: string, value: string | null): Promise<void> {
  if (!CONFIG_KEY_SET.has(key)) throw new Error(`Config key không hợp lệ: ${key}`);
  const dbKey = `${CONFIG_KEY_PREFIX}${key}`;
  if (value == null || value === "") {
    await prisma.platformSetting.deleteMany({ where: { key: dbKey } });
    return;
  }
  await prisma.platformSetting.upsert({
    where: { key: dbKey },
    update: { value },
    create: { key: dbKey, value },
  });
}

/**
 * Trạng thái từng config key cho UI /admin: đã set hay chưa, set từ DB hay
 * từ .env — KHÔNG BAO GIỜ trả giá trị thật của key được đánh dấu `secret`.
 */
export async function getConfigStatus(): Promise<
  { key: string; label: string; secret: boolean; group: ConfigGroup; set: boolean; source: "db" | "env" | "none"; value: string | null }[]
> {
  const rows = await prisma.platformSetting.findMany({ where: { key: { startsWith: CONFIG_KEY_PREFIX } } });
  const dbValues = new Map(rows.map((r) => [r.key.slice(CONFIG_KEY_PREFIX.length), r.value]));
  return CONFIG_KEYS.map((c) => {
    const dbValue = dbValues.get(c.key);
    if (dbValue) return { ...c, set: true, source: "db" as const, value: c.secret ? null : dbValue };
    const envValue = process.env[c.key];
    if (envValue) return { ...c, set: true, source: "env" as const, value: c.secret ? null : envValue };
    return { ...c, set: false, source: "none" as const, value: null };
  });
}
