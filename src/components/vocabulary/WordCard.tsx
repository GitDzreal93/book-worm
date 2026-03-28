"use client";

import type { VocabularyWordData } from "@/lib/types";

interface Props {
  word: VocabularyWordData;
}

export function WordCard({ word }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line px-4 py-3 transition-colors hover:border-ink2/20">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink">{word.word}</span>
          {word.phonetic && (
            <span className="text-xs text-ink2">{word.phonetic}</span>
          )}
          {word.partOfSpeech && (
            <span className="text-xs text-orel">{word.partOfSpeech}</span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink2">
          {word.definition}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-ink2 opacity-50">
          {word.chapterTitle && <span>{word.chapterTitle}</span>}
          {word.contextSentence && (
            <span className="truncate max-w-[240px]">
              「{word.contextSentence}」
            </span>
          )}
        </div>
      </div>
      {word.nextReviewDate && (
        <span className="shrink-0 text-xs text-ink2 opacity-50">
          {new Date(word.nextReviewDate).toLocaleDateString("zh-CN")}
        </span>
      )}
    </div>
  );
}
