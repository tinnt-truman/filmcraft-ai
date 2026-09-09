import { NextResponse } from "next/server";
import { toolDetails } from "@/lib/config-data";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = toolDetails[slug];
  if (!d) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Không tìm thấy công cụ" } }, { status: 404 });
  return NextResponse.json(d);
}
