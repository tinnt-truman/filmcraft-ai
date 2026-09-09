import { prisma } from "./db";
import { estimateCost } from "./pricing";
import type { JobType } from "@prisma/client";

export async function getWallet(userId: string) {
  let w = await prisma.wallet.findUnique({ where: { userId } });
  if (!w) w = await prisma.wallet.create({ data: { userId, balance: 0, heldAmount: 0 } });
  return w;
}

export async function holdForJob(userId: string, type: JobType, extra = 0) {
  const cost = estimateCost(type, extra);
  const w = await getWallet(userId);
  if (w.balance - w.heldAmount < cost) {
    const e = new Error("Số dư không đủ") as Error & { status?: number; code?: string };
    e.status = 402; e.code = "INSUFFICIENT_BALANCE";
    throw e;
  }
  await prisma.wallet.update({ where: { id: w.id }, data: { heldAmount: { increment: cost } } });
  await prisma.transaction.create({ data: { walletId: w.id, type: "USAGE_HOLD", amount: -cost, description: `Tạm giữ cho job ${type}` } });
  return cost;
}

export async function settleJob(walletId: string, jobId: string, estimated: number, actual: number) {
  const diff = estimated - actual;
  await prisma.wallet.update({ where: { id: walletId }, data: { heldAmount: { decrement: estimated }, balance: { decrement: actual } } });
  await prisma.transaction.create({ data: { walletId, type: "USAGE_SETTLE", amount: -actual, description: `Quyết toán job ${jobId}`, jobId } });
  if (diff !== 0) await prisma.transaction.create({ data: { walletId, type: "REFUND", amount: diff, description: `Hoàn chênh lệch job ${jobId}`, jobId } });
}
