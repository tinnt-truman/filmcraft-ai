import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "FilmCraft AI — Nền tảng dựng phim ngắn bằng AI (demo)",
  description:
    "Bản clone UI/UX (demo, không có backend thật) lấy cảm hứng từ workflow tạo phim ngắn AI: kịch bản, thư viện tài sản, dựng video theo từng tập.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 bg-[#fafafa]">{children}</main>
      </body>
    </html>
  );
}
