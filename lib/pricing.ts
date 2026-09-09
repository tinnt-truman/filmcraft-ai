// lib/pricing.ts
//
// Logic tính phí (PRICING table) + quyết toán ví (settlement) tách riêng
// thành các hàm THUẦN (pure function), không import "./prisma" / "./queue",
// để test được độc lập, không cần `prisma generate` / kết nối DB.
//
// lib/jobs.ts import từ đây để tránh lặp logic giữa nơi thực thi (có DB)
// và nơi test (không có DB).

// Giữ literal trùng khớp enum Prisma `JobType` nhưng không import
// @prisma/client ở đây — xem lib/scriptParser.ts để biết lý do (module
// test độc lập, không cần `prisma generate`).
export type JobTypeLiteral =
  | "SCRIPT"
  | "SUMMARY"
  | "CHARACTER_IMAGE"
  | "SHOT_IMAGE"
  | "SHOT_VIDEO"
  | "VOICE"
  | "STORYBOARD";

/** Bảng giá theo loại job, đơn vị "token". Có thể override qua .env (JSON) nếu cần. */
export const PRICING: Record<JobTypeLiteral, number> = {
  SCRIPT: 500,
  SUMMARY: 200,
  CHARACTER_IMAGE: 800,
  SHOT_IMAGE: 800,
  SHOT_VIDEO: 4000,
  VOICE: 400,
  STORYBOARD: 300,
};

export function estimateCost(type: JobTypeLiteral): number {
  return PRICING[type];
}

export type SettlementStatus = "SUCCEEDED" | "FAILED";

export type ComputeSettlementInput = {
  jobId: string;
  estimatedCost: number;
  status: SettlementStatus;
  actualCost?: number;
  error?: string;
};

export type SettlementResult = {
  /** Số tiền thực sự bị trừ vào balance. FAILED luôn = 0 (không mất tiền). */
  actualCost: number;
  /** Phần chênh lệch được hoàn lại so với khoản đã tạm giữ (estimatedCost). */
  refund: number;
  /** Loại Transaction ghi vào ví. */
  transactionType: "USAGE_SETTLE" | "REFUND";
  /** amount ghi vào Transaction — luôn <= 0 (trừ tiền) hoặc = 0 (hoàn toàn bộ, không trừ). */
  transactionAmount: number;
  description: string;
};

/**
 * Tính kết quả quyết toán 1 GenerationJob khi SUCCEEDED/FAILED.
 *
 * Quy tắc (xem BACKEND_PROMPT.md, mục "Cơ chế tính phí"):
 *  - SUCCEEDED: actualCost = input.actualCost (mặc định = estimatedCost nếu
 *    provider không trả về chi phí thực tế) -> trừ đúng actualCost vào
 *    balance, phần chênh lệch (estimatedCost - actualCost) được giải phóng
 *    khỏi heldAmount mà không bị trừ.
 *  - FAILED: actualCost = 0 -> không mất tiền, toàn bộ khoản tạm giữ được
 *    giải phóng (hoàn lại).
 *
 * heldAmount luôn được giải phóng đúng = estimatedCost ở cả 2 trường hợp
 * (xử lý riêng ở lib/jobs.ts, không thuộc phạm vi hàm thuần này).
 */
export function computeSettlement(input: ComputeSettlementInput): SettlementResult {
  const actualCost =
    input.status === "SUCCEEDED" ? input.actualCost ?? input.estimatedCost : 0;
  const refund = input.estimatedCost - actualCost;
  const transactionType: SettlementResult["transactionType"] =
    input.status === "FAILED" ? "REFUND" : "USAGE_SETTLE";
  const transactionAmount = input.status === "FAILED" ? 0 : -actualCost;
  const description =
    input.status === "FAILED"
      ? `Job ${input.jobId} thất bại — hoàn lại toàn bộ khoản tạm giữ (${input.estimatedCost}): ${
          input.error ?? "unknown error"
        }`
      : `Quyết toán job ${input.jobId} (ước tính ${input.estimatedCost}, thực tế ${actualCost}, chênh lệch hoàn lại ${refund})`;

  return { actualCost, refund, transactionType, transactionAmount, description };
}
