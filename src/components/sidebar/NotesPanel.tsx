"use client";

import { useState, useEffect, useCallback } from "react";
import type { HighlightData } from "@/lib/types";

interface Props {
  bookSlug: string;
  onJumpToHighlight?: (paragraphId: string, offset: number) => void;
}

export function NotesPanel({ bookSlug, onJumpToHighlight }: Props) {
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ bookSlug });
      const res = await fetch(`/api/highlights?${params}`);
      const data = await res.json();
      setHighlights(data.highlights || []);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [bookSlug]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const filtered = search
    ? highlights.filter(
        (h) =>
          h.note?.toLowerCase().includes(search.toLowerCase()) ||
          (h as unknown as Record<string, unknown>).text?.toString().toLowerCase().includes(search.toLowerCase()),
      )
    : highlights;

  // Group by chapter
  const grouped = filtered.reduce<Record<string, { title: string; items: HighlightData[] }>>(
    (acc, h) => {
      const key = h.chapterTitle || `Chapter ${h.chapterNumber}`;
      if (!acc[key]) acc[key] = { title: key, items: [] };
      acc[key].items.push(h);
      return acc;
    },
    {},
  );

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/highlights?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // 静默处理
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <input
        type="text"
        placeholder="搜索笔记..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-ink2/40 focus:border-orel focus:outline-none mb-4"
      />

      {loading ? (
        <p className="text-sm text-ink2 text-center py-8">加载中...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-ink2 text-center py-8 opacity-50">
          {search ? "没有匹配的笔记" : "还没有标注"}
        </p>
      ) : (
        Object.entries(grouped).map(([chapter, group]) => (
          <div key={chapter} className="mb-5">
            <p className="text-[11px] font-ui text-ink2 opacity-55 tracking-[0.15em] mb-2">
              {chapter}
            </p>
            <div className="flex flex-col gap-2">
              {group.items.map((h) => (
                <div
                  key={h.id}
                  className="rounded-md border border-line p-2.5 cursor-pointer hover:border-ink2/20 transition-colors"
                  onClick={() => onJumpToHighlight?.(h.paragraphId, h.startOffset)}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1 shrink-0 rounded-full self-stretch"
                      style={{
                        backgroundColor:
                          h.color === "yellow"
                            ? "#facc15"
                            : h.color === "green"
                              ? "#86efac"
                              : h.color === "blue"
                                ? "#93c5fd"
                                : h.color === "red"
                                  ? "#fca5a5"
                                  : "#c4b5fd",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      {h.note && (
                        <p className="text-sm text-ink leading-relaxed">{h.note}</p>
                      )}
                      <p className="text-xs text-ink2 opacity-50 mt-1">
                        {new Date(h.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(h.id);
                      }}
                      className="text-ink2 opacity-30 hover:opacity-80 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
