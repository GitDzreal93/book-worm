"use client";

import { useEffect, useState } from "react";
import type { AISettings } from "@/types/settings";
import { PRESET_PROVIDERS, CUSTOM_PROVIDER } from "@/types/settings";
import { getDefaultModelId, getPreset } from "@/lib/default-prompts";

interface ProviderSelectorProps {
  settings: AISettings;
  onProviderChange: (provider: string, model: string) => void;
  onVerified: () => void;
}

function getProviderDisplayName(provider: string): string {
  const nameMap: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    deepseek: "DeepSeek",
    qwen: "Qwen (通义千问)",
    kimi: "Kimi (月之暗面)",
    doubao: "Doubao (豆包)",
  };
  return nameMap[provider] ?? provider;
}

function getProviderBaseUrl(provider: string): string | null {
  return getPreset(provider)?.baseUrl ?? null;
}

export function ProviderSelector({
  settings,
  onProviderChange,
  onVerified,
}: ProviderSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState(settings.default_provider);
  const [apiKey, setApiKey] = useState("");
  const [customName, setCustomName] = useState(settings.custom_provider_name ?? "");
  const [customBaseUrl, setCustomBaseUrl] = useState(settings.custom_provider_base_url ?? "");
  const [customModel, setCustomModel] = useState(settings.custom_provider_model ?? "");
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"idle" | "success" | "error">("idle");
  const [verifyError, setVerifyError] = useState("");

  // Sync local selection when parent reloads settings (e.g. after verification).
  useEffect(() => {
    setSelectedProvider(settings.default_provider);
  }, [settings.default_provider]);

  // Sync custom provider fields when settings reload.
  useEffect(() => {
    setCustomName(settings.custom_provider_name ?? "");
    setCustomBaseUrl(settings.custom_provider_base_url ?? "");
    setCustomModel(settings.custom_provider_model ?? "");
  }, [settings.custom_provider_name, settings.custom_provider_base_url, settings.custom_provider_model]);

  const providerOptions = [
    ...PRESET_PROVIDERS.map((provider) => ({
      value: provider,
      label: getProviderDisplayName(provider),
    })),
    {
      value: CUSTOM_PROVIDER,
      label: customName || "自定义服务商",
    },
  ];

  const isCustomProvider = selectedProvider === CUSTOM_PROVIDER;

  const currentApiKey = isCustomProvider
    ? settings.custom_provider_api_key
    : ((settings[`${selectedProvider}_api_key` as keyof AISettings] as string | null) ?? null);

  const currentBaseUrl = isCustomProvider
    ? settings.custom_provider_base_url
    : getProviderBaseUrl(selectedProvider);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setApiKey("");
    setVerifyResult("idle");
    setVerifyError("");
    const model =
      provider === CUSTOM_PROVIDER
        ? (customModel || settings.custom_provider_model || "")
        : getDefaultModelId(provider);
    onProviderChange(provider, model);
  };

  const handleVerify = async () => {
    if (!apiKey.trim()) return;

    setVerifying(true);
    setVerifyResult("idle");
    setVerifyError("");

    try {
      const body =
        isCustomProvider
          ? {
              provider: CUSTOM_PROVIDER,
              apiKey: apiKey.trim(),
              baseUrl: customBaseUrl.trim(),
              name: customName.trim(),
              model: customModel.trim(),
            }
          : { provider: selectedProvider, apiKey: apiKey.trim() };

      const res = await fetch("/api/settings/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { valid?: boolean; error?: string };

      if (data.valid) {
        setVerifyResult("success");
        setApiKey("");
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
        body: JSON.stringify({ provider: selectedProvider }),
      });
      onVerified();
    } finally {
      setDeleting(false);
    }
  };

  const verifyDisabled =
    verifying ||
    !apiKey.trim() ||
    (isCustomProvider && (!customBaseUrl.trim() || !customName.trim() || !customModel.trim()));

  return (
    <div className="space-y-4">
      {/* Provider dropdown */}
      <div>
        <label className="block text-xs font-medium text-ink mb-1.5">
          默认模型供应商
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="input-base"
        >
          {providerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom provider extra fields */}
      {isCustomProvider && (
        <>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              服务商名称
            </label>
            <input
              type="text"
              placeholder="例如：My OpenAI Proxy"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Base URL
            </label>
            <input
              type="text"
              placeholder="https://api.example.com"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              模型名称
            </label>
            <input
              type="text"
              placeholder="gpt-4o-mini"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="input-base"
            />
          </div>
        </>
      )}

      {/* Read-only Base URL for preset providers */}
      {!isCustomProvider && currentBaseUrl && (
        <div>
          <label className="block text-xs font-medium text-ink mb-1.5">
            API 域名
          </label>
          <div className="input-base bg-ink/5 text-ink2 select-all">
            {currentBaseUrl}
          </div>
        </div>
      )}

      {/* API Key */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-ink">API Key</label>
          {currentApiKey && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-danger hover:text-danger/70 transition-colors disabled:opacity-50"
            >
              {deleting ? "删除中…" : "删除 Key"}
            </button>
          )}
        </div>

        {currentApiKey && !apiKey && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-line bg-ink/5 px-3 py-2">
            <code className="flex-1 truncate text-xs text-ink2">{currentApiKey}</code>
            <span className="shrink-0 text-xs text-success">已配置</span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="password"
            placeholder={currentApiKey ? "重新输入以更换 API Key" : "输入 API Key"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleVerify(); }}
            className="input-base flex-1 min-w-0"
          />
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={verifyDisabled}
            className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? "验证中…" : "验证"}
          </button>
        </div>

        {verifyResult === "success" && (
          <p className="mt-1.5 text-xs text-success">✓ API Key 验证成功</p>
        )}
        {verifyResult === "error" && (
          <p className="mt-1.5 text-xs text-danger">{verifyError}</p>
        )}
      </div>
    </div>
  );
}
