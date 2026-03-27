"use client";

import { AnnotatedText } from "./AnnotatedText";
import type { ChapterData, CharacterData } from "@/lib/types";

interface Props {
  chapter: ChapterData;
  onCharHover?: (char: CharacterData, rect: DOMRect) => void;
  onCharUnhover?: () => void;
}

export function ChapterSection({ chapter, onCharHover, onCharUnhover }: Props) {
  return (
    <section id={`ch-${chapter.number}`} className="mb-14">
      <h2 className="text-xs font-normal font-ui text-ink2 tracking-[0.35em] mb-7 pb-3 border-b border-line">
        {chapter.title}
      </h2>
      {chapter.paragraphs.map((p) => (
        <AnnotatedText
          key={p.id}
          content={p.content}
          onCharHover={onCharHover}
          onCharUnhover={onCharUnhover}
        />
      ))}
    </section>
  );
}
