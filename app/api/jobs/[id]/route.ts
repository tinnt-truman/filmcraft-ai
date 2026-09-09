import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const { id } = await params;
  const j = await prisma.generationJob.findFirst({ where: { id, userId: u.id } });
  if (!j) return err("NOT_FOUND", "Không tìm thấy job", 404);
  return NextResponse.json({ id: j.id, type: j.type, status: j.status.toLowerCase(), resultUrl: j.resultUrl, error: j.error, estimatedCost: j.estimatedCost, actualCost: j.actualCost });
}
