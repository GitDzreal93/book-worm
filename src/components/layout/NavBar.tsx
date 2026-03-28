"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/shelf", label: "书架" },
  { href: "/vocabulary", label: "生词本" },
  { href: "/review", label: "复习" },
  { href: "/notes", label: "笔记" },
  { href: "/stats", label: "统计" },
  { href: "/settings", label: "设置" },
];

export function NavBar() {
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();

  if (pathname.startsWith("/read/")) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
        {/* Logo */}
        <Link
          href="/shelf"
          className="mr-8 flex items-center gap-2"
        >
          <svg
            className="h-5 w-5 text-accent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="font-serif text-base font-bold tracking-tight text-ink">
            BookWorm
          </span>
        </Link>

        {/* Nav items */}
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-[13px] font-ui transition-colors duration-150",
                  isActive
                    ? "font-medium text-ink"
                    : "text-ink2 hover:text-ink",
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-1 -bottom-[9px] h-0.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="ml-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink2 transition-colors hover:bg-ink/5 hover:text-ink cursor-pointer"
          aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
        >
          {isDark ? (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}
