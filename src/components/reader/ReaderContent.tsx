"use client";

import { ChapterSection } from "./ChapterSection";
import type { ChapterData, CharacterData } from "@/lib/types";

interface Props {
  chapters: ChapterData[];
  onCharHover?: (char: CharacterData, rect: DOMRect) => void;
  onCharUnhover?: () => void;
}

export function ReaderContent({ chapters, onCharHover, onCharUnhover }: Props) {
  return (
    <>
      {chapters.map((chapter) => (
        <ChapterSection
          key={chapter.id}
          chapter={chapter}
          onCharHover={onCharHover}
          onCharUnhover={onCharUnhover}
        />
      ))}
    </>
  );
}
