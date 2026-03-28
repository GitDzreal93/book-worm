"use client";

import { useState, useRef, useEffect } from "react";
import type { HighlightData } from "@/lib/types";

interface Props {
  paragraphId: string;
  bookId: string;
  selection: { startOffset: number; endOffset: number; text: string };
  position: { x: number; y: number };
  onClose: () => void;
  onCreated?: (highlight: HighlightData) => void;
}

const COLORS = [
  { value: "yellow", label: "黄", bg: "bg-yellow-200/60" },
  { value: "green", label: "绿", bg: "bg-green-200/60" },
  { value: "blue", label: "蓝", bg: "bg-blue-200/60" },
  { value: "red", label: "红", bg: "bg-red-200/60" },
  { value: "purple", label: "紫", bg: "bg-purple-200/60" },
];

export function HighlightToolbar({
  paragraphId,
  bookId,
  selection,
  position,
  onClose,
  onCreated,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [color, setColor] = useState("yellow");

  // Position adjustment
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const y = position.y - rect.height - 8;
    setAdjustedPos({
      x: Math.max(8, Math.min(position.x, window.innerWidth - rect.width - 8)),
      y: y > 8 ? y : position.y + 24,
    });
  }, [position, showNote]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paragraphId,
          bookId,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          color,
          note: note || undefined,
          text: selection.text,
        }),
      });
      const data = await res.json();
      onCreated?.(data);
    } catch {
      // 静默处理
    }
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-[300] rounded-lg border border-line bg-bg shadow-lg"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {!showNote ? (
        <div className="flex items-center gap-1 p-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${
                color === c.value ? "border-ink scale-110" : "border-transparent"
              }`}
              title={c.label}
            />
          ))}
          <div className="mx-1 w-px h-4 bg-line" />
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs font-ui text-ink hover:text-orel transition-colors"
          >
            高亮
          </button>
          <button
            onClick={() => setShowNote(true)}
            className="px-2 py-1 text-xs font-ui text-ink2 hover:text-ink transition-colors"
          >
            笔记
          </button>
        </div>
      ) : (
        <div className="p-3 w-56">
          <div className="flex items-center gap-1 mb-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-4 h-4 rounded-full border-2 transition-all ${c.bg} ${
                  color === c.value ? "border-ink" : "border-transparent"
                }`}
              />
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加笔记..."
            autoFocus
            rows={3}
            className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm text-ink placeholder:text-ink2/40 focus:border-orel focus:outline-none resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowNote(false)}
              className="flex-1 rounded-md border border-line px-2 py-1 text-xs font-ui text-ink2 hover:text-ink"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-md bg-ink px-2 py-1 text-xs font-ui text-bg hover:bg-ink2"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
