import { NextResponse } from "next/server";
import { clearSessionCookie, requireUser } from "@/lib/api";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function GET() {
  const u = await requireUser();
  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: u.id, email: u.email, name: u.name } });
}
