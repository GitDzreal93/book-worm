"use client";

import type { VocabularyWordData } from "@/lib/types";

interface Props {
  word: VocabularyWordData;
}

function getReviewStatus(nextReviewDate: string | null): {
  label: string;
  colorClass: string;
} {
  if (!nextReviewDate) return { label: "new", colorClass: "bg-blue-400" };

  const now = Date.now();
  const review = new Date(nextReviewDate).getTime();
  const daysUntil = (review - now) / 86400000;

  if (daysUntil <= 0) return { label: "due", colorClass: "bg-danger" };
  if (daysUntil <= 1) return { label: "soon", colorClass: "bg-warning" };
  return { label: "ok", colorClass: "bg-success" };
}

export function WordCard({ word }: Props) {
  const status = getReviewStatus(word.nextReviewDate);

  return (
    <div className="card flex items-start gap-3 p-4">
      {/* Status dot */}
      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" title={status.label} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-bold text-ink font-ui">
            {word.word}
          </span>
          {word.phonetic && (
            <span className="text-xs text-ink2/60">{word.phonetic}</span>
          )}
          {word.partOfSpeech && (
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-ui font-medium text-accent">
              {word.partOfSpeech}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink2">
          {word.definition}
        </p>
        {word.contextSentence && (
          <p className="mt-1.5 truncate text-xs italic text-ink2/50">
            &ldquo;{word.contextSentence}&rdquo;
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink2/40 font-ui">
          {word.chapterTitle && <span>{word.chapterTitle}</span>}
        </div>
      </div>
    </div>
  );
}
