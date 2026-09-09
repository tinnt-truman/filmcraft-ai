"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Bàn làm việc" },
  { href: "/drama", label: "Kịch bản phim" },
  { href: "/video", label: "Video ngắn AI" },
  { href: "/tools", label: "Dụng cụ" },
  { href: "/assets", label: "Tài sản" },
  { href: "/pricing", label: "Giá cả" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navLinks = role === "ADMIN" ? [...links, { href: "/admin", label: "Quản trị" }] : links;

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-brand">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4h16v16H4V4Zm3 0v16M17 4v16M4 9h3M4 15h3M17 9h3M17 15h3"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </span>
          <span className="text-sm font-bold tracking-wide">FILMCRAFT AI</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                isActive(l.href)
                  ? "border-b-2 border-black pb-1 font-medium text-black"
                  : "pb-1 hover:text-black"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <button className="hidden rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium sm:block">
            ở giữa · VN
          </button>
          <button className="hidden sm:block">giúp đỡ</button>
          {status === "authenticated" ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title={session?.user?.email ?? "Đăng xuất"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              {(session?.user?.name ?? session?.user?.email ?? "T").slice(0, 1).toUpperCase()}
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
            >
              Đăng nhập
            </Link>
          )}
          <Link
            href="/video/336"
            className="brand-btn rounded-full px-4 py-2 text-sm font-semibold"
          >
            Bắt đầu tạo
          </Link>
        </div>
      </div>
    </header>
  );
}
