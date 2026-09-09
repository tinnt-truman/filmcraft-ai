import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiOk } from "@/lib/apiError";

// GET /api/wallet — số dư, đang tạm giữ.
export const GET = withAuth(async (_req, { userId }) => {
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, heldAmount: 0 },
  });
  return apiOk({
    balance: wallet.balance,
    heldAmount: wallet.heldAmount,
    available: wallet.balance - wallet.heldAmount,
  });
});
