"use client";

import { AnnotatedText } from "./AnnotatedText";
import { useSidebar } from "@/components/layout/SidebarProvider";
import type { ChapterData, CharacterData, ParagraphTranslationData, HighlightData } from "@/lib/types";

interface Props {
  chapter: ChapterData;
  bookId?: string;
  translations?: Record<string, ParagraphTranslationData | null>;
  highlights?: Record<string, HighlightData[]>;
  onCharHover?: (char: CharacterData, rect: DOMRect) => void;
  onCharUnhover?: () => void;
}

/** 翻译文本展示组件，含降级状态处理 */
function TranslationText({
  paragraphId,
  translations,
}: {
  paragraphId: string;
  translations?: Record<string, ParagraphTranslationData | null>;
}) {
  const translation = translations?.[paragraphId];

  if (translation?.content) {
    return (
      <p className="mt-2 pl-4 border-l-2 border-orel/30 text-sm text-ink2 leading-relaxed">
        {translation.content}
        {translation.isEdited && (
          <span className="ml-2 text-xs text-ink2 opacity-60">(已编辑)</span>
        )}
      </p>
    );
  }

  return (
    <p className="mt-2 pl-4 border-l-2 border-line text-sm text-ink2 opacity-50 italic">
      暂无翻译
    </p>
  );
}

export function ChapterSection({
  chapter,
  bookId,
  translations,
  highlights,
  onCharHover,
  onCharUnhover,
}: Props) {
  const { showTranslation } = useSidebar();

  return (
    <section id={`ch-${chapter.number}`} className="mb-14">
      <h2 className="text-xs font-normal font-ui text-ink2 tracking-[0.35em] mb-7 pb-3 border-b border-line">
        {chapter.title}
      </h2>
      {chapter.summary && (
        <p className="mb-5 pl-4 border-l-2 border-ink2/20 text-sm text-ink2 leading-relaxed italic">
          {chapter.summary}
        </p>
      )}
      {chapter.paragraphs.map((p) => (
        <div key={p.id}>
          <AnnotatedText
            content={p.content}
            paragraphId={p.id}
            bookId={bookId}
            highlights={highlights?.[p.id]}
            onCharHover={onCharHover}
            onCharUnhover={onCharUnhover}
          />
          {showTranslation && (
            <TranslationText
              paragraphId={p.id}
              translations={translations}
            />
          )}
        </div>
      ))}
    </section>
  );
}
