import { z } from "zod";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from "@/lib/apiError";

// POST /api/webhooks/payment — callback xác nhận thanh toán từ cổng
// VNPay/PayOS (khi đã cắm key thật — xem app/api/wallet/topup/route.ts).
// Route này KHÔNG dùng session (middleware.ts đã whitelist /api/webhooks/*)
// — xác thực bằng chữ ký HMAC-SHA256 (PAYMENT_WEBHOOK_SECRET), fail-closed
// nếu chưa cấu hình secret (không rơi vào trạng thái "bỏ qua xác thực").
//
// TODO: khi tích hợp VNPay/PayOS thật, thay verifySignature() dưới đây bằng
// xác thực chữ ký thật của VNPay (vnp_SecureHash) hoặc PayOS (checksum) theo
// đúng quy ước của từng cổng.

const WebhookSchema = z.object({
  userId: z.string(),
  amount: z.number().int().positive(),
  reference: z.string().optional(),
  signature: z.string(),
});

function verifySignature(data: Record<string, unknown>, signature: string, key: string): boolean {
  const raw = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("&");
  const expected = crypto.createHmac("sha256", key).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return apiError(500, "NOT_CONFIGURED", "Webhook chưa được cấu hình PAYMENT_WEBHOOK_SECRET.");
  }

  const body = await req.json().catch(() => null);
  const parsed = WebhookSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Payload webhook không hợp lệ.", parsed.error.flatten());
  }

  const { userId, amount, reference, signature } = parsed.data;
  if (!verifySignature({ userId, amount, reference: reference ?? "" }, signature, webhookSecret)) {
    return apiError(401, "INVALID_SIGNATURE", "Chữ ký webhook không khớp.");
  }

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: { balance: { increment: amount } },
    create: { userId, balance: amount, heldAmount: 0 },
  });
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: "TOPUP",
      amount,
      description: `Nạp tiền qua cổng thanh toán${reference ? ` (ref: ${reference})` : ""}`,
    },
  });

  return apiOk({ ok: true, balance: wallet.balance });
}
