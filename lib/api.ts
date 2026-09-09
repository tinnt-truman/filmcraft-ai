import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const COOKIE = "fc_session";

const COOKIE_BASE = { httpOnly: true, path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, { ...COOKIE_BASE, maxAge: 30 * 86400 });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
}

export function err(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET chưa được cấu hình");
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string) {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
}

export async function currentUserId(): Promise<string | null> {
  try {
    const c = await cookies();
    const t = c.get(COOKIE)?.value;
    if (!t) return null;
    const { payload } = await jwtVerify(t, secret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const id = await currentUserId();
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id } });
  return u;
}
