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
      // 静默处理
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
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-ink font-ui mb-6">生词本</h1>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="搜索单词..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-ink2/40 focus:border-orel focus:outline-none"
          />
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
                className={`rounded-md px-3 py-1 text-xs font-ui transition-colors ${
                  sort === opt.value
                    ? "bg-ink text-bg"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink2 opacity-50">
            共 {total} 词
          </span>
        </div>

        {/* Word list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-ink2">
            加载中...
          </div>
        ) : words.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-20">
            <p className="text-lg text-ink2">
              {search ? "没有找到匹配的单词" : "生词本还是空的"}
            </p>
            <p className="mt-2 text-sm text-ink2">
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
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-ui text-ink2 disabled:opacity-30 hover:text-ink"
            >
              上一页
            </button>
            <span className="text-xs text-ink2 opacity-50">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-ui text-ink2 disabled:opacity-30 hover:text-ink"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
