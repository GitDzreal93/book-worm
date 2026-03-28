"use client";

import { useState, useEffect, useCallback } from "react";
import { ReviewCard } from "@/components/vocabulary/ReviewCard";
import type { VocabularyWordData } from "@/lib/types";

export default function ReviewPage() {
  const [words, setWords] = useState<VocabularyWordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);

  const fetchDueWords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vocabulary/review");
      const data = await res.json();
      setWords(data.words);
      setCurrentIndex(0);
      setReviewed(0);
      setDone(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDueWords();
  }, [fetchDueWords]);

  const handleSubmit = useCallback(
    async (quality: number) => {
      const word = words[currentIndex];
      if (!word) return;

      try {
        await fetch("/api/vocabulary/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordId: word.id, quality }),
        });
      } catch {
        // silent
      }

      const newCount = reviewed + 1;
      setReviewed(newCount);

      if (currentIndex + 1 >= words.length) {
        setDone(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [words, currentIndex, reviewed],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="skeleton h-7 w-16 mb-8" />
          <div className="skeleton h-1 max-w-xs rounded-full mb-8" />
          <div className="skeleton h-64 rounded-xl mx-auto max-w-md" />
        </div>
      </main>
    );
  }

  if (words.length === 0) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="page-header">
            <h1 className="page-title">复习</h1>
          </div>
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <p className="empty-state-title">暂无待复习单词</p>
            <p className="empty-state-desc">
              继续阅读积累生词，或稍后再来查看
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="page-header">
            <h1 className="page-title">复习</h1>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-tip-bg py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <svg className="h-8 w-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-xl font-serif font-bold text-ink">
              复习完成
            </p>
            <p className="mt-2 text-sm text-ink2">
              本次复习了 {reviewed} 个单词
            </p>
            <button
              onClick={fetchDueWords}
              className="btn-primary mt-6"
            >
              再来一轮
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentWord = words[currentIndex];
  const progress = (currentIndex / words.length) * 100;

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="page-title">复习</h1>
          <span className="text-xs text-ink2/50 font-ui">
            {currentIndex + 1} / {words.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-10 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {currentWord && (
          <ReviewCard word={currentWord} onSubmit={handleSubmit} />
        )}
      </div>
    </main>
  );
}
