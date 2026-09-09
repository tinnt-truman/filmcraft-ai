import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth quản lý toàn bộ /api/auth/* (signin, callback, session, csrf,
// signout...). Đăng nhập: POST /api/auth/callback/credentials (hoặc dùng
// next-auth/react `signIn("credentials", {...})` ở client — xem app/login).
// Đăng xuất: POST /api/auth/signout (next-auth/react `signOut()`).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
