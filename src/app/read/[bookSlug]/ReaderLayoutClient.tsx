"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { CharacterTooltip } from "@/components/reader/CharacterTooltip";
import { TextSwapButton } from "@/components/reader/TextSwapButton";
import { Sidebar } from "@/components/sidebar/Sidebar";
import type { CharacterData, ChapterData, FamilyRelationData } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  chapters: ChapterData[];
  characters: CharacterData[];
  relations: FamilyRelationData[];
}

/** 创建一个防抖函数 */
function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function ReaderLayoutClient({
  bookId,
  bookTitle,
  bookSlug,
  chapters,
  characters,
  relations,
}: Props) {
  const { isOpen, toggleOpen } = useSidebar();
  const [tooltipChar, setTooltipChar] = useState<CharacterData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // --- ReadingSession 追踪 ---
  useEffect(() => {
    // Create a new reading session on mount
    fetch("/api/stats/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) sessionIdRef.current = data.id;
      })
      .catch(() => {});

    // End session on unmount / page leave
    const endSession = () => {
      if (!sessionIdRef.current) return;
      fetch("/api/stats/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionIdRef.current }),
      }).catch(() => {});
      sessionIdRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") endSession();
    };
    const handleBeforeUnload = () => endSession();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      endSession();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [bookId]);

  // --- 阅读进度追踪 ---
  const saveProgress = useCallback(
    (chapterId: string, paragraphOrder: number) => {
      fetch(`/api/books/${bookSlug}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, paragraphOrder }),
      }).catch((err) => console.error("保存阅读进度失败:", err));
    },
    [bookSlug]
  );

  const debouncedSave = useRef(debounce(saveProgress, 3000));

  // IntersectionObserver 追踪当前可见段落
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const paragraphEl = entry.target as HTMLElement;
            const chapterId = paragraphEl.dataset.chapterId;
            const paragraphOrder = parseInt(paragraphEl.dataset.order || "0", 10);
            if (chapterId && paragraphOrder > 0) {
              debouncedSave.current(chapterId, paragraphOrder);
            }
          }
        }
      },
      { root: container, rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    const paragraphElements = container.querySelectorAll("[data-chapter-id][data-order]");
    paragraphElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [chapters]);

  // 页面离开时保存进度
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // 立即保存（绕过防抖）
        saveProgress(
          chapters[0]?.paragraphs[0]?.id || "",
          0
        );
      }
    };

    const handleBeforeUnload = () => {
      saveProgress(
        chapters[0]?.paragraphs[0]?.id || "",
        0
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [chapters, saveProgress]);

  // 恢复阅读位置
  useEffect(() => {
    if (chapters.length === 0) return;

    fetch(`/api/books/${bookSlug}/progress`)
      .then((res) => res.json())
      .then((data) => {
        if (data.chapterId && data.paragraphOrder > 0) {
          const target = scrollContainerRef.current?.querySelector(
            `[data-chapter-id="${data.chapterId}"][data-order="${data.paragraphOrder}"]`
          );
          if (target) {
            target.scrollIntoView({ block: "start" });
          }
        }
      })
      .catch(() => {
        // 忽略恢复失败
      });
  }, [bookSlug, chapters.length]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Reader panel */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-[660px] mx-auto px-10 py-14 pb-40 max-md:px-6 max-md:py-10">
          <ReaderContent
            bookId={bookId}
            bookSlug={bookSlug}
            chapters={chapters}
            onCharHover={(char, rect) => {
              setTooltipChar(char);
              setTooltipPos({ x: rect.x, y: rect.y });
            }}
            onCharUnhover={() => {
              setTooltipChar(null);
              setTooltipPos(null);
            }}
          />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        chapters={chapters}
        characters={characters}
        relations={relations}
      />

      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[250] md:hidden"
          onClick={toggleOpen}
        />
      )}

      {/* Toggle button */}
      <button
        className="fixed top-3.5 right-2.5 z-[300] w-[26px] h-[26px] bg-tip-bg border border-tip-bd rounded-md cursor-pointer text-[13px] flex items-center justify-center text-ink2 hover:text-ink hover:bg-side-bg transition-all font-ui select-none"
        onClick={toggleOpen}
        title="收起/展开侧边栏"
      >
        {isOpen ? "›" : "‹"}
      </button>

      {/* Text swap button */}
      <TextSwapButton />

      {/* Tooltip */}
      <CharacterTooltip character={tooltipChar} position={tooltipPos} />
    </div>
  );
}
