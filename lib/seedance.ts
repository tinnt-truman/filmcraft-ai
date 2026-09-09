import { prisma } from "./db";

export type SeedanceRequest = {
  model: string;
  ratio: string;
  resolution: string;
  duration: number;
  generate_audio: boolean;
  text: string;
  reference_image: string[];
  reference_audio: string[];
  first_frame?: string;
};

export function buildSeedancePrompt(opts: {
  visualStyle: string;
  subtitleMode: string;
  bgm: string;
  voices: { name: string; ref: string }[];
  looks: { name: string; ref: string }[];
  places: { name: string; ref: string }[];
  body: string;
}) {
  const parts = [
    `[Phong cách hình ảnh video] ${opts.visualStyle}`,
    opts.subtitleMode === "auto"
      ? `[Âm thanh, phụ đề & nhạc nền] ${opts.bgm} · đồng bộ phụ đề`
      : `[Âm thanh & nhạc nền] ${opts.bgm}`,
    ...opts.voices.map((v, i) => `[Giọng nói nhân vật: ${v.name} → âm thanh tham chiếu ${i + 1}]`),
    ...opts.looks.map((v, i) => `[Ngoại hình nhân vật: ${v.name} → hình tham khảo ${i + 1}]`),
    ...opts.places.map((v, i) => `[Bối cảnh: ${v.name} → hình tham chiếu ${i + 1}]`),
    opts.body,
  ];
  return parts.filter(Boolean).join("\n");
}

export function validateSegment(lines: { tag: string; durationSec: number; characterName?: string | null; text: string }[], assets: { id: string; name: string; imageUrl?: string | null; metadata?: unknown }[]) {
  const errors: string[] = [];
  const missing: string[] = [];
  const total = lines.filter((l) => l.tag === "DIALOGUE" || l.tag === "VISUAL").reduce((a, l) => a + (l.durationSec || 0), 0);
  if (total < 4 || total > 30) errors.push(`Tổng duration ${total}s phải trong [4,30]`);
  for (const l of lines) {
    if (l.tag === "VISUAL" && l.characterName) errors.push(`Dòng visual không được gắn nhân vật/thoại: "${l.text.slice(0, 40)}"`);
  }
  const assetIds = new Set<string>();
  const re = /@asset:([A-Za-z0-9_-]+)/g;
  for (const l of lines) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(l.text))) assetIds.add(m[1]);
  }
  for (const id of assetIds) {
    const a = assets.find((x) => x.id === id);
    if (!a) { missing.push(id); continue; }
    if (!a.imageUrl) missing.push(`${a.name} thiếu ảnh tham khảo`);
  }
  return { errors, missing, total, assetIds: [...assetIds] };
}

export async function enqueueJob(opts: { userId: string; type: "SHOT_VIDEO"; targetType: string; targetId: string; segmentId?: string; videoProjectId?: string; estimatedCost: number; provider?: string; requestPayload?: object }) {
  return prisma.generationJob.create({ data: { ...opts, status: "QUEUED", requestPayload: opts.requestPayload as never } });
}
