import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { PROJECT_DEFAULT_RATIO, PROJECT_DEFAULT_VIDEO_MODEL } from "@/lib/config";

export async function GET(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  void req;
  const list = await prisma.videoProject.findMany({ where: { userId: u.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(list.map((v) => ({ id: v.id, title: v.title, status: v.status.toLowerCase(), template: v.templateId, ratio: v.ratio, updatedAt: v.updatedAt })));
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u) return err("AUTH", "Chưa đăng nhập", 401);
  const b = await req.json().catch(() => ({}));
  const v = await prisma.videoProject.create({ data: { userId: u.id, title: b.title ?? "Video mới", templateId: b.templateId ?? "", topic: b.topic ?? "", durationRange: b.durationRange ?? "1-3", audience: b.audience ?? "", visualStyleId: b.visualStyleId ?? "", characterStyleId: b.characterStyleId ?? "", voiceId: b.voiceId ?? "", ratio: b.ratio ?? PROJECT_DEFAULT_RATIO, subtitleMode: b.subtitleMode ?? "auto", videoModel: b.videoModel ?? PROJECT_DEFAULT_VIDEO_MODEL } });
  return NextResponse.json(v, { status: 201 });
}
