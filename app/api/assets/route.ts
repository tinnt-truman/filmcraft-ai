import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { searchParams } = new URL(req.url);
  const cat = searchParams.get("category");
  const projectId = searchParams.get("projectId");
  const list = await prisma.asset.findMany({ where: { userId: u.id, ...(cat ? { category: cat.toUpperCase() as "CHARACTER" } : {}), ...(projectId ? { projectId } : {}) }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const b = await req.json().catch(() => ({}));
  if (!b.name) return err("VALIDATION", "Thiếu name", 422);
  const a = await prisma.asset.create({ data: { userId: u.id, projectId: b.projectId, category: (b.category ?? "CHARACTER").toUpperCase() as "CHARACTER", name: b.name, imageUrl: b.imageUrl, metadata: b.metadata } });
  return NextResponse.json(a, { status: 201 });
}
