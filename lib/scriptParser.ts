export type ParsedShot = { shotSize: string; description: string; dialogues: { characterName: string; direction?: string; text: string }[] };
export type ParsedScene = { sceneNumber: number; timeOfDay?: string; interiorExterior?: string; location: string; subLocation?: string; charactersPresent: string[]; shots: ParsedShot[] };

const SIZE_MAP: Record<string, string> = {
  "Toàn cảnh xa": "WIDE",
  "Toàn cảnh": "WIDE",
  "Cảnh trung": "MEDIUM",
  "Trung cảnh": "MEDIUM",
  "Cận cảnh": "CLOSE_UP",
  "Đặc tả": "EXTREME_CLOSE_UP",
};

export function mapShotSize(label: string): string {
  const t = label.trim();
  if (SIZE_MAP[t]) return SIZE_MAP[t];
  for (const k of Object.keys(SIZE_MAP)) if (t.includes(k)) return SIZE_MAP[k];
  return "MEDIUM";
}

export function parseScriptRaw(raw: string, episodeIndex = 1): ParsedScene[] {
  const scenes: ParsedScene[] = [];
  const blocks = raw.split(/^###\s*Cảnh\s*/m).filter((s) => s.trim());
  let n = 0;
  for (const b of blocks) {
    n += 1;
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const head = lines[0];
    const mNum = head.match(/^(\d+)-(\d+)/);
    const sceneNumber = mNum ? Number(mNum[2]) : n;
    const locLine = lines[1] ?? "";
    let timeOfDay: string | undefined;
    let interiorExterior: string | undefined;
    let location = "";
    let subLocation: string | undefined;
    const mIE = locLine.match(/(Sáng|Trưa|Chiều|Tối|Đêm|Bình minh|Hoàng hôn)?\s*(Nội|Ngoại)?\s*(.*)/);
    if (mIE) {
      timeOfDay = mIE[1] || undefined;
      interiorExterior = mIE[2] || undefined;
      const rest = (mIE[3] ?? "").replace(/^[·\-\s]+/, "");
      const parts = rest.split("・").map((s) => s.trim()).filter(Boolean);
      location = parts[0] ?? rest;
      subLocation = parts[1];
    } else {
      location = locLine;
    }
    let charactersPresent: string[] = [];
    const charLine = lines.find((l) => l.startsWith("Nhân vật xuất hiện:"));
    if (charLine) charactersPresent = charLine.replace("Nhân vật xuất hiện:", "").split(",").map((s) => s.trim()).filter(Boolean);

    const shots: ParsedShot[] = [];
    for (const l of lines) {
      if (l.startsWith("△")) {
        const body = l.slice(1).trim();
        const mShot = body.match(/^([^:：]+)[:：]\s*(.*)/);
        const label = mShot ? mShot[1].trim() : "";
        const desc = mShot ? mShot[2] : body;
        if (/^\[Cảnh trống/.test(body) || /^\[Cảnh trống/.test(desc)) {
          shots.push({ shotSize: "MONTAGE", description: body, dialogues: [] });
        } else {
          shots.push({ shotSize: mapShotSize(label), description: desc, dialogues: [] });
        }
      } else {
        const mDlg = l.match(/^(.+?)\s*\(([^)]*)\)\s*[:：]\s*(.+)/);
        if (mDlg) {
          const d = { characterName: mDlg[1].trim(), direction: mDlg[2].trim() || undefined, text: mDlg[3].trim() };
          if (shots.length) shots[shots.length - 1].dialogues.push(d);
          else shots.push({ shotSize: "MEDIUM", description: "", dialogues: [d] });
        }
      }
    }
    void episodeIndex;
    scenes.push({ sceneNumber, timeOfDay, interiorExterior, location, subLocation, charactersPresent, shots });
  }
  return scenes;
}
