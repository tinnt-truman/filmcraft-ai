// lib/apiClient.ts — fetch helper dùng ở client component (thay các import
// trực tiếp từ lib/mockData.ts bằng gọi API thật).

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiClientError(body?.error?.message || `Yêu cầu thất bại (${res.status})`, res.status, body?.error?.code);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type JobResult = { id: string; status: JobStatus; resultUrl: string | null; error: string | null };

/** Poll GET /api/jobs/:id tới khi SUCCEEDED/FAILED (thay setTimeout giả lập ở FE cũ). */
export async function pollJob(
  jobId: string,
  opts: { intervalMs?: number; timeoutMs?: number; onTick?: (job: JobResult) => void } = {}
): Promise<JobResult> {
  const intervalMs = opts.intervalMs ?? 1200;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await apiFetch<JobResult>(`/api/jobs/${jobId}`);
    opts.onTick?.(job);
    if (job.status === "SUCCEEDED" || job.status === "FAILED") return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Hết thời gian chờ job ${jobId}.`);
}
