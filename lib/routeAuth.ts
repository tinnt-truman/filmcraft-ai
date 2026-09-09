// lib/routeAuth.ts — bọc Route Handler để tự lấy userId (đã qua middleware
// xác thực) và chuẩn hoá lỗi { error: { code, message } }.

import { NextRequest, NextResponse } from "next/server";
import { requireUserId, requireAdminUserId, AuthError, ForbiddenError } from "./auth";
import { apiError } from "./apiError";
import { InsufficientBalanceError } from "./jobs";
import { ValidationFailedError, ConflictError, NotFoundError } from "./episodeJobs";

type RouteContext = { userId: string; params: Record<string, string> };

/** Giống withAuth nhưng KHÔNG bắt buộc đăng nhập — dùng cho /api/tools/*. */
export function withPublic(
  handler: (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    try {
      const rawParams = routeCtx?.params;
      const params = (rawParams instanceof Promise ? await rawParams : rawParams) ?? {};
      return await handler(req, { params });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return apiError(402, "INSUFFICIENT_BALANCE", err.message, {
          required: err.required,
          available: err.available,
        });
      }
      console.error("[api]", err);
      return apiError(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Lỗi không xác định.");
    }
  };
}

export function withAuth(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    try {
      const userId = await requireUserId();
      const rawParams = routeCtx?.params;
      const params = (rawParams instanceof Promise ? await rawParams : rawParams) ?? {};
      return await handler(req, { userId, params });
    } catch (err) {
      if (err instanceof AuthError) {
        return apiError(401, "UNAUTHORIZED", "Chưa đăng nhập.");
      }
      if (err instanceof InsufficientBalanceError) {
        return apiError(402, "INSUFFICIENT_BALANCE", err.message, {
          required: err.required,
          available: err.available,
        });
      }
      if (err instanceof ValidationFailedError) {
        return apiError(422, "SEGMENT_NOT_READY", err.message, { errors: err.errors });
      }
      if (err instanceof ConflictError) {
        return apiError(409, "CONFLICT", err.message);
      }
      if (err instanceof NotFoundError) {
        return apiError(404, "NOT_FOUND", err.message);
      }
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
        return apiError(404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
      }
      console.error("[api]", err);
      return apiError(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Lỗi không xác định.");
    }
  };
}

/** Giống withAuth nhưng bắt buộc role ADMIN — dùng cho /api/admin/*. */
export function withAdmin(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    try {
      const userId = await requireAdminUserId();
      const rawParams = routeCtx?.params;
      const params = (rawParams instanceof Promise ? await rawParams : rawParams) ?? {};
      return await handler(req, { userId, params });
    } catch (err) {
      if (err instanceof AuthError) {
        return apiError(401, "UNAUTHORIZED", "Chưa đăng nhập.");
      }
      if (err instanceof ForbiddenError) {
        return apiError(403, "FORBIDDEN", err.message);
      }
      console.error("[api]", err);
      return apiError(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Lỗi không xác định.");
    }
  };
}
