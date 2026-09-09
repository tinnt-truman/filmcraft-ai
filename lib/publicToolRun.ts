// lib/publicToolRun.ts — chạy chung cho 5 endpoint /api/tools/* (public demo,
// xem BACKEND_PROMPT.md mục "Công cụ đơn lẻ").
//
// /api/tools/* KHÔNG bị middleware chặn (dùng thử không cần đăng nhập —
// xem middleware.ts). Vì vậy:
//  - Khách (chưa đăng nhập): chạy provider ngay, trả kết quả đồng bộ, KHÔNG
//    tạo GenerationJob / KHÔNG trừ ví (dùng thử miễn phí).
//  - Đã đăng nhập: tạo GenerationJob thật (trừ tạm ví theo PRICING), trả về
//    jobId để FE poll qua GET /api/jobs/:id — giống các luồng có tính phí
//    khác trong app.

import type { JobType } from "@prisma/client";
import { getCurrentUser } from "./auth";
import { createGenerationJob, settleJob } from "./jobs";

export async function runPublicTool<T>(opts: {
  jobType: JobType;
  targetType: string;
  execute: () => Promise<T>;
  resultUrlOf: (result: T) => string | null;
}): Promise<{ demo: boolean; jobId?: string; status: string; result?: T }> {
  const user = await getCurrentUser();

  if (!user) {
    const result = await opts.execute();
    return { demo: true, status: "SUCCEEDED", result };
  }

  const job = await createGenerationJob({
    userId: user.id,
    type: opts.jobType,
    targetType: opts.targetType,
    targetId: `tool-${Date.now()}`,
    run: async (jobId) => {
      try {
        const result = await opts.execute();
        await settleJob(jobId, { status: "SUCCEEDED", resultUrl: opts.resultUrlOf(result) });
      } catch (err) {
        await settleJob(jobId, { status: "FAILED", error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  return { demo: false, jobId: job.id, status: job.status };
}
