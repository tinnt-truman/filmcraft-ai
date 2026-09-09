// lib/promptAssembler.ts
//
// Lắp ráp request đa phương thức gửi cho model sinh video (Seedance 2.5/1.5
// hoặc provider tương đương) từ 1 Segment + các SegmentLine của nó, theo
// đúng đặc tả "Lớp 4" trong BACKEND_PROMPT.md (mục "Đặc tả pipeline gọi
// Seedance").
//
// Đây là hàm THUẦN (pure function) — nhận dữ liệu đã fetch sẵn từ DB, không
// tự query DB, để dễ unit test độc lập.

export type SegmentLineTagLiteral = "SUBTITLE_CONFIG" | "BGM" | "DIALOGUE" | "VISUAL";

export type AssemblerLine = {
  order: number;
  tag: SegmentLineTagLiteral;
  durationSec: number;
  characterName: string | null;
  direction: string | null;
  shotType: string | null;
  text: string;
};

export type AssemblerAsset = {
  id: string;
  name: string;
  category: "CHARACTER" | "SCENE" | "PROP" | "VOICE";
  imageUrl: string | null;
  /** Với asset giọng nói (hoặc nhân vật có gắn voiceAssetId) — mẫu âm thanh tham chiếu. */
  voiceUrl: string | null;
};

export type AssembleInput = {
  lines: AssemblerLine[];
  /** [Ràng buộc: Phong cách hình ảnh video] — lấy từ style dự án/tập. */
  visualStyle: string;
  /** asset tra theo id — dùng để resolve @asset:ID trong text. */
  assetsById: Record<string, AssemblerAsset>;
  model: string; // "Seedance 2.5" | "Seedance 1.5" | ...
  ratio: string; // "9:16" | "16:9" | "1:1"
  resolution: string; // "480p" | "720p" | "1080p"
  segmentDurationSecFallback: number;
  subtitleMode: "auto" | "post";
};

export type SeedanceRequest = {
  model: string;
  ratio: string;
  resolution: string;
  duration: number;
  generateAudio: boolean;
  text: string;
  referenceImage: string[];
  referenceAudio: string[];
};

const ASSET_TAG_RE = /@asset:([a-zA-Z0-9_-]+)/gu;

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function collectAssetIds(lines: AssemblerLine[]): string[] {
  const ids = new Set<string>();
  for (const l of lines) {
    for (const m of l.text.matchAll(ASSET_TAG_RE)) ids.add(m[1]);
  }
  return Array.from(ids);
}

/** true nếu segment có ý định phát sóng (có thoại hoặc khai báo phụ đề). */
export function shouldGenerateAudio(lines: AssemblerLine[]): boolean {
  return lines.some((l) => l.tag === "DIALOGUE" || l.tag === "SUBTITLE_CONFIG");
}

export function assembleSeedanceRequest(input: AssembleInput): SeedanceRequest {
  const { lines, assetsById } = input;
  const contentLines = lines.filter((l) => l.tag === "VISUAL" || l.tag === "DIALOGUE");
  const totalDuration =
    contentLines.reduce((acc, l) => acc + (l.durationSec || 0), 0) ||
    input.segmentDurationSecFallback;

  // --- Xác định asset được tham chiếu (@asset:ID) và số thứ tự hình/âm ----
  const referencedIds = collectAssetIds(lines);
  const characterImageAssets: AssemblerAsset[] = [];
  const sceneOrPropAssets: AssemblerAsset[] = [];
  const voiceByCharacterName = new Map<string, AssemblerAsset>();

  for (const id of referencedIds) {
    const asset = assetsById[id];
    if (!asset) continue;
    if (asset.category === "CHARACTER") {
      if (asset.imageUrl) characterImageAssets.push(asset);
      if (asset.voiceUrl) voiceByCharacterName.set(asset.name, asset);
    } else if (asset.category === "SCENE" || asset.category === "PROP") {
      if (asset.imageUrl) sceneOrPropAssets.push(asset);
    }
  }

  // Nhân vật xuất hiện trong dòng thoại nhưng không được @asset trực tiếp —
  // vẫn cần tra giọng theo tên nếu có asset VOICE cùng tên trong bảng.
  for (const l of lines) {
    if (l.tag === "DIALOGUE" && l.characterName && !voiceByCharacterName.has(l.characterName)) {
      const byName = Object.values(assetsById).find(
        (a) => a.category === "VOICE" && a.name === l.characterName && a.voiceUrl
      );
      if (byName) voiceByCharacterName.set(l.characterName, byName);
    }
  }

  const referenceImage: string[] = [
    ...characterImageAssets.map((a) => a.imageUrl!),
    ...sceneOrPropAssets.map((a) => a.imageUrl!),
  ];
  const imageIndexByAssetId = new Map<string, number>();
  characterImageAssets.forEach((a, i) => imageIndexByAssetId.set(a.id, i + 1));
  sceneOrPropAssets.forEach((a, i) =>
    imageIndexByAssetId.set(a.id, characterImageAssets.length + i + 1)
  );

  const referenceAudio: string[] = Array.from(voiceByCharacterName.values()).map(
    (a) => a.voiceUrl!
    // Lưu ý: mẫu âm thanh tham chiếu cần được cắt còn dưới 15s trước khi gửi
    // (giới hạn ~30s/clip của API). Việc cắt audio thật (ffmpeg) nằm ở
    // provider adapter (lib/providers/video.ts), không xử lý ở hàm thuần này.
  );
  const audioIndexByCharacterName = new Map<string, number>();
  Array.from(voiceByCharacterName.keys()).forEach((name, i) =>
    audioIndexByCharacterName.set(name, i + 1)
  );

  // --- Lắp khối ràng buộc theo đúng thứ tự cố định ------------------------
  const blocks: string[] = [];
  blocks.push(`[Phong cách hình ảnh video] ${input.visualStyle}`);

  const bgmLine = lines.find((l) => l.tag === "BGM");
  const subtitleLine = lines.find((l) => l.tag === "SUBTITLE_CONFIG");
  const audioParts: string[] = [];
  if (subtitleLine && input.subtitleMode === "auto") {
    audioParts.push(subtitleLine.text);
  }
  if (bgmLine) audioParts.push(bgmLine.text);
  if (audioParts.length > 0) {
    blocks.push(`[Âm thanh, phụ đề & nhạc nền] ${audioParts.join("; ")}`);
  }

  if (audioIndexByCharacterName.size > 0) {
    const parts = Array.from(audioIndexByCharacterName.entries()).map(
      ([name, idx]) => `${name} → Âm ${idx}`
    );
    blocks.push(`[Giọng nói nhân vật] ${parts.join(", ")}`);
  }

  if (characterImageAssets.length > 0) {
    const parts = characterImageAssets.map(
      (a) => `${a.name} → Hình ${imageIndexByAssetId.get(a.id)}`
    );
    blocks.push(`[Ngoại hình nhân vật] ${parts.join(", ")}`);
  }

  if (sceneOrPropAssets.length > 0) {
    const parts = sceneOrPropAssets.map((a) => `${a.name} → Hình ${imageIndexByAssetId.get(a.id)}`);
    blocks.push(`[Bối cảnh] ${parts.join(", ")}`);
  }

  // --- Văn bản chính: từng dòng nội dung kèm mốc thời gian tuyệt đối ------
  let cursor = 0;
  const mainLines: string[] = [];
  for (const l of contentLines) {
    const start = cursor;
    const dur = l.durationSec || 0;
    cursor += dur;
    const timeRange = dur > 0 ? `${fmtTime(start)}–${fmtTime(cursor)}` : "";

    const resolvedText = l.text.replace(ASSET_TAG_RE, (_match, id) => {
      const asset = assetsById[id];
      if (!asset) return _match;
      const idx = imageIndexByAssetId.get(id);
      return idx ? `${asset.name} (tham khảo Hình ${idx})` : asset.name;
    });

    if (l.tag === "DIALOGUE") {
      const who = l.direction ? `${l.characterName} (${l.direction})` : l.characterName;
      mainLines.push(`${timeRange} ${who}: ${resolvedText}`.trim());
    } else {
      const shotType = l.shotType ? `${l.shotType}: ` : "";
      mainLines.push(`${timeRange} △ ${shotType}${resolvedText}`.trim());
    }
  }
  blocks.push(mainLines.join("\n"));

  return {
    model: input.model,
    ratio: input.ratio,
    resolution: input.resolution,
    duration: totalDuration,
    generateAudio: shouldGenerateAudio(lines),
    text: blocks.join("\n\n"),
    referenceImage,
    referenceAudio,
  };
}
