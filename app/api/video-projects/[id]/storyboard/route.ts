import { apiError, apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/routeAuth";
import { prisma } from "@/lib/prisma";
import { findOwnedVideoProject } from "@/lib/ownership";
import { createGenerationJob, settleJob } from "@/lib/jobs";
import { getLlmProvider } from "@/lib/providers/llm";

const DEFAULT_SCENES = [
  { title: "Cảnh mở đầu", desc: "Toàn cảnh chủ đề, câu hỏi dẫn dắt người xem.", startSec: 0, endSec: 8 },
  { title: "Bối cảnh", desc: "Giải thích bối cảnh / định nghĩa cơ bản.", startSec: 8, endSec: 20 },
  { title: "Diễn biến chính", desc: "Đi sâu vào nội dung chính, minh hoạ bằng hình ảnh động.", startSec: 20, endSec: 45 },
  { title: "Cao trào", desc: "Điểm nhấn thú vị nhất hoặc bất ngờ nhất của chủ đề.", startSec: 45, endSec: 55 },
  { title: "Kết luận", desc: "Tóm tắt ngắn gọn và lời kêu gọi hành động.", startSec: 55, endSec: 65 },
];

type SceneDraft = { title: string; desc: string; startSec: number; endSec: number };

function tryParseScenes(text: string): SceneDraft[] | null {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((s) => s && typeof s.title === "string")
      .map((s) => ({
        title: s.title,
        desc: s.desc ?? s.description ?? "",
        startSec: Number(s.startSec ?? 0),
        endSec: Number(s.endSec ?? 0),
      }));
  } catch {
    return null;
  }
}

// POST /api/video-projects/:id/storyboard — bước 4 "Bắt đầu tạo": sinh danh
// sách VideoScene từ topic + template + style đã chọn.
export const POST = withAuth(async (_req, { userId, params }) => {
  const project = await findOwnedVideoProject(userId, params.id);
  if (!project) return apiError(404, "NOT_FOUND", "Không tìm thấy dự án video.");

  const job = await createGenerationJob({
    userId,
    type: "STORYBOARD",
    targetType: "VideoProject",
    targetId: project.id,
    videoProjectId: project.id,
    run: async (jobId) => {
      try {
        await prisma.videoProject.update({ where: { id: project.id }, data: { status: "GENERATING" } });

        const llm = getLlmProvider();
        const prompt = [
          `Chủ đề: ${project.topic}`,
          `Đối tượng khán giả: ${project.audience}`,
          `Khoảng thời gian mong muốn: ${project.durationRange} phút`,
          `Trả về JSON array các cảnh: [{"title","desc","startSec","endSec"}, ...]`,
        ].join("\n");
        const text = await llm.generateText({ prompt });
        const scenes = tryParseScenes(text) ?? DEFAULT_SCENES;

        await prisma.$transaction([
          prisma.videoScene.deleteMany({ where: { videoProjectId: project.id } }),
          prisma.videoScene.createMany({
            data: scenes.map((s, i) => ({
              videoProjectId: project.id,
              order: i + 1,
              title: s.title,
              description: s.desc,
              startSec: s.startSec,
              endSec: s.endSec,
            })),
          }),
        ]);

        await prisma.videoProject.update({ where: { id: project.id }, data: { status: "COMPLETED" } });
        await settleJob(jobId, { status: "SUCCEEDED" });
      } catch (err) {
        await prisma.videoProject.update({ where: { id: project.id }, data: { status: "DRAFT" } });
        await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  return apiOk({ jobId: job.id, status: job.status }, 202);
});
