"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { CharacterTooltip } from "@/components/reader/CharacterTooltip";
import { TextSwapButton } from "@/components/reader/TextSwapButton";
import { Sidebar } from "@/components/sidebar/Sidebar";
import type { CharacterData, ChapterData, FamilyRelationData } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";

interface ChapterMeta {
  id: string;
  number: number;
  title: string;
  summary: string | null;
}

interface Props {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  chapterMeta: ChapterMeta[];
  characters: CharacterData[];
  relations: FamilyRelationData[];
  hasLLM: boolean;
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
  bookSlug,
  chapterMeta,
  characters: initialCharacters,
  relations: initialRelations,
}: Props) {
  const { isOpen, toggleOpen } = useSidebar();

  // ── chapter-by-chapter loading ──────────────────────────────────────────
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [chapterContent, setChapterContent] = useState<ChapterData | null>(null);
  const [chapterLoading, setChapterLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Live characters/relations (may be refreshed after LLM generation)
  const [characters, setCharacters] = useState<CharacterData[]>(initialCharacters);
  const [relations, setRelations] = useState<FamilyRelationData[]>(initialRelations);

  const [tooltipChar, setTooltipChar] = useState<CharacterData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const currentMeta = chapterMeta[currentChapterIdx];

  // Fetch a single chapter's content
  const loadChapter = useCallback(async (idx: number) => {
    const meta = chapterMeta[idx];
    if (!meta) return;
    setChapterLoading(true);
    scrollContainerRef.current?.scrollTo({ top: 0 });
    try {
      const res = await fetch(
        `/api/books/${bookSlug}/chapters/${meta.number}`
      );
      const data = (await res.json()) as ChapterData;
      setChapterContent(data);
    } catch {
      setChapterContent(null);
    } finally {
      setChapterLoading(false);
    }
  }, [bookSlug, chapterMeta]);

  // Initial load: restore saved progress chapter
  useEffect(() => {
    if (chapterMeta.length === 0) return;

    fetch(`/api/books/${bookSlug}/progress`)
      .then((r) => r.json())
      .then((data: { chapterId?: string }) => {
        if (data.chapterId) {
          const savedIdx = chapterMeta.findIndex((c) => c.id === data.chapterId);
          const idx = savedIdx >= 0 ? savedIdx : 0;
          setCurrentChapterIdx(idx);
          void loadChapter(idx);
        } else {
          void loadChapter(0);
        }
      })
      .catch(() => void loadChapter(0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookSlug]);

  // When chapter index changes (from TOC or prev/next) reload content
  const goToChapter = useCallback((idx: number) => {
    setCurrentChapterIdx(idx);
    void loadChapter(idx);
  }, [loadChapter]);

  // ── reading session ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/stats/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    })
      .then((r) => r.json())
      .then((d: { id?: string }) => { if (d.id) sessionIdRef.current = d.id; })
      .catch(() => {});

    const endSession = () => {
      if (!sessionIdRef.current) return;
      fetch("/api/stats/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionIdRef.current }),
      }).catch(() => {});
      sessionIdRef.current = null;
    };

    const onHide = () => { if (document.visibilityState === "hidden") endSession(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", endSession);
    return () => {
      endSession();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", endSession);
    };
  }, [bookId]);

  // ── save progress when chapter changes ──────────────────────────────────
  useEffect(() => {
    if (!currentMeta) return;
    fetch(`/api/books/${bookSlug}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: currentMeta.id, paragraphOrder: 0 }),
    }).catch(() => {});
  }, [bookSlug, currentMeta]);

  // ── poll characters/relations until they exist (post-generation) ─────────
  useEffect(() => {
    if (characters.length > 0) return;  // already have data

    let attempts = 0;
    const maxAttempts = 20;
    const timer = setInterval(() => {
      attempts++;
      fetch(`/api/books/${bookSlug}/characters`)
        .then((r) => r.json())
        .then((data: CharacterData[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setCharacters(data);
            clearInterval(timer);
            // Also refresh relations
            return fetch(`/api/books/${bookSlug}/family-tree`);
          }
        })
        .then((r) => {
          if (r) return r.json();
        })
        .then((d: { relations?: FamilyRelationData[] } | undefined) => {
          if (d?.relations) setRelations(d.relations);
        })
        .catch(() => {});

      if (attempts >= maxAttempts) clearInterval(timer);
    }, 5000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookSlug]);

  const chapterAsArray: ChapterData[] = currentMeta
    ? [{
        id: currentMeta.id,
        number: currentMeta.number,
        title: currentMeta.title,
        summary: chapterContent?.summary ?? currentMeta.summary ?? null,
        paragraphs: chapterContent?.paragraphs ?? [],
      }]
    : [];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Reader panel */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-[660px] mx-auto px-10 py-14 pb-20 max-md:px-6 max-md:py-10">
          {chapterLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-5 bg-ink/8 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          ) : (
            <ReaderContent
              bookId={bookId}
              bookSlug={bookSlug}
              chapters={chapterAsArray}
              characters={characters}
              onCharHover={(char, rect) => {
                setTooltipChar(char);
                setTooltipPos({ x: rect.x, y: rect.y });
              }}
              onCharUnhover={() => {
                setTooltipChar(null);
                setTooltipPos(null);
              }}
            />
          )}

          {/* Chapter navigation */}
          {!chapterLoading && (
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-line">
              <button
                onClick={() => goToChapter(currentChapterIdx - 1)}
                disabled={currentChapterIdx === 0}
                className="flex items-center gap-1.5 text-sm font-ui text-ink2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← 上一章
              </button>
              <span className="text-xs font-ui text-ink2 opacity-50">
                {currentChapterIdx + 1} / {chapterMeta.length}
              </span>
              <button
                onClick={() => goToChapter(currentChapterIdx + 1)}
                disabled={currentChapterIdx === chapterMeta.length - 1}
                className="flex items-center gap-1.5 text-sm font-ui text-ink2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                下一章 →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        chapters={chapterMeta}
        characters={characters}
        relations={relations}
        currentChapterIdx={currentChapterIdx}
        onChapterSelect={goToChapter}
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
