import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const list = await prisma.dramaProject.findMany({
    where: { userId: u.id, ...(status ? { status: status.toUpperCase() as "DRAFT" } : {}), ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    include: { summary: true, _count: { select: { episodes: true, characters: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(list.map((p) => ({ id: p.id, title: p.title, cover: p.coverGradient, status: p.status === "IN_PROGRESS" ? "in_progress" : p.status === "COMPLETED" ? "completed" : "draft", synopsis: p.summary?.logline ?? "", style: p.summary?.visualStyle ?? "", episodeCount: p.summary?.episodeCount ?? p._count.episodes, updatedAt: p.updatedAt })));
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { title, style } = await req.json().catch(() => ({}));
  if (!title) return err("VALIDATION", "Thiếu title", 422);
  const p = await prisma.dramaProject.create({ data: { userId: u.id, title, coverGradient: "from-indigo-400 to-slate-700" } });
  await prisma.projectSummary.create({ data: { projectId: p.id, visualStyle: style ?? "", episodeCount: 8 } });
  return NextResponse.json({ id: p.id, title: p.title }, { status: 201 });
}
