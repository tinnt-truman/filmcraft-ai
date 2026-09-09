import { apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { regenerateAllSegments } from "@/lib/episodeJobs";

// POST /api/episodes/:id/regenerate-all — "Tái lập kịch bản bằng AI": xếp
// hàng toàn bộ segment của tập theo thứ tự; chặn nếu còn segment GENERATING
// (409, xử lý ở lib/routeAuth.ts qua ConflictError).
export const POST = withAuth(async (_req, { userId, params }) => {
  const { jobIds } = await regenerateAllSegments(userId, params.id);
  return apiOk({ jobIds }, 202);
});
