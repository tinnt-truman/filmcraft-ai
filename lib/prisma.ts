import { PrismaClient } from "@prisma/client";

// Singleton Prisma client — tránh tạo nhiều connection khi Next.js hot-reload
// ở chế độ dev (mỗi lần recompile route sẽ import lại module).

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
