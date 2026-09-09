import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";

const TopupSchema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(["card", "bank", "wallet", "invoice"]).default("card"),
});

function hasRealGateway() {
  return Boolean(process.env.VNPAY_TMN_CODE || process.env.PAYOS_CLIENT_ID);
}

// POST /api/wallet/topup — tạo phiên thanh toán.
//
// Không có VNPAY_TMN_CODE/PAYOS_CLIENT_ID trong .env (mặc định khi chạy
// local/demo) -> "demo mode": cộng tiền NGAY LẬP TỨC, không qua cổng thanh
// toán thật — khớp đúng label nút hiện có trên FE: "Nạp ₫... (demo)".
// Có key thật -> TODO: tạo payment session VNPay/PayOS, trả checkoutUrl, và
// chờ POST /api/webhooks/payment xác nhận trước khi cộng tiền.
export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => null);
  const parsed = TopupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu nạp tiền không hợp lệ.", parsed.error.flatten());
  }

  if (hasRealGateway()) {
    // TODO: tích hợp VNPay/PayOS thật — tạo payment session, trả checkoutUrl.
    return apiError(501, "NOT_IMPLEMENTED", "Cổng thanh toán thật chưa được tích hợp — hoàn thiện app/api/wallet/topup/route.ts.");
  }

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: { balance: { increment: parsed.data.amount } },
    create: { userId, balance: parsed.data.amount, heldAmount: 0 },
  });
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: "TOPUP",
      amount: parsed.data.amount,
      description: `Nạp tiền (demo, phương thức: ${parsed.data.method})`,
    },
  });

  return apiOk({
    demo: true,
    balance: wallet.balance,
    heldAmount: wallet.heldAmount,
    available: wallet.balance - wallet.heldAmount,
  });
});
