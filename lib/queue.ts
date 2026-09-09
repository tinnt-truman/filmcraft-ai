// lib/queue.ts
//
// Hàng đợi xử lý job nền (sinh ảnh/video/giọng nói...), tối đa 10 job chạy
// song song trên toàn hệ thống (đúng đặc tả "Hàng đợi sinh video" trong
// BACKEND_PROMPT.md).
//
// Có 2 chế độ:
//  - "bullmq"    — nếu REDIS_URL được set: dùng BullMQ + Redis thật (bền
//                   hơn, sống sót qua restart nếu job đã vào Redis — nhưng
//                   lưu ý: closure task không serialize được, xem ghi chú
//                   dưới `taskRegistry`).
//  - "inprocess" — mặc định khi không có REDIS_URL: hàng đợi trong bộ nhớ,
//                   đủ dùng cho chạy `next dev`/`next start` 1 process ở
//                   local — không cần cài Redis để chạy demo.
//
// Cả 2 chế độ đều dùng chung 1 cơ chế: producer (route handler) đăng ký
// closure xử lý job vào `taskRegistry` NGAY TRƯỚC KHI enqueue, rồi worker
// (cùng process, vì đây là app local 1 process) tra registry theo jobId để
// chạy. Vì vậy nếu process bị restart giữa lúc job đang chờ trong Redis,
// job đó sẽ mất — chấp nhận được cho phạm vi demo local; muốn bền hơn thì
// tách closure thành named processor (xem lib/jobProcessors.ts) chạy trong
// một worker process riêng (`npm run worker`, xem README).

const MAX_CONCURRENCY = 10;

type Task = () => Promise<void>;

const taskRegistry = new Map<string, Task>();

// ---------------------------------------------------------------------------
// In-process fallback queue
// ---------------------------------------------------------------------------

class InProcessQueue {
  private active = 0;
  private pending: string[] = [];

  push(jobId: string) {
    this.pending.push(jobId);
    this.drain();
  }

  private drain() {
    while (this.active < MAX_CONCURRENCY && this.pending.length > 0) {
      const jobId = this.pending.shift()!;
      const task = taskRegistry.get(jobId);
      taskRegistry.delete(jobId);
      if (!task) continue;
      this.active += 1;
      task()
        .catch((err) => {
          console.error(`[queue] job ${jobId} failed:`, err);
        })
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }
}

const inProcessQueue = new InProcessQueue();

// ---------------------------------------------------------------------------
// BullMQ (optional, khi có REDIS_URL)
// ---------------------------------------------------------------------------

let bullmqQueue: import("bullmq").Queue | null = null;
let bullmqWorkerStarted = false;

function getQueueMode(): "bullmq" | "inprocess" {
  return process.env.REDIS_URL ? "bullmq" : "inprocess";
}

async function ensureBullmq() {
  if (bullmqQueue && bullmqWorkerStarted) return;
  const { Queue, Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;
  const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

  if (!bullmqQueue) {
    bullmqQueue = new Queue("generation-jobs", { connection });
  }
  if (!bullmqWorkerStarted) {
    new Worker(
      "generation-jobs",
      async (job) => {
        const jobId = job.data.jobId as string;
        const task = taskRegistry.get(jobId);
        taskRegistry.delete(jobId);
        if (!task) {
          console.warn(`[queue] no task registered for job ${jobId} (process restarted?)`);
          return;
        }
        await task();
      },
      { connection, concurrency: MAX_CONCURRENCY }
    );
    bullmqWorkerStarted = true;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Đưa 1 job vào hàng đợi. `task` sẽ được gọi khi tới lượt (concurrency <= 10). */
export async function enqueueJob(jobId: string, task: Task): Promise<void> {
  taskRegistry.set(jobId, task);

  if (getQueueMode() === "bullmq") {
    try {
      await ensureBullmq();
      await bullmqQueue!.add("job", { jobId });
      return;
    } catch (err) {
      console.error("[queue] BullMQ unavailable, falling back to in-process queue:", err);
    }
  }

  inProcessQueue.push(jobId);
}

export function getQueueModeLabel(): string {
  return getQueueMode();
}
