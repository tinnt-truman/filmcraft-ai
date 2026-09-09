import type { JobType } from "@prisma/client";

const prices: Record<JobType, number> = {
  SCRIPT: Number(process.env.PRICE_SCRIPT ?? 500),
  SUMMARY: Number(process.env.PRICE_SUMMARY ?? 200),
  CHARACTER_IMAGE: Number(process.env.PRICE_CHARACTER_IMAGE ?? 1000),
  SHOT_IMAGE: Number(process.env.PRICE_SHOT_IMAGE ?? 800),
  SHOT_VIDEO: Number(process.env.PRICE_SHOT_VIDEO ?? 5000),
  VOICE: Number(process.env.PRICE_VOICE ?? 300),
  STORYBOARD: Number(process.env.PRICE_STORYBOARD ?? 400),
};

export function estimateCost(type: JobType, extra = 0) {
  return (prices[type] ?? 500) + extra;
}
