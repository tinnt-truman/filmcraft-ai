"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  wallet: { balance: number; heldAmount: number; available: number };
  counts: { dramaProjects: number; videoProjects: number; assets: number; jobs: number };
};

type Transaction = {
  id: string;
  type: "TOPUP" | "USAGE_HOLD" | "USAGE_SETTLE" | "REFUND";
  amount: number;
  description: string;
  createdAt: string;
};

const txLabel: Record<Transaction["type"], string> = {
  TOPUP: "Nạp ví",
  USAGE_HOLD: "Tạm giữ",
  USAGE_SETTLE: "Quyết toán",
  REFUND: "Hoàn tiền",
};

const tabs = [
  { id: "account", label: "Thông tin tài khoản" },
  { id: "wallet", label: "Ví & giao dịch" },
  { id: "security", label: "Bảo mật" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("account");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then((p) => {
        setProfile(p);
        setName(p.name ?? "");
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(err instanceof Error ? err.message : "Không tải được hồ sơ.");
      });
  }, [router]);

  useEffect(() => {
    if (tab !== "wallet") return;
    apiFetch<{ transactions: Transaction[] }>("/api/wallet/transactions?limit=30")
      .then((d) => setTransactions(d.transactions))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Không tải được lịch sử giao dịch."));
  }, [tab]);

  const saveName = async () => {
    setSavingName(true);
    setNameMsg(null);
    try {
      const updated = await apiFetch<Profile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      setProfile((prev) => (prev ? { ...prev, name: updated.name } : prev));
      setNameMsg("Đã lưu.");
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Mật khẩu mới cần tối thiểu 8 ký tự." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Xác nhận mật khẩu không khớp." });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch<Profile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "ok", text: "Đã đổi mật khẩu." });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err instanceof Error ? err.message : "Đổi mật khẩu thất bại." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  const initial = (profile?.name ?? profile?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="mb-4 rounded-xl border border-black/10 bg-white p-4">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-base font-semibold text-gray-700">
              {initial}
            </div>
            <p className="truncate text-sm font-bold">{profile?.name || "Chưa đặt tên"}</p>
            <p className="truncate text-xs text-gray-500">ID: {profile ? profile.id.slice(0, 8) : "…"}</p>
          </div>

          <nav className="flex flex-col gap-1 rounded-xl border border-black/10 bg-white p-2 text-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-2 text-left ${
                  tab === t.id ? "bg-black text-white font-medium" : "text-gray-600 hover:bg-black/5"
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="my-1 border-t border-black/10" />
            <Link href="/drama" className="rounded-lg px-3 py-2 text-left text-gray-600 hover:bg-black/5">
              Dự án kịch bản{" "}
              {profile && <span className="text-gray-400">({profile.counts.dramaProjects})</span>}
            </Link>
            <Link href="/video" className="rounded-lg px-3 py-2 text-left text-gray-600 hover:bg-black/5">
              Video ngắn AI{" "}
              {profile && <span className="text-gray-400">({profile.counts.videoProjects})</span>}
            </Link>
            <Link href="/assets" className="rounded-lg px-3 py-2 text-left text-gray-600 hover:bg-black/5">
              Tài sản{" "}
              {profile && <span className="text-gray-400">({profile.counts.assets})</span>}
            </Link>
            <div className="my-1 border-t border-black/10" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50"
            >
              Đăng xuất
            </button>
          </nav>
        </aside>

        <section className="rounded-xl border border-black/10 bg-white p-6">
          {tab === "account" && (
            <div>
              <h1 className="mb-1 text-lg font-bold">Thông tin tài khoản</h1>
              <p className="mb-6 text-sm text-gray-500">Quản lý tên hiển thị và thông tin liên hệ.</p>

              <label className="mb-1 block text-sm font-medium">Tên hiển thị</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chưa đặt tên"
                className="mb-3 w-full max-w-sm rounded-lg border border-black/10 px-3 py-2 text-sm"
              />

              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                value={profile?.email ?? ""}
                disabled
                className="mb-1 w-full max-w-sm rounded-lg border border-black/10 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
              <p className="mb-4 text-xs text-gray-400">Email dùng để đăng nhập, hiện chưa hỗ trợ đổi trực tiếp.</p>

              <div className="mb-6 flex flex-wrap gap-6 text-xs text-gray-500">
                <span>Vai trò: {profile?.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}</span>
                <span>Tham gia: {profile ? formatDate(profile.createdAt) : "…"}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="brand-btn rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {savingName ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                {nameMsg && <span className="text-xs text-gray-500">{nameMsg}</span>}
              </div>
            </div>
          )}

          {tab === "wallet" && (
            <div>
              <h1 className="mb-1 text-lg font-bold">Ví & giao dịch</h1>
              <p className="mb-6 text-sm text-gray-500">Nạp theo nhu cầu, số dư còn lại luôn có hiệu lực.</p>

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-black/10 p-4">
                  <p className="text-xs text-gray-500">Số dư khả dụng</p>
                  <p className="mt-1 text-xl font-bold">
                    ₫{profile ? profile.wallet.available.toLocaleString("vi-VN") : "…"}
                  </p>
                </div>
                <div className="rounded-xl border border-black/10 p-4">
                  <p className="text-xs text-gray-500">Số dư gốc</p>
                  <p className="mt-1 text-xl font-bold">
                    ₫{profile ? profile.wallet.balance.toLocaleString("vi-VN") : "…"}
                  </p>
                </div>
                <div className="rounded-xl border border-black/10 p-4">
                  <p className="text-xs text-gray-500">Đang tạm giữ</p>
                  <p className="mt-1 text-xl font-bold">
                    ₫{profile ? profile.wallet.heldAmount.toLocaleString("vi-VN") : "…"}
                  </p>
                </div>
              </div>

              <Link href="/pricing" className="brand-btn mb-6 inline-block rounded-full px-5 py-2 text-sm font-semibold">
                Đi nạp thêm
              </Link>

              <h2 className="mb-3 text-sm font-bold">Lịch sử giao dịch gần đây</h2>
              {!transactions && <p className="text-sm text-gray-400">Đang tải…</p>}
              {transactions && transactions.length === 0 && (
                <p className="text-sm text-gray-400">Chưa có giao dịch nào.</p>
              )}
              <div className="divide-y divide-black/5">
                {transactions?.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{txLabel[tx.type]}</p>
                      <p className="max-w-md truncate text-xs text-gray-500">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={tx.amount >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-gray-900"}>
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount.toLocaleString("vi-VN")}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "security" && (
            <div>
              <h1 className="mb-1 text-lg font-bold">Bảo mật</h1>
              <p className="mb-6 text-sm text-gray-500">Đổi mật khẩu đăng nhập tài khoản.</p>

              <label className="mb-1 block text-sm font-medium">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mb-3 w-full max-w-sm rounded-lg border border-black/10 px-3 py-2 text-sm"
              />

              <label className="mb-1 block text-sm font-medium">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="mb-3 w-full max-w-sm rounded-lg border border-black/10 px-3 py-2 text-sm"
              />

              <label className="mb-1 block text-sm font-medium">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mb-4 w-full max-w-sm rounded-lg border border-black/10 px-3 py-2 text-sm"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={changePassword}
                  disabled={savingPassword}
                  className="brand-btn rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {savingPassword ? "Đang lưu…" : "Đổi mật khẩu"}
                </button>
                {passwordMsg && (
                  <span className={`text-xs ${passwordMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                    {passwordMsg.text}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
