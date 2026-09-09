import { NextResponse } from "next/server";
import { aiTools, videoTemplates, styleTemplates, characterStyles, voiceOptions, assetCategories, topUpAmounts } from "@/lib/config-data";

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  switch (type) {
    case "tools": return NextResponse.json(aiTools);
    case "video-templates": return NextResponse.json(videoTemplates);
    case "style-templates": return NextResponse.json(styleTemplates);
    case "character-styles": return NextResponse.json(characterStyles);
    case "voice-options": return NextResponse.json(voiceOptions);
    case "topup-amounts": return NextResponse.json(topUpAmounts);
    case "asset-categories": return NextResponse.json(assetCategories);
    default: return NextResponse.json({ error: { code: "NOT_FOUND", message: "Không tìm thấy loại" } }, { status: 404 });
  }
}
