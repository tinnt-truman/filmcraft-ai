// lib/jobs.ts — tạo/settle GenerationJob + trừ/hoàn tiền ví theo job.
//
// Cơ chế tính phí (đúng mục "Cơ chế tính phí" trong BACKEND_PROMPT.md):
//  1. Tạo job -> tính estimatedCost theo loại job -> trừ tạm vào heldAmount
//     (Transaction USAGE_HOLD). Từ chối nếu balance - heldAmount < estimatedCost
//     (throw InsufficientBalanceError -> route trả 402).
//  2. Job SUCCEEDED/FAILED -> tính actualCost thật, hoàn phần chênh lệch
//     (USAGE_SETTLE), cập nhật balance/heldAmount.

import { prisma } from "./prisma";
import { enqueueJob } from "./queue";
import { computeSettlement, estimateCost, PRICING } from "./pricing";
import type { JobType } from "@prisma/client";

export class InsufficientBalanceError extends Error {
  constructor(public required: number, public available: number) {
    super(`Số dư không đủ: cần ${required}, khả dụng ${available}.`);
    this.name = "InsufficientBalanceError";
  }
}

// Bảng giá + hàm ước tính chi phí giờ sống ở ./pricing.ts (hàm thuần, test
// độc lập được — xem tests/pricing.test.ts). Re-export ở đây để giữ nguyên
// chữ ký import cũ (`import { PRICING, estimateCost } from "./jobs"`) cho
// các route/module khác đang dùng.
export { PRICING, estimateCost };

async function holdWallet(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error(`User ${userId} chưa có Wallet — đảm bảo tạo Wallet khi register.`);
    const available = wallet.balance - wallet.heldAmount;
    if (available < amount) throw new InsufficientBalanceError(amount, available);
    await tx.wallet.update({
      where: { userId },
      data: { heldAmount: { increment: amount } },
    });
    return wallet;
  });
}

export type CreateJobInput = {
  userId: string;
  type: JobType;
  targetType: string;
  targetId: string;
  provider?: string;
  requestPayload?: unknown;
  videoProjectId?: string;
  segmentId?: string;
  /** Task thực thi job — được đăng ký vào hàng đợi ngay sau khi tạo job. */
  run: (jobId: string) => Promise<void>;
};

export async function createGenerationJob(input: CreateJobInput) {
  const estimatedCost = estimateCost(input.type);
  await holdWallet(input.userId, estimatedCost);

  const job = await prisma.generationJob.create({
    data: {
      userId: input.userId,
      type: input.type,
      status: "QUEUED",
      targetType: input.targetType,
      targetId: input.targetId,
      estimatedCost,
      provider: input.provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestPayload: (input.requestPayload ?? undefined) as any,
      videoProjectId: input.videoProjectId,
      segmentId: input.segmentId,
    },
  });

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: "USAGE_HOLD",
      amount: -estimatedCost,
      description: `Tạm giữ cho job ${job.id} (${input.type})`,
      jobId: job.id,
    },
  });

  await enqueueJob(job.id, async () => {
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: "RUNNING" } });
    try {
      await input.run(job.id);
    } catch (err) {
      console.error(`[jobs] job ${job.id} (${input.type}) threw:`, err);
      await settleJob(job.id, {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return job;
}

export type SettleJobInput = {
  status: "SUCCEEDED" | "FAILED";
  actualCost?: number;
  resultUrl?: string | null;
  error?: string;
};

export async function settleJob(jobId: string, input: SettleJobInput) {
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status === "SUCCEEDED" || job.status === "FAILED") {
    return job; // đã settle trước đó — tránh trừ/hoàn tiền 2 lần
  }

  const settlement = computeSettlement({
    jobId,
    estimatedCost: job.estimatedCost,
    status: input.status,
    actualCost: input.actualCost,
    error: input.error,
  });

  await prisma.$transaction(async (tx) => {
    await tx.generationJob.update({
      where: { id: jobId },
      data: {
        status: input.status,
        actualCost: settlement.actualCost,
        resultUrl: input.resultUrl,
        error: input.error,
      },
    });

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: job.userId } });
    // Giải phóng khoản tạm giữ (luôn = estimatedCost) và trừ đúng actualCost
    // vào balance thật (actualCost = 0 khi job FAILED -> không mất tiền).
    await tx.wallet.update({
      where: { userId: job.userId },
      data: {
        heldAmount: { decrement: job.estimatedCost },
        balance: { decrement: settlement.actualCost },
      },
    });
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: settlement.transactionType,
        amount: settlement.transactionAmount,
        description: settlement.description,
        jobId,
      },
    });
  });

  return prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
}
