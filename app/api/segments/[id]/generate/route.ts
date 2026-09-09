import { apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { generateSegment } from "@/lib/episodeJobs";

// POST /api/segments/:id/generate — nút "phát ra": validate, estimate cost,
// hold ví, enqueue GenerationJob(type: SHOT_VIDEO), trả jobId để FE poll
// qua GET /api/jobs/:id. Lỗi validate -> 422 (xem lib/segmentValidate.ts);
// số dư không đủ -> 402 (xử lý chung ở lib/routeAuth.ts).
export const POST = withAuth(async (_req, { userId, params }) => {
  const { jobId } = await generateSegment(userId, params.id);
  return apiOk({ jobId }, 202);
});
