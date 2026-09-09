import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPw, verifyPw } from "@/lib/password";
import { signSession, setSessionCookie, err } from "@/lib/api";

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) return err("VALIDATION", "Thiếu email/mật khẩu", 422);
  const ex = await prisma.user.findUnique({ where: { email } });
  if (ex) return err("EXISTS", "Email đã tồn tại", 409);
  const u = await prisma.user.create({ data: { email, passwordHash: await hashPw(password), name } });
  await prisma.wallet.create({ data: { userId: u.id, balance: 0 } });
  const token = await signSession(u.id);
  const res = NextResponse.json({ id: u.id, email: u.email });
  setSessionCookie(res, token);
  return res;
}

export async function GET() {
  return NextResponse.json({ hint: "POST email/password/name" });
}
void verifyPw;
