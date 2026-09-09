"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Stats = {
  userCount: number;
  dramaCount: number;
  videoCount: number;
  jobsByStatus: Record<string, number>;
  totalTopupAmount: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  wallet: { balance: number; heldAmount: number } | null;
  _count: { dramaProjects: number; videoProjects: number; jobs: number };
};

type AdminJob = {
  id: string;
  type: string;
  status: string;
  estimatedCost: number;
  actualCost: number | null;
  error: string | null;
  createdAt: string;
  user: { email: string };
};

const fmt = (n: number) => n.toLocaleString("vi-VN");

const statusBadge: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-600",
  RUNNING: "bg-blue-50 text-blue-600",
  SUCCEEDED: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-600",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [jobs, setJobs] = useState<AdminJob[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [grantInputs, setGrantInputs] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (!(status === "authenticated" && role === "ADMIN")) return;
    let cancelled = false;
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<{ users: AdminUser[] }>(`/api/admin/users${qs}`),
      apiFetch<{ jobs: AdminJob[] }>("/api/admin/jobs"),
    ])
      .then(([s, u, j]) => {
        if (cancelled) return;
        setStats(s);
        setUsers(u.users);
        setJobs(j.jobs);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 403) {
          setForbidden(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Không tải được dữ liệu quản trị.");
      });
    return () => {
      cancelled = true;
    };
  }, [status, role, search, reloadTick]);

  const grantBalance = async (userId: string) => {
    const raw = grantInputs[userId];
    const amount = Number(raw);
    if (!amount || amount <= 0) return;
    setBusyUserId(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ grantBalance: amount }),
      });
      setGrantInputs((s) => ({ ...s, [userId]: "" }));
      setReloadTick((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cấp tiền thất bại.");
    } finally {
      setBusyUserId(null);
    }
  };

  const toggleRole = async (u: AdminUser) => {
    const nextRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    setBusyUserId(u.id);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      setReloadTick((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi quyền thất bại.");
    } finally {
      setBusyUserId(null);
    }
  };

  if (status === "loading") {
    return <div className="mx-auto max-w-7xl px-6 py-20 text-center text-sm text-gray-400">Đang tải…</div>;
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm text-gray-500">Bạn cần đăng nhập để xem trang này.</p>
      </div>
    );
  }

  if (forbidden || (role && role !== "ADMIN")) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm font-semibold text-red-600">403 — Không có quyền truy cập</p>
        <p className="mt-1 text-sm text-gray-500">Trang này chỉ dành cho tài khoản có quyền quản trị.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quản trị hệ thống</h1>
        <p className="text-sm text-gray-500">Người dùng, ví, job sinh nội dung — chỉ tài khoản ADMIN xem được.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng user" value={fmt(stats.userCount)} />
          <StatCard label="Dự án phim" value={fmt(stats.dramaCount)} />
          <StatCard label="Video ngắn" value={fmt(stats.videoCount)} />
          <StatCard label="Tổng nạp tiền" value={`${fmt(stats.totalTopupAmount)}đ`} />
        </div>
      )}

      {stats && (
        <div className="mb-8 flex flex-wrap gap-2">
          {Object.entries(stats.jobsByStatus).map(([s, count]) => (
            <span key={s} className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[s] ?? "bg-gray-100 text-gray-600"}`}>
              {s}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Người dùng</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo email/tên…"
          className="w-56 rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:border-black/30"
        />
      </div>

      <div className="mb-10 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Tên</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Số dư</th>
              <th className="px-4 py-2 font-medium">Đang giữ</th>
              <th className="px-4 py-2 font-medium">Dự án</th>
              <th className="px-4 py-2 font-medium">Cấp tiền</th>
              <th className="px-4 py-2 font-medium">Quyền</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 text-gray-500">{u.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={u.role === "ADMIN" ? "rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-brand" : "text-xs text-gray-500"}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2">{fmt(u.wallet?.balance ?? 0)}đ</td>
                <td className="px-4 py-2 text-gray-500">{fmt(u.wallet?.heldAmount ?? 0)}đ</td>
                <td className="px-4 py-2 text-gray-500">{u._count.dramaProjects + u._count.videoProjects}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={grantInputs[u.id] ?? ""}
                      onChange={(e) => setGrantInputs((s) => ({ ...s, [u.id]: e.target.value }))}
                      placeholder="Số tiền"
                      className="w-24 rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:border-black/30"
                    />
                    <button
                      onClick={() => grantBalance(u.id)}
                      disabled={busyUserId === u.id}
                      className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50"
                    >
                      Cấp
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleRole(u)}
                    disabled={busyUserId === u.id}
                    className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50"
                  >
                    {u.role === "ADMIN" ? "Hạ quyền" : "Cấp admin"}
                  </button>
                </td>
              </tr>
            ))}
            {users && users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Không có user nào khớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 text-lg font-bold">Job gần đây</h2>
      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Loại</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium">Ước tính</th>
              <th className="px-4 py-2 font-medium">Thực tế</th>
              <th className="px-4 py-2 font-medium">Lỗi</th>
              <th className="px-4 py-2 font-medium">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {(jobs ?? []).map((j) => (
              <tr key={j.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2">{j.user.email}</td>
                <td className="px-4 py-2 text-gray-500">{j.type}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[j.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-2">{fmt(j.estimatedCost)}đ</td>
                <td className="px-4 py-2">{j.actualCost != null ? `${fmt(j.actualCost)}đ` : "—"}</td>
                <td className="max-w-[240px] truncate px-4 py-2 text-xs text-red-600" title={j.error ?? undefined}>
                  {j.error ?? "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">{new Date(j.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
            {jobs && jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Chưa có job nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
