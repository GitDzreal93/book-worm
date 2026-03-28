"use client";

import { useState } from "react";
import type { VocabularyWordData } from "@/lib/types";

interface Props {
  word: VocabularyWordData;
  onSubmit: (quality: number) => void;
}

export function ReviewCard({ word, onSubmit }: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="mx-auto w-full max-w-md cursor-pointer select-none"
      style={{ perspective: "800px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative transition-transform duration-300 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
        }}
      >
        {/* Front */}
        <div
          className="card p-10 text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-3xl font-serif font-bold text-ink tracking-tight">
            {word.word}
          </p>
          {word.phonetic && (
            <p className="mt-3 text-sm text-ink2">{word.phonetic}</p>
          )}
          {word.partOfSpeech && (
            <span className="mt-2 inline-block rounded-md bg-accent/10 px-2 py-0.5 text-xs font-ui font-medium text-accent">
              {word.partOfSpeech}
            </span>
          )}
          {word.contextSentence && (
            <p className="mt-6 text-sm italic leading-relaxed text-ink2/70">
              &ldquo;{word.contextSentence}&rdquo;
            </p>
          )}
          <p className="mt-8 text-xs text-ink2/30 font-ui">点击翻转查看释义</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 card p-10 text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-sm text-ink2/60 mb-1 font-ui">{word.word}</p>
          <p className="text-xl font-serif font-semibold text-ink leading-relaxed">
            {word.definition}
          </p>
          {word.partOfSpeech && (
            <span className="mt-3 inline-block rounded-md bg-accent/10 px-2 py-0.5 text-xs font-ui font-medium text-accent">
              {word.partOfSpeech}
            </span>
          )}
          <p className="mt-8 text-xs text-ink2/30 font-ui">点击翻转回正面</p>
        </div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="mt-8" onClick={(e) => e.stopPropagation()}>
          <p className="mb-3 text-center text-xs text-ink2/40 font-ui">你对这个词的掌握程度</p>
          <div className="flex gap-2 justify-center">
            <ReviewButton
              value={0}
              label="不认识"
              colorClass="text-danger border-danger/20 hover:bg-danger/5"
              onSubmit={(q) => { onSubmit(q); setFlipped(false); }}
            />
            <ReviewButton
              value={1}
              label="模糊"
              colorClass="text-warning border-warning/20 hover:bg-warning/5"
              onSubmit={(q) => { onSubmit(q); setFlipped(false); }}
            />
            <ReviewButton
              value={3}
              label="熟悉"
              colorClass="text-accent border-accent/20 hover:bg-accent/5"
              onSubmit={(q) => { onSubmit(q); setFlipped(false); }}
            />
            <ReviewButton
              value={4}
              label="掌握"
              colorClass="text-success border-success/20 hover:bg-success/5"
              onSubmit={(q) => { onSubmit(q); setFlipped(false); }}
            />
            <ReviewButton
              value={5}
              label="完美"
              colorClass="text-success border-success/30 hover:bg-success/5"
              onSubmit={(q) => { onSubmit(q); setFlipped(false); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewButton({
  value,
  label,
  colorClass,
  onSubmit,
}: {
  value: number;
  label: string;
  colorClass: string;
  onSubmit: (quality: number) => void;
}) {
  return (
    <button
      onClick={() => onSubmit(value)}
      className={`rounded-lg border px-4 py-2.5 text-xs font-ui font-medium transition-all duration-150 cursor-pointer ${colorClass}`}
    >
      {label}
    </button>
  );
}
