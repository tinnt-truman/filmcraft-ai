// lib/segmentValidate.ts
//
// Validate ở BACKEND (không chỉ FE) trước khi cho phép bấm "phát ra" —
// đúng 4 mục kiểm tra trong BACKEND_PROMPT.md, mục "Kiểm tra trước khi cho
// phép bấm phát ra".

import type { AssemblerAsset, AssemblerLine } from "./promptAssembler";

export type ValidationError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ValidateSegmentInput = {
  lines: AssemblerLine[];
  assetsById: Record<string, AssemblerAsset>;
  ratio: string | null;
  resolution: string | null;
  model: string | null;
  visualStyle: string | null;
};

const ASSET_TAG_RE = /@asset:([a-zA-Z0-9_-]+)/gu;

export function validateSegmentForGenerate(input: ValidateSegmentInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Dòng visual không được gắn characterName/thoại.
  for (const l of input.lines) {
    if (l.tag === "VISUAL" && l.characterName) {
      errors.push({
        code: "VISUAL_LINE_HAS_CHARACTER",
        message: `Dòng "visual" ở vị trí ${l.order} không được gắn nhân vật/thoại — dùng tag "dialogue" nếu cần lồng tiếng.`,
        details: { order: l.order },
      });
    }
  }

  // 2. Tổng duration (các dòng nội dung: visual + dialogue) trong [4, 30].
  const totalDuration = input.lines
    .filter((l) => l.tag === "VISUAL" || l.tag === "DIALOGUE")
    .reduce((acc, l) => acc + (l.durationSec || 0), 0);
  if (totalDuration < 4 || totalDuration > 30) {
    errors.push({
      code: "DURATION_OUT_OF_RANGE",
      message: `Tổng thời lượng đoạn phải trong khoảng 4–30 giây (hiện tại: ${totalDuration}s).`,
      details: { totalDuration },
    });
  }

  // 3. Asset được @asset trong segment: nhân vật phải có ảnh tham khảo;
  //    nhân vật xuất hiện trong dòng dialogue phải có giọng gắn sẵn.
  const referencedIds = new Set<string>();
  for (const l of input.lines) {
    for (const m of l.text.matchAll(ASSET_TAG_RE)) referencedIds.add(m[1]);
  }

  const missingImage: string[] = [];
  for (const id of referencedIds) {
    const asset = input.assetsById[id];
    if (!asset) {
      missingImage.push(id);
      continue;
    }
    if ((asset.category === "CHARACTER" || asset.category === "SCENE" || asset.category === "PROP") && !asset.imageUrl) {
      missingImage.push(asset.name);
    }
  }
  if (missingImage.length > 0) {
    errors.push({
      code: "MISSING_REFERENCE_IMAGE",
      message: `Các tài sản sau chưa có ảnh tham khảo: ${missingImage.join(", ")}.`,
      details: { missing: missingImage },
    });
  }

  const dialogueCharacters = new Set(
    input.lines.filter((l) => l.tag === "DIALOGUE" && l.characterName).map((l) => l.characterName as string)
  );
  const missingVoice: string[] = [];
  for (const name of dialogueCharacters) {
    const hasVoice = Object.values(input.assetsById).some(
      (a) =>
        a.name === name &&
        ((a.category === "CHARACTER" && a.voiceUrl) || (a.category === "VOICE" && a.voiceUrl))
    );
    if (!hasVoice) missingVoice.push(name);
  }
  if (missingVoice.length > 0) {
    errors.push({
      code: "MISSING_VOICE",
      message: `Các nhân vật sau chưa gắn giọng (âm thanh tham khảo): ${missingVoice.join(", ")}.`,
      details: { missing: missingVoice },
    });
  }

  // 4. Đã xác nhận ratio/resolution/model/style trước khi enqueue.
  const missingSettings: string[] = [];
  if (!input.ratio) missingSettings.push("ratio");
  if (!input.resolution) missingSettings.push("resolution");
  if (!input.model) missingSettings.push("model");
  if (!input.visualStyle) missingSettings.push("visualStyle");
  if (missingSettings.length > 0) {
    errors.push({
      code: "MISSING_SETTINGS",
      message: `Thiếu cấu hình bắt buộc trước khi tạo: ${missingSettings.join(", ")}.`,
      details: { missing: missingSettings },
    });
  }

  return errors;
}
