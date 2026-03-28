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
      className="w-full max-w-md mx-auto cursor-pointer select-none perspective-600"
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative transition-transform duration-300"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
        }}
      >
        {/* Front */}
        <div
          className="rounded-xl border border-line bg-bg p-8 text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-2xl font-bold text-ink">{word.word}</p>
          {word.phonetic && (
            <p className="mt-2 text-sm text-ink2">{word.phonetic}</p>
          )}
          {word.partOfSpeech && (
            <p className="mt-1 text-xs text-orel">{word.partOfSpeech}</p>
          )}
          {word.contextSentence && (
            <p className="mt-4 text-sm italic text-ink2 leading-relaxed">
              「{word.contextSentence}」
            </p>
          )}
          <p className="mt-6 text-xs text-ink2 opacity-40">点击翻转查看释义</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl border border-line bg-bg p-8 text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-sm text-ink2 mb-2">{word.word}</p>
          <p className="text-xl font-semibold text-ink leading-relaxed">
            {word.definition}
          </p>
          {word.partOfSpeech && (
            <p className="mt-2 text-xs text-orel">{word.partOfSpeech}</p>
          )}
          <p className="mt-4 text-xs text-ink2 opacity-40">点击翻转回正面</p>
        </div>
      </div>

      {/* Rating buttons - always visible */}
      {flipped && (
        <div
          className="mt-6"
          onClick={(e) => e.stopPropagation()}
        >
          <ReviewControls onSubmit={(quality) => {
            onSubmit(quality);
            setFlipped(false);
          }} />
        </div>
      )}
    </div>
  );
}

/** Review quality rating buttons */
function ReviewControls({ onSubmit }: { onSubmit: (quality: number) => void }) {
  const buttons = [
    { value: 0, label: "不认识", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    { value: 1, label: "模糊", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    { value: 3, label: "熟悉", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
    { value: 4, label: "掌握", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    { value: 5, label: "完美", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  ];

  return (
    <div className="flex gap-2 justify-center">
      {buttons.map((btn) => (
        <button
          key={btn.value}
          onClick={() => onSubmit(btn.value)}
          className={`rounded-lg border px-3 py-2 text-xs font-ui transition-colors hover:opacity-80 ${btn.color}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
