import { describe, expect, it } from "vitest";
import { validateSegmentForGenerate, type ValidateSegmentInput } from "../lib/segmentValidate";
import type { AssemblerAsset, AssemblerLine } from "../lib/promptAssembler";

function makeLine(overrides: Partial<AssemblerLine>): AssemblerLine {
  return {
    order: 1,
    tag: "VISUAL",
    durationSec: 5,
    characterName: null,
    direction: null,
    shotType: null,
    text: "",
    ...overrides,
  };
}

const validCharacterAsset: AssemblerAsset = {
  id: "char1",
  name: "Lina",
  category: "CHARACTER",
  imageUrl: "https://img/lina.png",
  voiceUrl: "https://audio/lina.mp3",
};

const baseSettings = {
  ratio: "9:16",
  resolution: "720p",
  model: "Seedance 2.5",
  visualStyle: "Anime 2D",
};

function makeInput(overrides: Partial<ValidateSegmentInput>): ValidateSegmentInput {
  return {
    lines: [],
    assetsById: {},
    ...baseSettings,
    ...overrides,
  };
}

describe("validateSegmentForGenerate", () => {
  it("không có lỗi nào với 1 segment hợp lệ đầy đủ (visual + dialogue có ảnh/giọng, duration trong khoảng, đủ settings)", () => {
    const lines: AssemblerLine[] = [
      makeLine({ order: 1, tag: "VISUAL", durationSec: 3, text: "Cảnh mở đầu @asset:char1" }),
      makeLine({ order: 2, tag: "DIALOGUE", durationSec: 4, characterName: "Lina", text: "Xin chào @asset:char1" }),
    ];
    const errors = validateSegmentForGenerate(
      makeInput({ lines, assetsById: { char1: validCharacterAsset } })
    );
    expect(errors).toEqual([]);
  });

  it("báo VISUAL_LINE_HAS_CHARACTER khi dòng visual bị gắn characterName", () => {
    const lines: AssemblerLine[] = [
      makeLine({ order: 1, tag: "VISUAL", durationSec: 5, characterName: "Lina", text: "cảnh" }),
    ];
    const errors = validateSegmentForGenerate(makeInput({ lines }));
    expect(errors.map((e) => e.code)).toContain("VISUAL_LINE_HAS_CHARACTER");
    expect(errors.find((e) => e.code === "VISUAL_LINE_HAS_CHARACTER")?.details).toEqual({ order: 1 });
  });

  it("báo DURATION_OUT_OF_RANGE khi tổng duration < 4s", () => {
    const lines: AssemblerLine[] = [makeLine({ tag: "VISUAL", durationSec: 2, text: "quá ngắn" })];
    const errors = validateSegmentForGenerate(makeInput({ lines }));
    expect(errors.map((e) => e.code)).toContain("DURATION_OUT_OF_RANGE");
  });

  it("báo DURATION_OUT_OF_RANGE khi tổng duration > 30s", () => {
    const lines: AssemblerLine[] = [makeLine({ tag: "VISUAL", durationSec: 31, text: "quá dài" })];
    const errors = validateSegmentForGenerate(makeInput({ lines }));
    expect(errors.map((e) => e.code)).toContain("DURATION_OUT_OF_RANGE");
  });

  it("không tính duration của BGM/SUBTITLE_CONFIG vào tổng thời lượng", () => {
    const lines: AssemblerLine[] = [
      makeLine({ tag: "VISUAL", durationSec: 5, text: "cảnh" }),
      makeLine({ tag: "BGM", durationSec: 100, text: "nhạc" }),
      makeLine({ tag: "SUBTITLE_CONFIG", durationSec: 100, text: "phụ đề" }),
    ];
    const errors = validateSegmentForGenerate(makeInput({ lines }));
    expect(errors.map((e) => e.code)).not.toContain("DURATION_OUT_OF_RANGE");
  });

  it("báo MISSING_REFERENCE_IMAGE khi @asset trỏ tới id không tồn tại trong assetsById", () => {
    const lines: AssemblerLine[] = [makeLine({ tag: "VISUAL", durationSec: 5, text: "cảnh @asset:khong-ton-tai" })];
    const errors = validateSegmentForGenerate(makeInput({ lines, assetsById: {} }));
    const err = errors.find((e) => e.code === "MISSING_REFERENCE_IMAGE");
    expect(err).toBeDefined();
    expect(err?.details).toEqual({ missing: ["khong-ton-tai"] });
  });

  it("báo MISSING_REFERENCE_IMAGE khi asset tồn tại nhưng chưa có imageUrl (CHARACTER/SCENE/PROP)", () => {
    const assetNoImage: AssemblerAsset = { ...validCharacterAsset, imageUrl: null };
    const lines: AssemblerLine[] = [makeLine({ tag: "VISUAL", durationSec: 5, text: "cảnh @asset:char1" })];
    const errors = validateSegmentForGenerate(makeInput({ lines, assetsById: { char1: assetNoImage } }));
    const err = errors.find((e) => e.code === "MISSING_REFERENCE_IMAGE");
    expect(err?.details).toEqual({ missing: ["Lina"] });
  });

  it("báo MISSING_VOICE khi nhân vật xuất hiện trong dialogue nhưng không có asset voiceUrl khớp tên", () => {
    const lines: AssemblerLine[] = [
      makeLine({ tag: "DIALOGUE", durationSec: 5, characterName: "Nhân Vật Lạ", text: "xin chào" }),
    ];
    const errors = validateSegmentForGenerate(makeInput({ lines, assetsById: {} }));
    const err = errors.find((e) => e.code === "MISSING_VOICE");
    expect(err?.details).toEqual({ missing: ["Nhân Vật Lạ"] });
  });

  it("không báo MISSING_VOICE khi nhân vật có voiceUrl gắn qua asset CHARACTER trùng tên", () => {
    const lines: AssemblerLine[] = [
      makeLine({ tag: "DIALOGUE", durationSec: 5, characterName: "Lina", text: "xin chào" }),
    ];
    const errors = validateSegmentForGenerate(makeInput({ lines, assetsById: { char1: validCharacterAsset } }));
    expect(errors.map((e) => e.code)).not.toContain("MISSING_VOICE");
  });

  it("báo MISSING_SETTINGS liệt kê đúng từng field còn thiếu", () => {
    const errors = validateSegmentForGenerate(
      makeInput({ lines: [], ratio: null, resolution: null, model: "Seedance 2.5", visualStyle: null })
    );
    const err = errors.find((e) => e.code === "MISSING_SETTINGS");
    expect(err?.details).toEqual({ missing: ["ratio", "resolution", "visualStyle"] });
  });

  it("có thể trả về nhiều lỗi cùng lúc khi segment vi phạm nhiều điều kiện", () => {
    const lines: AssemblerLine[] = [
      makeLine({ tag: "VISUAL", durationSec: 1, characterName: "Lina", text: "cảnh @asset:missing" }),
    ];
    const errors = validateSegmentForGenerate(
      makeInput({ lines, assetsById: {}, ratio: null })
    );
    const codes = errors.map((e) => e.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "VISUAL_LINE_HAS_CHARACTER",
        "DURATION_OUT_OF_RANGE",
        "MISSING_REFERENCE_IMAGE",
        "MISSING_SETTINGS",
      ])
    );
  });
});
