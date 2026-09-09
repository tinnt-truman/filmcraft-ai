import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & mật khẩu",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = (user as { id: string }).id;
      // Đọc role tươi từ DB mỗi lần refresh token (không tin cứng role cũ
      // trong token) — để hạ quyền admin có hiệu lực gần như ngay lập tức,
      // không phải đợi hết hạn JWT 30 ngày.
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.userId as string }, select: { role: true } });
        token.role = dbUser?.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
};

/** Helper dùng trong Route Handlers: trả về User hiện tại hoặc null. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Helper: trả về userId hoặc throw AuthError (route bắt và trả 401). */
export class AuthError extends Error {}

/** Throw khi user đã đăng nhập nhưng không có quyền admin (route bắt và trả 403). */
export class ForbiddenError extends Error {}

export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new AuthError("Chưa đăng nhập");
  return userId;
}

/**
 * Trả về userId nếu user đang đăng nhập VÀ có role ADMIN. Luôn đọc role trực
 * tiếp từ DB (không tin token/session) để tránh admin đã bị hạ quyền vẫn
 * dùng được route quản trị nhờ token cũ còn hạn.
 */
export async function requireAdminUserId(): Promise<string> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new ForbiddenError("Yêu cầu quyền quản trị.");
  return userId;
}
