import { describe, expect, it } from "vitest";
import { computeSettlement, estimateCost, PRICING, type JobTypeLiteral } from "../lib/pricing";

describe("PRICING / estimateCost", () => {
  it("khớp đúng bảng giá theo BACKEND_PROMPT.md (đơn vị token)", () => {
    expect(PRICING).toEqual({
      SCRIPT: 500,
      SUMMARY: 200,
      CHARACTER_IMAGE: 800,
      SHOT_IMAGE: 800,
      SHOT_VIDEO: 4000,
      VOICE: 400,
      STORYBOARD: 300,
    });
  });

  it("estimateCost trả đúng giá trị PRICING theo loại job", () => {
    const types: JobTypeLiteral[] = [
      "SCRIPT",
      "SUMMARY",
      "CHARACTER_IMAGE",
      "SHOT_IMAGE",
      "SHOT_VIDEO",
      "VOICE",
      "STORYBOARD",
    ];
    for (const type of types) {
      expect(estimateCost(type)).toBe(PRICING[type]);
    }
  });

  it("SHOT_VIDEO là loại job đắt nhất (video AI tốn nhiều token nhất)", () => {
    const max = Math.max(...Object.values(PRICING));
    expect(PRICING.SHOT_VIDEO).toBe(max);
  });
});

describe("computeSettlement — quyết toán ví theo job SUCCEEDED/FAILED", () => {
  it("SUCCEEDED không truyền actualCost -> mặc định actualCost = estimatedCost, refund = 0", () => {
    const result = computeSettlement({ jobId: "job1", estimatedCost: 4000, status: "SUCCEEDED" });
    expect(result.actualCost).toBe(4000);
    expect(result.refund).toBe(0);
    expect(result.transactionType).toBe("USAGE_SETTLE");
    expect(result.transactionAmount).toBe(-4000);
  });

  it("SUCCEEDED với actualCost thấp hơn estimatedCost -> hoàn phần chênh lệch, chỉ trừ đúng actualCost", () => {
    const result = computeSettlement({ jobId: "job2", estimatedCost: 4000, status: "SUCCEEDED", actualCost: 3200 });
    expect(result.actualCost).toBe(3200);
    expect(result.refund).toBe(800);
    expect(result.transactionType).toBe("USAGE_SETTLE");
    expect(result.transactionAmount).toBe(-3200);
  });

  it("FAILED -> actualCost luôn = 0 (không mất tiền) bất kể actualCost truyền vào, hoàn toàn bộ khoản tạm giữ", () => {
    const result = computeSettlement({
      jobId: "job3",
      estimatedCost: 800,
      status: "FAILED",
      actualCost: 500, // phải bị bỏ qua vì job thất bại
      error: "Provider timeout",
    });
    expect(result.actualCost).toBe(0);
    expect(result.refund).toBe(800);
    expect(result.transactionType).toBe("REFUND");
    expect(result.transactionAmount).toBe(0);
    expect(result.description).toContain("thất bại");
    expect(result.description).toContain("Provider timeout");
  });

  it("FAILED không có message lỗi -> mô tả vẫn có fallback 'unknown error'", () => {
    const result = computeSettlement({ jobId: "job4", estimatedCost: 300, status: "FAILED" });
    expect(result.description).toContain("unknown error");
  });

  it("mô tả SUCCEEDED liệt kê đúng ước tính / thực tế / chênh lệch hoàn lại", () => {
    const result = computeSettlement({ jobId: "job5", estimatedCost: 800, status: "SUCCEEDED", actualCost: 650 });
    expect(result.description).toContain("ước tính 800");
    expect(result.description).toContain("thực tế 650");
    expect(result.description).toContain("chênh lệch hoàn lại 150");
  });

  it("transactionAmount không bao giờ dương (chỉ trừ tiền hoặc = 0, không bao giờ cộng tiền)", () => {
    const succeeded = computeSettlement({ jobId: "j", estimatedCost: 500, status: "SUCCEEDED" });
    const failed = computeSettlement({ jobId: "j", estimatedCost: 500, status: "FAILED" });
    expect(succeeded.transactionAmount).toBeLessThanOrEqual(0);
    expect(failed.transactionAmount).toBeLessThanOrEqual(0);
  });
});
