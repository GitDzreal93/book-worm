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
      // 静默处理
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
        // 静默处理
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
        <div className="flex items-center justify-center py-20 text-sm text-ink2">
          加载中...
        </div>
      </main>
    );
  }

  if (words.length === 0) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold text-ink font-ui mb-6">复习</h1>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-20">
            <p className="text-lg text-ink2">暂无待复习单词</p>
            <p className="mt-2 text-sm text-ink2">
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
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold text-ink font-ui mb-6">复习</h1>
          <div className="flex flex-col items-center justify-center rounded-xl border border-line py-20">
            <p className="text-xl font-semibold text-ink">
              复习完成！
            </p>
            <p className="mt-2 text-sm text-ink2">
              本次复习了 {reviewed} 个单词
            </p>
            <button
              onClick={fetchDueWords}
              className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm text-bg font-ui transition-colors hover:bg-ink2"
            >
              再来一轮
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink font-ui">复习</h1>
          <span className="text-xs text-ink2 opacity-50">
            {currentIndex + 1} / {words.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-orel transition-all duration-300"
            style={{
              width: `${((currentIndex) / words.length) * 100}%`,
            }}
          />
        </div>

        {currentWord && (
          <ReviewCard word={currentWord} onSubmit={handleSubmit} />
        )}
      </div>
    </main>
  );
}
