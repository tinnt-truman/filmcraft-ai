import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPw } from "@/lib/password";
import { signSession, setSessionCookie, err } from "@/lib/api";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return err("VALIDATION", "Thiếu email/mật khẩu", 422);
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await verifyPw(password, u.passwordHash))) return err("AUTH", "Sai email hoặc mật khẩu", 401);
  const token = await signSession(u.id);
  const res = NextResponse.json({ id: u.id, email: u.email, name: u.name });
  setSessionCookie(res, token);
  return res;
}
