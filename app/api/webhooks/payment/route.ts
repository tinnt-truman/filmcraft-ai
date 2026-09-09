import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

function verifySignature(data: Record<string, unknown>, signature: unknown, key: string): boolean {
  if (typeof signature !== "string" || !signature) return false;
  const raw = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("&");
  const expected = crypto.createHmac("sha256", key).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) {
    return NextResponse.json({ error: { code: "NOT_CONFIGURED", message: "Webhook chưa được cấu hình checksum key" } }, { status: 500 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: { code: "VALIDATION", message: "Payload không hợp lệ" } }, { status: 422 });
  const { walletId, amount, signature } = body as { walletId?: string; amount?: unknown; signature?: unknown };
  if (!verifySignature({ walletId, amount }, signature, checksumKey)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sai chữ ký" } }, { status: 403 });
  }
  const amountNum = Number(amount);
  if (!walletId || !amountNum || amountNum <= 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Thiếu dữ liệu" } }, { status: 422 });
  }
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Không tìm thấy ví" } }, { status: 404 });
  await prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amountNum } } });
  await prisma.transaction.create({ data: { walletId, type: "TOPUP", amount: amountNum, description: "Webhook thanh toán" } });
  return NextResponse.json({ ok: true });
}
