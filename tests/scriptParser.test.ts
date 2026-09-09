import { describe, expect, it } from "vitest";
import {
  estimateShotDurationSec,
  parseScriptRaw,
  shotSizeFromLabel,
  type ParsedShot,
} from "../lib/scriptParser";

describe("shotSizeFromLabel", () => {
  it("ánh xạ đúng các nhãn tiếng Việt sang ShotSizeLiteral", () => {
    expect(shotSizeFromLabel("Toàn cảnh xa")).toBe("WIDE");
    expect(shotSizeFromLabel("toàn cảnh")).toBe("WIDE");
    expect(shotSizeFromLabel("Cảnh trung")).toBe("MEDIUM");
    expect(shotSizeFromLabel("Trung cảnh")).toBe("MEDIUM");
    expect(shotSizeFromLabel("Cận cảnh")).toBe("CLOSE_UP");
    expect(shotSizeFromLabel("Đặc tả")).toBe("EXTREME_CLOSE_UP");
  });

  it("mặc định về MEDIUM khi nhãn không xác định", () => {
    expect(shotSizeFromLabel("nhãn lạ hoắc")).toBe("MEDIUM");
    expect(shotSizeFromLabel("")).toBe("MEDIUM");
  });

  it("không phân biệt hoa/thường và khoảng trắng thừa", () => {
    expect(shotSizeFromLabel("  CẬN CẢNH  ")).toBe("CLOSE_UP");
  });
});

describe("parseScriptRaw", () => {
  const sample = `### Cảnh 1-1
Sáng Ngoại Bến cảng・khu chợ cá
Nhân vật xuất hiện: Lina, Ông Corvin
△ Toàn cảnh xa: Bến cảng nhộn nhịp buổi sáng, ánh nắng vàng phủ lên các con thuyền.
Lina (giọng hào hứng): Ông ơi, hôm nay biển có đẹp không?
Ông Corvin: Đẹp lắm cháu à.
△ Cận cảnh: Gương mặt Lina rạng rỡ nhìn ra biển.

### Cảnh 1-2
Trưa Nội Nhà kho cũ
[Cảnh trống: chỉ có tiếng sóng vỗ]
`;

  it("phân tách đúng số lượng Scene theo header ### Cảnh", () => {
    const scenes = parseScriptRaw(sample);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[1].sceneNumber).toBe(2);
  });

  it("parse đúng header cảnh (thời gian / nội-ngoại / địa điểm / địa điểm phụ)", () => {
    const [scene1] = parseScriptRaw(sample);
    expect(scene1.timeOfDay).toBe("Sáng");
    expect(scene1.interiorExterior).toBe("Ngoại");
    expect(scene1.location).toBe("Bến cảng");
    expect(scene1.subLocation).toBe("khu chợ cá");
  });

  it("parse đúng danh sách nhân vật xuất hiện", () => {
    const [scene1] = parseScriptRaw(sample);
    expect(scene1.charactersPresent).toEqual(["Lina", "Ông Corvin"]);
  });

  it("parse đúng các shot (△) theo thứ tự và ánh xạ shotSize", () => {
    const [scene1] = parseScriptRaw(sample);
    expect(scene1.shots).toHaveLength(2);
    expect(scene1.shots[0].shotSize).toBe("WIDE");
    expect(scene1.shots[0].order).toBe(1);
    expect(scene1.shots[1].shotSize).toBe("CLOSE_UP");
    expect(scene1.shots[1].order).toBe(2);
  });

  it("gắn dòng thoại vào shot gần nhất phía trên, giữ đúng thứ tự và direction", () => {
    const [scene1] = parseScriptRaw(sample);
    const firstShot = scene1.shots[0];
    expect(firstShot.dialogue).toHaveLength(2);
    expect(firstShot.dialogue[0]).toMatchObject({
      order: 1,
      characterName: "Lina",
      direction: "giọng hào hứng",
      text: "Ông ơi, hôm nay biển có đẹp không?",
    });
    expect(firstShot.dialogue[1]).toMatchObject({
      order: 2,
      characterName: "Ông Corvin",
      direction: null,
      text: "Đẹp lắm cháu à.",
    });
    // Shot thứ 2 (cận cảnh) không có thoại đi kèm.
    expect(scene1.shots[1].dialogue).toHaveLength(0);
  });

  it("tạo shot MONTAGE ngầm định cho [Cảnh trống: ...]", () => {
    const [, scene2] = parseScriptRaw(sample);
    expect(scene2.shots).toHaveLength(1);
    expect(scene2.shots[0].shotSize).toBe("MONTAGE");
    expect(scene2.shots[0].description).toBe("chỉ có tiếng sóng vỗ");
  });

  it("tạo shot ngầm định (MEDIUM) khi gặp thoại độc lập không có △ đứng trước", () => {
    const scriptRaw = `### Cảnh 2-1
Đêm Nội Phòng ngủ
Thần Biển Ashka: Con đã sẵn sàng chưa?`;
    const [scene] = parseScriptRaw(scriptRaw);
    expect(scene.shots).toHaveLength(1);
    expect(scene.shots[0].shotSize).toBe("MEDIUM");
    expect(scene.shots[0].dialogue[0]).toMatchObject({
      characterName: "Thần Biển Ashka",
      text: "Con đã sẵn sàng chưa?",
    });
  });

  it("bỏ qua nội dung trước block '### Cảnh' đầu tiên và các dòng không khớp pattern nào", () => {
    const scriptRaw = `Đây là ghi chú của biên kịch, không thuộc cảnh nào cả.
### Cảnh 3-1
Sáng Ngoại Rừng thông
một dòng rác không theo pattern nào ở đây $$$
△ Trung cảnh: Nhân vật bước đi giữa rừng.`;
    const scenes = parseScriptRaw(scriptRaw);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].shots).toHaveLength(1);
  });

  it("trả về mảng rỗng khi input rỗng hoặc không có header cảnh nào", () => {
    expect(parseScriptRaw("")).toEqual([]);
    expect(parseScriptRaw("chỉ toàn text tự do, không có ### Cảnh nào")).toEqual([]);
  });

  it("xử lý được dấu xuống dòng kiểu Windows (\\r\\n)", () => {
    const scriptRaw = "### Cảnh 4-1\r\nSáng Ngoại Công viên\r\n△ Toàn cảnh: Test.\r\n";
    const scenes = parseScriptRaw(scriptRaw);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].shots).toHaveLength(1);
  });
});

describe("estimateShotDurationSec", () => {
  const baseShot: ParsedShot = {
    order: 1,
    shotSize: "MEDIUM",
    description: "test",
    dialogue: [],
  };

  it("dùng base 2.5s khi shot không có thoại", () => {
    expect(estimateShotDurationSec(baseShot)).toBe(2.5);
  });

  it("dùng base 3s + thời gian theo số từ khi shot có thoại", () => {
    const shot: ParsedShot = {
      ...baseShot,
      dialogue: [
        { order: 1, characterName: "A", direction: null, text: "một hai ba" }, // 3 từ
      ],
    };
    // base 3 + 3 từ * 0.12 = 3.36 -> làm tròn 1 chữ số thập phân = 3.4
    expect(estimateShotDurationSec(shot)).toBe(3.4);
  });

  it("cộng dồn số từ từ nhiều dòng thoại", () => {
    const shot: ParsedShot = {
      ...baseShot,
      dialogue: [
        { order: 1, characterName: "A", direction: null, text: "một hai" }, // 2 từ
        { order: 2, characterName: "B", direction: null, text: "ba bốn năm" }, // 3 từ
      ],
    };
    // base 3 + 5 từ * 0.12 = 3.6
    expect(estimateShotDurationSec(shot)).toBe(3.6);
  });
});
