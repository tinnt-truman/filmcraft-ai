import { NextResponse } from "next/server";
import { requireUser, err } from "@/lib/api";
import { getWallet } from "@/lib/wallet";
import { prisma } from "@/lib/db";

export async function GET() {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const w = await getWallet(u.id);
  return NextResponse.json({ balance: w.balance, heldAmount: w.heldAmount, available: w.balance - w.heldAmount });
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { searchParams } = new URL(req.url);
  void searchParams;
  return NextResponse.json({ hint: "use /api/wallet/topup" });
}
void prisma;
