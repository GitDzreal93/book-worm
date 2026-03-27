"use client";

import { useEffect, useRef, useState } from "react";
import { useSidebar } from "@/components/layout/SidebarProvider";
import { cn } from "@/lib/utils";
import type { ChapterData } from "@/lib/types";

interface Props {
  chapters: ChapterData[];
}

export function TableOfContents({ chapters }: Props) {
  const { activeTab } = useSidebar();
  const [activeChapter, setActiveChapter] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!activeTab || activeTab !== "toc") return;

    // Clean up previous observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const match = id.match(/ch-(\d+)/);
            if (match) {
              setActiveChapter(parseInt(match[1], 10));
            }
          }
        }
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );

    // Small delay to ensure DOM elements exist
    const timer = setTimeout(() => {
      chapters.forEach((ch) => {
        const el = document.getElementById(`ch-${ch.number}`);
        if (el) observerRef.current?.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [chapters, activeTab]);

  if (activeTab !== "toc") return null;

  const jumpTo = (number: number) => {
    document.getElementById(`ch-${number}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 px-4">
      {chapters.map((ch) => (
        <button
          key={ch.id}
          className={cn(
            "block w-full text-left py-[7px] px-2.5 text-[13px] font-ui rounded-md transition-all cursor-pointer",
            activeChapter === ch.number
              ? "text-ink font-medium bg-line"
              : "text-ink2 hover:bg-line hover:text-ink"
          )}
          onClick={() => jumpTo(ch.number)}
        >
          {ch.title}
        </button>
      ))}
    </div>
  );
}
