import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiOk } from "@/lib/apiError";

// GET /api/wallet/transactions — lịch sử nạp/trừ.
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return apiOk({ transactions: [] });

  const transactions = await prisma.transaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return apiOk({ transactions });
});
