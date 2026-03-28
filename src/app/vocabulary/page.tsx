"use client";

import { useState, useEffect, useCallback } from "react";
import { WordCard } from "@/components/vocabulary/WordCard";
import type { VocabularyWordData } from "@/lib/types";

interface VocabularyResponse {
  words: VocabularyWordData[];
  total: number;
  page: number;
  limit: number;
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabularyWordData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = 20;

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/vocabulary?${params}`);
      const data: VocabularyResponse = await res.json();
      setWords(data.words);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sort, page, search]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="page-header">
          <h1 className="page-title">生词本</h1>
          <p className="page-desc">
            共 {total} 个生词
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute top-1/2 left-3 -translate-y-1/2 h-3.5 w-3.5 text-ink2/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索单词..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-base pl-9"
            />
          </div>

          {/* Sort pills */}
          <div className="flex gap-1 rounded-lg border border-line p-0.5">
            {[
              { value: "recent", label: "最近" },
              { value: "alpha", label: "字母" },
              { value: "chapter", label: "章节" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSort(opt.value);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1 text-xs font-ui transition-colors cursor-pointer ${
                  sort === opt.value
                    ? "bg-ink text-bg font-medium"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Word list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : words.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p className="empty-state-title">
              {search ? "没有找到匹配的单词" : "生词本还是空的"}
            </p>
            <p className="empty-state-desc">
              {search
                ? "试试其他关键词"
                : "在阅读时点击外文单词即可加入生词本"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {words.map((w) => (
              <WordCard key={w.id} word={w} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-30 disabled:pointer-events-none"
            >
              上一页
            </button>
            <span className="px-3 text-xs text-ink2/60 font-ui">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary disabled:opacity-30 disabled:pointer-events-none"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
