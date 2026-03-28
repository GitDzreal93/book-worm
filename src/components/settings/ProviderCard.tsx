"use client";

import { useState } from "react";
import type { AIProvider } from "@/types/settings";
import { getPreset } from "@/lib/default-prompts";

interface ProviderCardProps {
  provider: AIProvider;
  selected: boolean;
  maskedKey: string | null;
  onSelect: () => void;
  onVerified: () => void;
}

export function ProviderCard({
  provider,
  selected,
  maskedKey,
  onSelect,
  onVerified,
}: ProviderCardProps) {
  const [inputKey, setInputKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [verifyError, setVerifyError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const preset = getPreset(provider);
  const displayName = preset?.name ?? provider;

  const handleVerify = async () => {
    if (!inputKey.trim()) return;

    setVerifying(true);
    setVerifyResult("idle");
    setVerifyError("");

    try {
      const res = await fetch("/api/settings/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: inputKey.trim() }),
      });

      const data = (await res.json()) as {
        valid?: boolean;
        error?: string;
      };

      if (data.valid) {
        setVerifyResult("success");
        setInputKey("");
        onVerified();
      } else {
        setVerifyResult("error");
        setVerifyError(data.error ?? "验证失败");
      }
    } catch {
      setVerifyResult("error");
      setVerifyError("网络错误");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch("/api/settings/verify-key", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      onVerified();
    } finally {
      setDeleting(false);
    }
  };

  const hasKey = maskedKey !== null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={`rounded-lg border-2 p-4 transition-colors cursor-pointer ${
        selected
          ? "border-ink bg-ink/5"
          : "border-line hover:border-ink/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            {displayName}
          </span>
          {hasKey && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              已配置
            </span>
          )}
        </div>
        {selected && (
          <span className="text-xs text-ink2">当前选择</span>
        )}
      </div>

      {/* Masked key display */}
      {hasKey && !inputKey && (
        <div className="flex items-center justify-between mt-1">
          <code className="text-xs text-ink2 bg-ink/5 px-2 py-1 rounded">
            {maskedKey}
          </code>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete();
            }}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? "删除中..." : "删除"}
          </button>
        </div>
      )}

      {/* API Key input + verify */}
      <div
        className="mt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="输入 API Key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="flex-1 min-w-0 text-xs border border-line rounded px-2 py-1.5 bg-bg text-ink placeholder:text-ink2 focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={verifying || !inputKey.trim()}
            className="text-xs px-3 py-1.5 rounded bg-ink text-bg font-medium disabled:opacity-50 transition-colors"
          >
            {verifying ? "验证中..." : "验证"}
          </button>
        </div>

        {/* Verify status */}
        {verifyResult === "success" && (
          <p className="text-xs text-green-600 mt-1">API Key 验证成功</p>
        )}
        {verifyResult === "error" && (
          <p className="text-xs text-red-600 mt-1">{verifyError}</p>
        )}
      </div>
    </div>
  );
}
