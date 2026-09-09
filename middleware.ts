import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Bảo vệ toàn bộ /api/** trừ:
//  - /api/auth/*      (NextAuth: đăng ký/đăng nhập/đăng xuất/session)
//  - /api/tools/*      (demo công khai, dùng thử không cần đăng nhập)
//  - /api/webhooks/*   (callback từ cổng thanh toán — xác thực bằng chữ ký
//                        riêng của provider, không dùng session)
const PUBLIC_PREFIXES = ["/api/auth", "/api/tools", "/api/webhooks"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Cần đăng nhập để dùng API này." } },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
