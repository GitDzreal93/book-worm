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
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const STAT_CARDS = [
  {
    key: "totalBooks" as const,
    label: "书籍总数",
    format: (v: number) => `${v}`,
    unit: "本",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    key: "completedBooks" as const,
    label: "已读完",
    format: (v: number) => `${v}`,
    unit: "本",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    key: "totalReadingMinutes" as const,
    label: "阅读时长",
    format: formatMinutes,
    unit: "",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "totalWords" as const,
    label: "总字数",
    format: (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}` : `${v}`,
    unit: (v: number) => v >= 10000 ? "万" : "",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
  },
  {
    key: "totalVocabularyWords" as const,
    label: "生词数",
    format: (v: number) => `${v}`,
    unit: "词",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: "totalHighlights" as const,
    label: "标注数",
    format: (v: number) => `${v}`,
    unit: "条",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
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
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="skeleton h-7 w-24 mb-8" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!overview || overview.totalBooks === 0) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="page-header">
            <h1 className="page-title">阅读统计</h1>
          </div>
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <p className="empty-state-title">还没有阅读记录</p>
            <p className="empty-state-desc">
              导入一本电子书开始阅读，统计数据将自动记录
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="page-header">
          <h1 className="page-title">阅读统计</h1>
        </div>

        {/* Streak banner */}
        {overview.currentStreak > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/15 bg-accent/5 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-ui font-medium text-ink">
                已连续阅读 <span className="text-accent">{overview.currentStreak}</span> 天
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STAT_CARDS.map((card) => {
            const val = overview[card.key];
            return (
              <div
                key={card.key}
                className="card flex items-start gap-3 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink2">
                  {card.icon}
                </div>
                <div>
                  <p className="text-[11px] text-ink2/60 font-ui">{card.label}</p>
                  <p className="mt-0.5 text-lg font-semibold text-ink font-ui leading-tight">
                    {card.format(val)}
                    {card.unit && (
                      <span className="ml-0.5 text-xs font-normal text-ink2/60">
                        {typeof card.unit === "function" ? card.unit(val) : card.unit}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily chart */}
        {daily.length > 0 && (
          <div className="card p-5">
            <p className="mb-4 text-xs font-ui font-medium text-ink2/60">
              近 30 天阅读时长
            </p>
            <ReadingChart daily={daily} />
            <div className="mt-3 flex justify-between text-[10px] text-ink2/40 font-ui">
              <span>{daily[0]?.date.slice(5)}</span>
              <span>{daily[daily.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
