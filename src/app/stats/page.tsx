"use client";

import { useState, useEffect } from "react";
import { ReadingChart } from "@/components/stats/ReadingChart";

interface Overview {
  totalBooks: number;
  completedBooks: number;
  totalReadingMinutes: number;
  totalWords: number;
  totalVocabularyWords: number;
  totalHighlights: number;
  currentStreak: number;
}

interface DailyStat {
  date: string;
  minutes: number;
  sessions: number;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} 分钟`;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
}

const STAT_CARDS = [
  { key: "totalBooks" as const, label: "书籍总数", format: (v: number) => `${v} 本` },
  { key: "completedBooks" as const, label: "读完", format: (v: number) => `${v} 本` },
  { key: "totalReadingMinutes" as const, label: "阅读时长", format: formatMinutes },
  { key: "totalWords" as const, label: "总字数", format: (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)} 万` : `${v}` },
  { key: "totalVocabularyWords" as const, label: "生词数", format: (v: number) => `${v} 词` },
  { key: "totalHighlights" as const, label: "标注数", format: (v: number) => `${v} 条` },
];

export default function StatsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setOverview(data.overview);
        setDaily(data.daily || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="flex items-center justify-center py-20 text-sm text-ink2">
          加载中...
        </div>
      </main>
    );
  }

  // Empty state: no data at all
  if (!overview || overview.totalBooks === 0) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold text-ink font-ui mb-6">阅读统计</h1>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-20">
            <p className="text-lg text-ink2">还没有阅读记录</p>
            <p className="mt-2 text-sm text-ink2">
              导入一本电子书开始阅读，统计数据将自动记录
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-ink font-ui mb-6">阅读统计</h1>

        {/* Streak */}
        {overview.currentStreak > 0 && (
          <div className="mb-6 rounded-lg border border-orel/20 bg-orel/5 px-4 py-3">
            <p className="text-sm text-ink">
              已连续阅读 <span className="font-semibold text-orel">{overview.currentStreak}</span> 天
            </p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-8 sm:grid-cols-3">
          {STAT_CARDS.map((card) => (
            <div
              key={card.key}
              className="rounded-lg border border-line px-4 py-3"
            >
              <p className="text-xs text-ink2 opacity-60 mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-ink font-ui">
                {card.format(overview[card.key])}
              </p>
            </div>
          ))}
        </div>

        {/* Daily chart */}
        {daily.length > 0 && (
          <div className="rounded-lg border border-line px-4 py-4">
            <p className="text-xs text-ink2 opacity-60 mb-4 font-ui">
              近 30 天阅读时长
            </p>
            <ReadingChart daily={daily} />
            <div className="flex justify-between mt-2 text-[10px] text-ink2 opacity-40">
              <span>{daily[0]?.date.slice(5)}</span>
              <span>{daily[daily.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
