import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  title: "FilmCraft AI — Nền tảng dựng phim ngắn bằng AI (demo)",
  description:
    "Bản clone UI/UX lấy cảm hứng từ workflow tạo phim ngắn AI: kịch bản, thư viện tài sản, dựng video theo từng tập. Backend chạy local, không dùng cho mục đích thương mại.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProviderWrapper>
          <NavBar />
          <main className="flex-1 bg-[#fafafa]">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
