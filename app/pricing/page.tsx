"use client";

import { useEffect, useState } from "react";
import { topUpAmounts } from "@/lib/mockData";
import { apiFetch } from "@/lib/apiClient";

const paymentMethods = [
  { id: "card", name: "Thẻ / Ví điện tử", note: "Đề xuất" },
  { id: "bank", name: "Chuyển khoản ngân hàng", note: null },
  { id: "wallet", name: "Ví nội bộ", note: "Sắp ra mắt" },
  { id: "invoice", name: "Chuyển khoản công ty", note: "Khách hàng doanh nghiệp" },
];

type Wallet = { balance: number; heldAmount: number; available: number };

export default function PricingPage() {
  const [method, setMethod] = useState("card");
  const [amount, setAmount] = useState(topUpAmounts[1]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = () => {
    apiFetch<Wallet>("/api/wallet")
      .then(setWallet)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được ví."));
  };

  useEffect(loadWallet, []);

  const topup = async () => {
    setTopupLoading(true);
    setError(null);
    try {
      const updated = await apiFetch<Wallet>("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount, method }),
      });
      setWallet(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nạp tiền thất bại.");
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 grid gap-6 rounded-2xl bg-gradient-to-r from-sky-100 to-emerald-100 p-8 md:grid-cols-2">
        <div>
          <h1 className="text-2xl font-bold">Nạp theo nhu cầu, sử dụng linh hoạt</h1>
          <p className="mt-2 text-sm text-gray-700">
            Tính phí theo lượng token sử dụng thực tế, số dư còn lại luôn có
            hiệu lực, không giới hạn thời gian.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-gray-600">
            <span>⚡ Nạp là dùng được ngay</span>
            <span>🛡️ Thanh toán an toàn</span>
            <span>♾️ Số dư không hết hạn</span>
          </div>
        </div>
        <div className="rounded-xl bg-black p-5 text-white">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-300">
            <span>Số dư khả dụng</span>
            <button className="rounded-full bg-white/10 px-2 py-1">Lịch sử nạp tiền</button>
          </div>
          <p className="text-3xl font-bold">
            {wallet ? wallet.available.toLocaleString("vi-VN") : "…"}
          </p>
          <div className="mt-4 flex justify-between text-xs text-gray-300">
            <div>
              <p>Số dư gốc</p>
              <p className="text-white">{wallet ? wallet.balance.toLocaleString("vi-VN") : "…"}</p>
            </div>
            <div className="text-right">
              <p>Đang tạm giữ</p>
              <p className="text-white">{wallet ? wallet.heldAmount.toLocaleString("vi-VN") : "…"}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Phương thức thanh toán</h2>
        <span className="text-xs text-gray-500">🛡️ Bảo đảm an toàn thanh toán</span>
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {paymentMethods.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`flex items-center justify-between rounded-xl border p-4 text-left text-sm font-medium ${
              method === m.id ? "border-black ring-1 ring-black" : "border-black/10 bg-white"
            }`}
          >
            <span>{m.name}</span>
            {m.note && (
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-gray-500">
                {m.note}
              </span>
            )}
          </button>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-bold">Chọn số tiền nạp</h2>
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {topUpAmounts.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className={`rounded-xl border p-4 text-center text-sm font-bold ${
              amount === a ? "border-black bg-brand/30" : "border-black/10 bg-white"
            }`}
          >
            ₫{a.toLocaleString("vi-VN")}
          </button>
        ))}
      </div>

      <button
        onClick={topup}
        disabled={topupLoading}
        className="brand-btn mb-10 w-full max-w-xs rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 sm:w-auto"
      >
        {topupLoading ? "Đang nạp…" : `Nạp ₫${amount.toLocaleString("vi-VN")} (demo)`}
      </button>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="mb-2 text-sm font-bold">💳 Cách tính phí</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
            <li>Phân cảnh, tạo ảnh, lồng tiếng, video AI được tính riêng theo lượng token dùng.</li>
            <li>Trừ trước một khoản ước tính khi bắt đầu tạo, quyết toán theo mức dùng thực tế sau khi hoàn tất.</li>
            <li>Chế độ ảnh + văn bản có chi phí thấp hơn; bật video động AI sẽ tốn nhiều hơn.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="mb-2 text-sm font-bold">✅ Vì sao tính phí theo lượng dùng?</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
            <li>Không cần đăng ký gói, dùng bao nhiêu nạp bấy nhiêu.</li>
            <li>Số dư luôn có hiệu lực, không giới hạn thời gian sử dụng.</li>
            <li>Hoá đơn rõ ràng, có thể tra cứu và truy vết từng lượt sử dụng.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
