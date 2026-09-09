// lib/scriptParser.ts
//
// Parse `Episode.scriptRaw` (khối text kịch bản markdown do LLM sinh ra,
// hoặc user tự sửa tay) thành cây Scene[] -> Shot[] -> DialogueLine[] để
// lưu vào DB và hiển thị storyboard.
//
// Khuôn mẫu (xem BACKEND_PROMPT.md, mục "Lớp 3"):
//
//   ### Cảnh {tập}-{số cảnh}
//   {Thời gian} {Nội/Ngoại} {Địa điểm}・{Địa điểm phụ}
//   Nhân vật xuất hiện: {tên 1}, {tên 2}, {tên 3}
//   △ {Loại cỡ cảnh}: {mô tả hình ảnh chi tiết}
//   △ {Loại cỡ cảnh}: {mô tả tiếp theo, có thể nhiều dòng △}
//   {Tên nhân vật} ({chú thích cảm xúc/hành động trong ngoặc}): {lời thoại}
//
// Đây là parser dạng "cố gắng hết sức" (best-effort heuristic): input do LLM
// sinh ra không phải lúc nào cũng hoàn hảo, nên khi gặp dòng không khớp
// pattern nào, parser bỏ qua thay vì throw — tránh chặn toàn bộ luồng vì
// một dòng lỗi định dạng nhỏ.

// Giữ các literal string trùng khớp với enum Prisma (ShotSize) nhưng KHÔNG
// import @prisma/client ở đây, để module này test được độc lập, không cần
// `prisma generate` / kết nối DB.
export type ShotSizeLiteral =
  | "WIDE"
  | "MEDIUM"
  | "CLOSE_UP"
  | "EXTREME_CLOSE_UP"
  | "MONTAGE";

export type ParsedDialogueLine = {
  order: number;
  characterName: string;
  direction: string | null;
  text: string;
};

export type ParsedShot = {
  order: number;
  shotSize: ShotSizeLiteral;
  description: string;
  dialogue: ParsedDialogueLine[];
};

export type ParsedScene = {
  order: number;
  sceneNumber: number;
  timeOfDay: string | null;
  interiorExterior: string | null;
  location: string;
  subLocation: string | null;
  charactersPresent: string[];
  shots: ParsedShot[];
};

const SCENE_HEADER_RE = /^###\s*Cảnh\s+(\d+)-(\d+)\s*$/u;
const CHARACTERS_LINE_RE = /^Nhân vật xuất hiện\s*[:：]\s*(.+)$/u;
const SHOT_LINE_RE = /^△\s*([^:：]+)[:：]\s*(.*)$/u;
const EMPTY_SCENE_RE = /^\[Cảnh trống\s*[:：]?\s*(.*)\]$/u;
// "Tên nhân vật (ghi chú): lời thoại" — tên không chứa ':' hay dấu ngoặc mở
// thừa; ghi chú trong ngoặc đơn là optional.
const DIALOGUE_LINE_RE = /^([^():：\n]{1,40}?)\s*(?:\(([^)]*)\))?\s*[:：]\s*(.+)$/u;

const SHOT_SIZE_MAP: Record<string, ShotSizeLiteral> = {
  "toàn cảnh xa": "WIDE",
  "toàn cảnh": "WIDE",
  "cảnh trung": "MEDIUM",
  "trung cảnh": "MEDIUM",
  "cận cảnh": "CLOSE_UP",
  "đặc tả": "EXTREME_CLOSE_UP",
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

export function shotSizeFromLabel(label: string): ShotSizeLiteral {
  return SHOT_SIZE_MAP[normalizeKey(label)] ?? "MEDIUM";
}

/** Tách dòng header cảnh: "{Thời gian} {Nội/Ngoại} {Địa điểm}・{Địa điểm phụ}" */
function parseSceneHeaderLine(line: string): {
  timeOfDay: string | null;
  interiorExterior: string | null;
  location: string;
  subLocation: string | null;
} {
  const [mainPart, subLocationRaw] = line.split("・");
  const tokens = mainPart.trim().split(/\s+/u);

  let timeOfDay: string | null = null;
  let interiorExterior: string | null = null;
  const rest: string[] = [];

  for (const tok of tokens) {
    if (!interiorExterior && (tok === "Nội" || tok === "Ngoại")) {
      interiorExterior = tok;
    } else if (!timeOfDay && !interiorExterior && rest.length === 0) {
      timeOfDay = tok;
    } else {
      rest.push(tok);
    }
  }

  return {
    timeOfDay,
    interiorExterior,
    location: rest.join(" ") || mainPart.trim(),
    subLocation: subLocationRaw ? subLocationRaw.trim() : null,
  };
}

export function parseScriptRaw(scriptRaw: string): ParsedScene[] {
  const lines = scriptRaw.replace(/\r\n/g, "\n").split("\n");

  const scenes: ParsedScene[] = [];
  let sceneOrder = 0;
  let shotOrder = 0;
  let dialogueOrder = 0;
  let current: ParsedScene | null = null;
  let expectingHeaderLine = false;

  const pushShot = (shotSize: ShotSizeLiteral, description: string) => {
    if (!current) return;
    shotOrder += 1;
    dialogueOrder = 0;
    current.shots.push({ order: shotOrder, shotSize, description, dialogue: [] });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const headerMatch = SCENE_HEADER_RE.exec(line);
    if (headerMatch) {
      sceneOrder += 1;
      shotOrder = 0;
      current = {
        order: sceneOrder,
        sceneNumber: Number(headerMatch[2]),
        timeOfDay: null,
        interiorExterior: null,
        location: "",
        subLocation: null,
        charactersPresent: [],
        shots: [],
      };
      scenes.push(current);
      expectingHeaderLine = true;
      continue;
    }

    if (!current) continue; // bỏ qua nội dung trước block "### Cảnh" đầu tiên

    const charMatch = CHARACTERS_LINE_RE.exec(line);
    if (charMatch) {
      current.charactersPresent = charMatch[1]
        .split(/[,，、]/u)
        .map((s) => s.trim())
        .filter(Boolean);
      expectingHeaderLine = false;
      continue;
    }

    if (expectingHeaderLine) {
      const header = parseSceneHeaderLine(line);
      current.timeOfDay = header.timeOfDay;
      current.interiorExterior = header.interiorExterior;
      current.location = header.location;
      current.subLocation = header.subLocation;
      expectingHeaderLine = false;
      continue;
    }

    const emptyMatch = EMPTY_SCENE_RE.exec(line);
    if (emptyMatch) {
      pushShot("MONTAGE", emptyMatch[1] || "Cảnh trống / không lời");
      continue;
    }

    const shotMatch = SHOT_LINE_RE.exec(line);
    if (shotMatch) {
      pushShot(shotSizeFromLabel(shotMatch[1]), shotMatch[2].trim());
      continue;
    }

    const dialogueMatch = DIALOGUE_LINE_RE.exec(line);
    if (dialogueMatch) {
      const [, name, direction, text] = dialogueMatch;
      if (current.shots.length === 0) {
        // Chưa có shot nào phía trên — tạo shot ngầm định để chứa thoại độc lập.
        pushShot("MEDIUM", `(Thoại độc lập của ${name.trim()})`);
      }
      const shot = current.shots[current.shots.length - 1];
      dialogueOrder += 1;
      shot.dialogue.push({
        order: dialogueOrder,
        characterName: name.trim(),
        direction: direction ? direction.trim() : null,
        text: text.trim(),
      });
      continue;
    }

    // Dòng không khớp pattern nào — bỏ qua (best-effort parser).
  }

  return scenes;
}

/** Ước lượng thời lượng shot (giây) khi không có @duration rõ ràng — dùng cho preview UI. */
export function estimateShotDurationSec(shot: ParsedShot): number {
  const base = shot.dialogue.length > 0 ? 3 : 2.5;
  const perWord = 0.12;
  const words = shot.dialogue.reduce((acc, d) => acc + d.text.split(/\s+/u).length, 0);
  return Math.round((base + words * perWord) * 10) / 10;
}
