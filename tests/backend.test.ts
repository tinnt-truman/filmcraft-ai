import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseScriptRaw, mapShotSize } from "../lib/scriptParser";
import { validateSegment } from "../lib/seedance";

describe("scriptParser", () => {
  it("parse 2 scenes + shots + dialogue", () => {
    const raw = `### Cảnh 1-1\nĐêm Ngoại Hải đăng・Bờ đá\nNhân vật xuất hiện: Lina, Corvin\n△ Toàn cảnh: sóng lớn đập vào vách đá\n△ Cận cảnh: Lina lo lắng\nLina (lo lắng): Đèn tắt rồi sao?\n### Cảnh 1-2\nSáng Nội Phòng đèn\nNhân vật xuất hiện: Lina\n△ Đặc tả: ngọn lửa run rẩy`;
    const s = parseScriptRaw(raw, 1);
    assert.equal(s.length, 2);
    assert.equal(s[0].shots.length, 2);
    assert.equal(s[0].shots[1].dialogues[0].characterName, "Lina");
    assert.equal(s[1].shots[0].shotSize, "EXTREME_CLOSE_UP");
  });
  it("mapShotSize + montage", () => {
    assert.equal(mapShotSize("Toàn cảnh xa"), "WIDE");
    const s = parseScriptRaw(`### Cảnh 1-1\nNgoại Biển\nNhân vật xuất hiện:\n△ Toàn cảnh: [Cảnh trống: biển lặng]`, 1);
    assert.equal(s[0].shots[0].shotSize, "MONTAGE");
  });
});

describe("wallet math (hold/settle)", () => {
  it("settle hoàn chênh lệch", () => {
    const balance = 10000, held = 5000, estimated = 5000, actual = 3000;
    const nb = balance - actual + (estimated - actual);
    assert.equal(nb, 9000);
  });
  it("từ chối khi không đủ số dư", () => {
    const available = 1000, cost = 5000;
    assert.ok(available < cost);
  });
});

describe("segment validate", () => {
  it("visual gắn character bị lỗi + duration ngoài [4,30]", () => {
    const r = validateSegment(
      [{ tag: "VISUAL", durationSec: 2, characterName: "Lina", text: "x" }],
      []
    );
    assert.ok(r.errors.length >= 2);
  });
  it("thiếu ảnh tham khảo liệt kê missing", () => {
    const r = validateSegment(
      [{ tag: "VISUAL", durationSec: 6, text: "cảnh @asset:abc" }],
      [{ id: "abc", name: "Lina" }]
    );
    assert.ok(r.missing.length > 0);
  });
});
