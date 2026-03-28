"use client";

import { useState } from "react";
import { AnnotatedText } from "./AnnotatedText";
import { useSidebar } from "@/components/layout/SidebarProvider";
import type { ChapterData, CharacterData, ParagraphTranslationData, HighlightData } from "@/lib/types";

interface Props {
  chapter: ChapterData;
  bookId?: string;
  bookSlug?: string;
  characters?: CharacterData[];
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
  bookSlug,
  characters = [],
  translations,
  highlights,
  onCharHover,
  onCharUnhover,
}: Props) {
  const { showTranslation, hasLLM } = useSidebar();
  const [summary, setSummary] = useState<string | null>(chapter.summary ?? null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    if (!bookSlug) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookSlug, chapterNumber: chapter.number }),
      });
      const data = await res.json() as { summaries?: { summary: string }[] };
      const generated = data.summaries?.[0]?.summary ?? null;
      if (generated) setSummary(generated);
    } catch {
      // 静默处理
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <section id={`ch-${chapter.number}`} className="mb-14">
      <div className="flex items-baseline justify-between mb-7 pb-3 border-b border-line">
        <h2 className="text-xs font-normal font-ui text-ink2 tracking-[0.35em]">
          {chapter.title}
        </h2>
        {hasLLM && (
          <button
            onClick={() => void handleGenerateSummary()}
            disabled={generatingSummary}
            className="shrink-0 ml-3 text-[10px] font-ui text-ink2 opacity-50 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            title="生成本章梗概"
          >
            {generatingSummary ? "生成中…" : summary ? "↺ 梗概" : "+ 梗概"}
          </button>
        )}
      </div>
      {summary && (
        <p className="mb-5 pl-4 border-l-2 border-ink2/20 text-sm text-ink2 leading-relaxed italic">
          {summary}
        </p>
      )}
      {chapter.paragraphs.map((p) => (
        <div key={p.id}>
          <AnnotatedText
            content={p.content}
            paragraphId={p.id}
            bookId={bookId}
            characters={characters}
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
