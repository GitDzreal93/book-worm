"use client";

import { useState, useEffect, useCallback } from "react";

interface TranslationStatus {
  status: "idle" | "processing" | "completed";
  translated: number;
  total: number;
  percentage: number;
}

/** 翻译面板：显示翻译进度、手动触发翻译按钮 */
export function TranslationPanel({ bookSlug }: { bookSlug: string }) {
  const [status, setStatus] = useState<TranslationStatus>({
    status: "idle",
    translated: 0,
    total: 0,
    percentage: 0,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/translate?bookSlug=${bookSlug}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      // 静默处理
    }
  }, [bookSlug]);

  // 轮询翻译进度
  useEffect(() => {
    if (status.status !== "processing") return;

    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, [status.status, fetchStatus]);

  // 初始加载
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStart = async () => {
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookSlug }),
      });

      if (res.status === 409) {
        setStatus((prev) => ({ ...prev, status: "processing" }));
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStatus({
          status: "processing",
          translated: 0,
          total: 0,
          percentage: 0,
        });
        fetchStatus();
      }
    } catch {
      // 错误已在组件中静默处理
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {status.status === "processing" && (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-ui text-ink2">
            <span>翻译进度</span>
            <span>{status.percentage}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-orel transition-all duration-500"
              style={{ width: `${status.percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink2">
            已翻译 {status.translated} 段
            {status.total > 0 && ` / 共 ${status.total} 段`}
          </p>
        </div>
      )}

      {status.status === "completed" && (
        <p className="text-xs text-ink2">翻译完成</p>
      )}

      {status.status !== "processing" && (
        <button
          onClick={handleStart}
          className="w-full rounded-lg bg-ink px-4 py-2 text-sm text-bg transition-colors hover:bg-ink2 font-ui"
        >
          {status.status === "completed" ? "重新翻译" : "开始翻译"}
        </button>
      )}
    </div>
  );
}
