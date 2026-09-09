import { apiError, apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { prisma } from "@/lib/prisma";
import { findOwnedEpisode } from "@/lib/ownership";
import { createGenerationJob, settleJob } from "@/lib/jobs";
import { getLlmProvider } from "@/lib/providers/llm";

// Few-shot: khuôn mẫu kịch bản, xem BACKEND_PROMPT.md mục "Lớp 3".
const SCRIPT_FORMAT_SYSTEM_PROMPT = `Bạn là biên kịch AI cho nền tảng FilmCraft AI. Sinh kịch bản 1 tập phim
đúng khuôn mẫu markdown sau (không thêm giải thích ngoài khuôn mẫu):

### Cảnh {tập}-{số cảnh}
{Thời gian} {Nội/Ngoại} {Địa điểm}・{Địa điểm phụ}
Nhân vật xuất hiện: {tên 1}, {tên 2}
△ {Toàn cảnh xa|Toàn cảnh|Cảnh trung|Cận cảnh|Đặc tả}: {mô tả hình ảnh chi tiết}
{Tên nhân vật} ({chú thích cảm xúc/hành động}): {lời thoại}

Có thể nhiều block "### Cảnh" trong 1 tập.`;

// POST /api/episodes/:id/regenerate-script — nút "Tái tạo" (gọi LLM sinh
// lại toàn bộ scriptRaw theo khuôn mẫu).
export const POST = withAuth(async (req, { userId, params }) => {
  const episode = await findOwnedEpisode(userId, params.id);
  if (!episode) return apiError(404, "NOT_FOUND", "Không tìm thấy tập phim.");

  const body = await req.json().catch(() => ({}));
  const instructions: string | undefined = body?.instructions;

  const job = await createGenerationJob({
    userId,
    type: "SCRIPT",
    targetType: "Episode",
    targetId: episode.id,
    run: async (jobId) => {
      try {
        const llm = await getLlmProvider();
        const prompt = [
          `Dự án: ${episode.project.title}.`,
          episode.project.summary ? `Bối cảnh chung: ${episode.project.summary.fullSummary}` : "",
          `Sinh kịch bản cho ${episode.title} (tập số ${episode.index}): ${episode.summary}`,
          instructions ? `Yêu cầu thêm: ${instructions}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        const scriptRaw = await llm.generateText({ systemPrompt: SCRIPT_FORMAT_SYSTEM_PROMPT, prompt });
        await prisma.episode.update({
          where: { id: episode.id },
          data: { scriptRaw, status: "DRAFT" },
        });
        await settleJob(jobId, { status: "SUCCEEDED" });
      } catch (err) {
        await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  return apiOk({ jobId: job.id, status: job.status }, 202);
});
