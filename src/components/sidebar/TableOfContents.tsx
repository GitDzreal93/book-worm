"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { cn } from "@/lib/utils";

interface ChapterMeta {
  id: string;
  number: number;
  title: string;
  summary?: string | null;
}

interface Props {
  chapters: ChapterMeta[];
  currentChapterIdx: number;
  onChapterSelect: (idx: number) => void;
}

export function TableOfContents({ chapters, currentChapterIdx, onChapterSelect }: Props) {
  const { activeTab } = useSidebar();

  if (activeTab !== "toc") return null;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 px-4">
      {chapters.map((ch, idx) => (
        <button
          key={ch.id}
          className={cn(
            "block w-full text-left py-[7px] px-2.5 text-[13px] font-ui rounded-md transition-all cursor-pointer",
            idx === currentChapterIdx
              ? "text-ink font-medium bg-line"
              : "text-ink2 hover:bg-line hover:text-ink"
          )}
          onClick={() => onChapterSelect(idx)}
        >
          {ch.title}
        </button>
      ))}
    </div>
  );
}
