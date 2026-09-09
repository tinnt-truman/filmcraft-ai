import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { getWallet } from "@/lib/wallet";
import { topUpAmounts } from "@/lib/mockData";

export async function GET() {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const w = await getWallet(u.id);
  const tx = await prisma.transaction.findMany({ where: { walletId: w.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(tx);
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { amount } = await req.json().catch(() => ({}));
  if (!amount || !topUpAmounts.includes(amount)) return err("VALIDATION", "Mệnh giá không hợp lệ", 422);
  const w = await getWallet(u.id);
  await prisma.wallet.update({ where: { id: w.id }, data: { balance: { increment: amount } } });
  await prisma.transaction.create({ data: { walletId: w.id, type: "TOPUP", amount, description: `Nạp ${amount}đ (demo, chưa qua cổng thật)` } });
  return NextResponse.json({ ok: true, amount });
}
