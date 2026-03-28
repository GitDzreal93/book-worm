"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  // Don't show navbar on reader pages
  if (pathname.startsWith("/read/")) return null;

  return (
    <nav className="border-b border-line bg-bg">
      <div className="mx-auto max-w-6xl px-6 flex items-center h-12">
        <Link
          href="/shelf"
          className="text-sm font-semibold text-ink font-ui mr-8"
        >
          BookWorm
        </Link>
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-ui transition-colors",
                pathname === item.href
                  ? "bg-ink text-bg"
                  : "text-ink2 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
