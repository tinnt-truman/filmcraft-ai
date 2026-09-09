// lib/apiError.ts — helper chuẩn hoá error response.
// "Mọi endpoint trả lỗi dùng cùng một shape: { error: { code, message } }"
// (BACKEND_PROMPT.md, mục Ràng buộc).

import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
