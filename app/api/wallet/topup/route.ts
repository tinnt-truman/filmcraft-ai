import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { getWallet } from "@/lib/wallet";
import { topUpAmounts } from "@/lib/mockData";

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_TOPUP !== "true") {
    return err("NOT_CONFIGURED", "Nạp tiền demo đã bị tắt ở production. Cần tích hợp cổng thanh toán thật (PayOS/VNPay) qua /api/webhooks/payment.", 501);
  }
  const { amount } = await req.json().catch(() => ({}));
  if (!amount || !topUpAmounts.includes(amount)) return err("VALIDATION", "Mệnh giá không hợp lệ", 422);
  const w = await getWallet(u.id);
  await prisma.wallet.update({ where: { id: w.id }, data: { balance: { increment: amount } } });
  const tx = await prisma.transaction.create({ data: { walletId: w.id, type: "TOPUP", amount, description: `Nạp ${amount}đ` } });
  return NextResponse.json({ ok: true, transaction: tx, payUrl: null, note: "Demo: cộng thẳng balance. Cắm PayOS/VNPay ở đây." }, { status: 201 });
}
