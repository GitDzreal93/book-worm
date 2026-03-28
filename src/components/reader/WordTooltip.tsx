"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface DictionaryResult {
  definition: string;
  partOfSpeech: string | null;
  phonetic: string | null;
}

interface Props {
  word: string;
  bookId: string;
  context?: string;
  chapterTitle?: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const QUALITY_LABELS = [
  { value: 0, label: "不认识" },
  { value: 1, label: "模糊" },
  { value: 3, label: "熟悉" },
  { value: 4, label: "掌握" },
  { value: 5, label: "完美" },
];

export function WordTooltip({
  word,
  bookId,
  context,
  chapterTitle,
  position,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchDefinition() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, bookId, context, chapterTitle }),
        });
        if (!res.ok) throw new Error("查询失败");
        const data = await res.json();
        if (!cancelled) {
          setResult({
            definition: data.definition,
            partOfSpeech: data.partOfSpeech,
            phonetic: data.phonetic,
          });
          setAdded(true);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "查询失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDefinition();
    return () => {
      cancelled = true;
    };
  }, [word, bookId, context, chapterTitle]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Position: place above the word, offset by tooltip height
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const y = position.y - rect.height - 8;
    setAdjustedPos({
      x: Math.min(position.x, window.innerWidth - rect.width - 12),
      y: y > 8 ? y : position.y + 24,
    });
  }, [position, result]);

  return (
    <div
      ref={ref}
      className="fixed z-[300] w-72 rounded-lg border border-line bg-bg p-4 shadow-lg"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {/* Word header */}
      <div className="mb-2 flex items-start justify-between">
        <div>
          <span className="text-base font-semibold text-ink">{word}</span>
          {result?.phonetic && (
            <span className="ml-2 text-xs text-ink2">{result.phonetic}</span>
          )}
          {result?.partOfSpeech && (
            <span className="ml-1.5 text-xs text-orel">
              {result.partOfSpeech}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-ink2 opacity-40 hover:opacity-80"
        >
          ✕
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-ink2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-orel border-t-transparent" />
          查询中...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="py-3 text-sm text-red-500">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 text-xs text-orel hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <>
          <p className="text-sm leading-relaxed text-ink">{result.definition}</p>
          {added && (
            <p className="mt-2 text-xs text-ink2 opacity-60">
              已加入生词本
            </p>
          )}
        </>
      )}
    </div>
  );
}
