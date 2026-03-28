"use client";

import { useEffect, useState, useCallback } from "react";
import { ChapterSection } from "./ChapterSection";
import type { ChapterData, CharacterData, HighlightData } from "@/lib/types";

interface Props {
  bookId?: string;
  bookSlug?: string;
  chapters: ChapterData[];
  onCharHover?: (char: CharacterData, rect: DOMRect) => void;
  onCharUnhover?: () => void;
}

export function ReaderContent({
  bookId,
  bookSlug,
  chapters,
  onCharHover,
  onCharUnhover,
}: Props) {
  const [highlightsMap, setHighlightsMap] = useState<Record<string, HighlightData[]>>({});

  const fetchHighlights = useCallback(async () => {
    if (!bookSlug) return;
    try {
      const res = await fetch(`/api/highlights?bookSlug=${bookSlug}`);
      const data = await res.json();
      const map: Record<string, HighlightData[]> = {};
      for (const hl of data.highlights || []) {
        if (!map[hl.paragraphId]) map[hl.paragraphId] = [];
        map[hl.paragraphId].push(hl);
      }
      setHighlightsMap(map);
    } catch {
      // 静默处理
    }
  }, [bookSlug]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  return (
    <>
      {chapters.map((chapter) => (
        <ChapterSection
          key={chapter.id}
          chapter={chapter}
          bookId={bookId}
          highlights={highlightsMap}
          onCharHover={onCharHover}
          onCharUnhover={onCharUnhover}
        />
      ))}
    </>
  );
}
