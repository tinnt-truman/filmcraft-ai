import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/routeAuth";
import { apiError, apiOk } from "@/lib/apiError";
import { createGenerationJob, settleJob } from "@/lib/jobs";
import { getLlmProvider } from "@/lib/providers/llm";

const UpdateSummarySchema = z.object({
  storyGenre: z.string().optional(),
  targetAudience: z.string().optional(),
  coreHook: z.string().optional(),
  logline: z.string().optional(),
  fullSummary: z.string().optional(),
  visualStyle: z.string().optional(),
  episodeCount: z.number().int().min(0).optional(),
});

const RegenerateSchema = z.object({ regenerate: z.literal(true), instructions: z.string().optional() });

// PATCH /api/drama/:id/summary — cập nhật tay các trường, HOẶC gọi AI "Tái
// tạo" tóm tắt kịch bản khi body = { regenerate: true }.
export const PATCH = withAuth(async (req, { userId, params }) => {
  const project = await prisma.dramaProject.findFirst({
    where: { id: params.id, userId },
    include: { summary: true },
  });
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án.");

  const body = await req.json().catch(() => null);

  const regen = RegenerateSchema.safeParse(body);
  if (regen.success) {
    const job = await createGenerationJob({
      userId,
      type: "SUMMARY",
      targetType: "ProjectSummary",
      targetId: project.id,
      run: async (jobId) => {
        try {
          const llm = getLlmProvider();
          const prompt = [
            `Tóm tắt lại kịch bản cho dự án "${project.title}".`,
            project.summary ? `Bản hiện tại: ${project.summary.fullSummary}` : "",
            regen.data.instructions ? `Yêu cầu chỉnh sửa: ${regen.data.instructions}` : "",
          ]
            .filter(Boolean)
            .join("\n");
          const fullSummary = await llm.generateText({ prompt });
          await prisma.projectSummary.upsert({
            where: { projectId: project.id },
            update: { fullSummary },
            create: {
              projectId: project.id,
              episodeCount: 0,
              storyGenre: "",
              targetAudience: "",
              coreHook: "",
              logline: "",
              fullSummary,
              visualStyle: "",
            },
          });
          await settleJob(jobId, { status: "SUCCEEDED" });
        } catch (err) {
          await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
        }
      },
    });
    return apiOk({ jobId: job.id, status: job.status }, 202);
  }

  const parsed = UpdateSummarySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Dữ liệu tóm tắt không hợp lệ.", parsed.error.flatten());
  }

  const summary = await prisma.projectSummary.upsert({
    where: { projectId: project.id },
    update: parsed.data,
    create: {
      projectId: project.id,
      episodeCount: parsed.data.episodeCount ?? 0,
      storyGenre: parsed.data.storyGenre ?? "",
      targetAudience: parsed.data.targetAudience ?? "",
      coreHook: parsed.data.coreHook ?? "",
      logline: parsed.data.logline ?? "",
      fullSummary: parsed.data.fullSummary ?? "",
      visualStyle: parsed.data.visualStyle ?? "",
    },
  });

  return apiOk(summary);
});
