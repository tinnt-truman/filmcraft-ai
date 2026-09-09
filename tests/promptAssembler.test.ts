import { describe, expect, it } from "vitest";
import {
  assembleSeedanceRequest,
  shouldGenerateAudio,
  type AssemblerAsset,
  type AssemblerLine,
} from "../lib/promptAssembler";

const baseInput = {
  model: "Seedance 2.5",
  ratio: "9:16",
  resolution: "720p",
  segmentDurationSecFallback: 10,
  subtitleMode: "auto" as const,
  visualStyle: "phong cách mặc định",
};

describe("shouldGenerateAudio", () => {
  it("true khi có dòng DIALOGUE", () => {
    const lines: AssemblerLine[] = [
      { order: 1, tag: "DIALOGUE", durationSec: 2, characterName: "A", direction: null, shotType: null, text: "hi" },
    ];
    expect(shouldGenerateAudio(lines)).toBe(true);
  });

  it("true khi có dòng SUBTITLE_CONFIG dù không có thoại", () => {
    const lines: AssemblerLine[] = [
      { order: 1, tag: "SUBTITLE_CONFIG", durationSec: 0, characterName: null, direction: null, shotType: null, text: "phụ đề tự động" },
    ];
    expect(shouldGenerateAudio(lines)).toBe(true);
  });

  it("false khi chỉ có VISUAL/BGM", () => {
    const lines: AssemblerLine[] = [
      { order: 1, tag: "VISUAL", durationSec: 2, characterName: null, direction: null, shotType: "Toàn cảnh", text: "cảnh biển" },
      { order: 2, tag: "BGM", durationSec: 0, characterName: null, direction: null, shotType: null, text: "nhạc nền" },
    ];
    expect(shouldGenerateAudio(lines)).toBe(false);
  });
});

describe("assembleSeedanceRequest", () => {
  const assetsById: Record<string, AssemblerAsset> = {
    char1: {
      id: "char1",
      name: "Lina",
      category: "CHARACTER",
      imageUrl: "https://img/lina.png",
      voiceUrl: "https://audio/lina.mp3",
    },
    scene1: {
      id: "scene1",
      name: "Bến cảng",
      category: "SCENE",
      imageUrl: "https://img/bencang.png",
      voiceUrl: null,
    },
  };

  const lines: AssemblerLine[] = [
    {
      order: 1,
      tag: "VISUAL",
      durationSec: 2,
      characterName: null,
      direction: null,
      shotType: "Toàn cảnh",
      text: "Bến cảng buổi sáng @asset:scene1",
    },
    {
      order: 2,
      tag: "DIALOGUE",
      durationSec: 3,
      characterName: "Lina",
      direction: "vui vẻ",
      shotType: null,
      text: "Xin chào @asset:char1",
    },
    { order: 3, tag: "BGM", durationSec: 0, characterName: null, direction: null, shotType: null, text: "Nhạc nền vui tươi" },
    {
      order: 4,
      tag: "SUBTITLE_CONFIG",
      durationSec: 0,
      characterName: null,
      direction: null,
      shotType: null,
      text: "Phụ đề tự động, font lớn",
    },
  ];

  it("cộng dồn duration từ các dòng VISUAL + DIALOGUE (bỏ qua BGM/SUBTITLE_CONFIG)", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById });
    expect(result.duration).toBe(5); // 2 + 3
  });

  it("fallback về segmentDurationSecFallback khi không có dòng nội dung nào có duration", () => {
    const zeroDurationLines: AssemblerLine[] = [
      { order: 1, tag: "VISUAL", durationSec: 0, characterName: null, direction: null, shotType: null, text: "cảnh tĩnh" },
    ];
    const result = assembleSeedanceRequest({ ...baseInput, lines: zeroDurationLines, assetsById: {} });
    expect(result.duration).toBe(10);
  });

  it("gom ảnh tham khảo: nhân vật trước, scene/prop sau — theo thứ tự @asset xuất hiện", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById });
    expect(result.referenceImage).toEqual(["https://img/lina.png", "https://img/bencang.png"]);
  });

  it("gom âm thanh tham khảo từ nhân vật có voiceUrl được @asset hoặc xuất hiện trong dialogue", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById });
    expect(result.referenceAudio).toEqual(["https://audio/lina.mp3"]);
  });

  it("tra giọng theo tên nhân vật (asset VOICE riêng) khi dialogue không @asset trực tiếp nhân vật", () => {
    const voiceLines: AssemblerLine[] = [
      { order: 1, tag: "DIALOGUE", durationSec: 3, characterName: "Ông Corvin", direction: null, shotType: null, text: "Chào cháu." },
    ];
    const voiceAssets: Record<string, AssemblerAsset> = {
      voice1: { id: "voice1", name: "Ông Corvin", category: "VOICE", imageUrl: null, voiceUrl: "https://audio/corvin.mp3" },
    };
    const result = assembleSeedanceRequest({ ...baseInput, lines: voiceLines, assetsById: voiceAssets });
    expect(result.referenceAudio).toEqual(["https://audio/corvin.mp3"]);
    expect(result.text).toContain("Ông Corvin → Âm 1");
  });

  it("lắp khối [Phong cách hình ảnh video] luôn ở đầu text", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "Anime 2D, màu pastel" });
    expect(result.text.startsWith("[Phong cách hình ảnh video] Anime 2D, màu pastel")).toBe(true);
  });

  it("gộp phụ đề + nhạc nền vào 1 khối [Âm thanh, phụ đề & nhạc nền] khi subtitleMode='auto'", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "x" });
    expect(result.text).toContain("[Âm thanh, phụ đề & nhạc nền] Phụ đề tự động, font lớn; Nhạc nền vui tươi");
  });

  it("bỏ phụ đề khỏi khối âm thanh khi subtitleMode='post' (chỉ giữ nhạc nền)", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "x", subtitleMode: "post" });
    expect(result.text).toContain("[Âm thanh, phụ đề & nhạc nền] Nhạc nền vui tươi");
    expect(result.text).not.toContain("Phụ đề tự động, font lớn");
  });

  it("gắn khối [Ngoại hình nhân vật] và [Bối cảnh] với chỉ số Hình đúng thứ tự (nhân vật trước)", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "x" });
    expect(result.text).toContain("[Ngoại hình nhân vật] Lina → Hình 1");
    expect(result.text).toContain("[Bối cảnh] Bến cảng → Hình 2");
  });

  it("thay thế @asset:ID trong text chính bằng tên asset + số Hình tham khảo", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "x" });
    expect(result.text).toContain("Bến cảng buổi sáng Bến cảng (tham khảo Hình 2)");
    expect(result.text).toContain("Xin chào Lina (tham khảo Hình 1)");
  });

  it("giữ nguyên token @asset:ID nếu không tìm thấy asset tương ứng", () => {
    const orphanLines: AssemblerLine[] = [
      { order: 1, tag: "VISUAL", durationSec: 2, characterName: null, direction: null, shotType: null, text: "Cảnh có @asset:khong-ton-tai" },
    ];
    const result = assembleSeedanceRequest({ ...baseInput, lines: orphanLines, assetsById: {}, visualStyle: "x" });
    expect(result.text).toContain("@asset:khong-ton-tai");
  });

  it("tính mốc thời gian tuyệt đối (mm:ss) tăng dần theo duration cộng dồn, kể cả qua phút", () => {
    const longLines: AssemblerLine[] = [
      { order: 1, tag: "VISUAL", durationSec: 65, characterName: null, direction: null, shotType: null, text: "cảnh 1" },
      { order: 2, tag: "VISUAL", durationSec: 10, characterName: null, direction: null, shotType: null, text: "cảnh 2" },
    ];
    const result = assembleSeedanceRequest({ ...baseInput, lines: longLines, assetsById: {}, visualStyle: "x" });
    expect(result.text).toContain("00:00–01:05");
    expect(result.text).toContain("01:05–01:15");
  });

  it("dòng thoại có direction hiển thị dạng 'Tên (direction): text', không có direction thì chỉ 'Tên: text'", () => {
    const result = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "x" });
    expect(result.text).toContain("Lina (vui vẻ): Xin chào");
  });

  it("generateAudio phản ánh đúng shouldGenerateAudio(lines)", () => {
    const withDialogue = assembleSeedanceRequest({ ...baseInput, lines, assetsById, visualStyle: "x" });
    expect(withDialogue.generateAudio).toBe(true);

    const visualOnly: AssemblerLine[] = [
      { order: 1, tag: "VISUAL", durationSec: 2, characterName: null, direction: null, shotType: null, text: "cảnh tĩnh" },
    ];
    const withoutDialogue = assembleSeedanceRequest({ ...baseInput, lines: visualOnly, assetsById: {}, visualStyle: "x" });
    expect(withoutDialogue.generateAudio).toBe(false);
  });

  it("truyền thẳng model/ratio/resolution từ input sang output", () => {
    const result = assembleSeedanceRequest({
      ...baseInput,
      lines,
      assetsById,
      visualStyle: "x",
      model: "Seedance 1.5",
      ratio: "16:9",
      resolution: "1080p",
    });
    expect(result.model).toBe("Seedance 1.5");
    expect(result.ratio).toBe("16:9");
    expect(result.resolution).toBe("1080p");
  });
});
