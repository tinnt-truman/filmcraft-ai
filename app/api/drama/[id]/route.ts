import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const p = await prisma.dramaProject.findFirst({ where: { id, userId: u.id }, include: { summary: true, characters: true, episodes: { orderBy: { index: "asc" } } } });
  if (!p) return err("NOT_FOUND", "Không tìm thấy dự án", 404);
  return NextResponse.json(p);
}
