"use client";

import { useCallback, useEffect, useState } from "react";
import type { AISettings } from "@/types/settings";
import { DEFAULT_SETTINGS, PRESET_PROVIDERS, CUSTOM_PROVIDER } from "@/types/settings";
import { getDefaultModelId } from "@/lib/default-prompts";
import { ProviderCard } from "./ProviderCard";
import { ModelSelector } from "./ModelSelector";
import { PromptEditor } from "./PromptEditor";

export function SettingsPageClient() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Custom provider form state
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customVerifying, setCustomVerifying] = useState(false);
  const [customVerifyResult, setCustomVerifyResult] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [customVerifyError, setCustomVerifyError] = useState("");
  const [customDeleting, setCustomDeleting] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = (await res.json()) as { settings: AISettings };
      const s = { ...DEFAULT_SETTINGS, ...data.settings };
      setSettings(s);
      // Populate custom form from loaded settings.
      setCustomBaseUrl(s.custom_provider_base_url ?? "");
      setCustomName(s.custom_provider_name ?? "");
      setCustomModel(s.custom_provider_model ?? "");
    } catch {
      // Keep defaults on error.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(
    async (patch: Partial<Record<string, string>>) => {
      setSaving(true);
      setMessage(null);
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "保存失败");
        }
        setSettings((prev) => ({ ...prev, ...patch }));
        setMessage({ type: "success", text: "保存成功" });
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "保存失败",
        });
      } finally {
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
      }
    },
    [],
  );

  const handleCustomVerify = async () => {
    if (!customBaseUrl.trim() || !customApiKey.trim()) return;

    setCustomVerifying(true);
    setCustomVerifyResult("idle");
    setCustomVerifyError("");

    try {
      const res = await fetch("/api/settings/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: CUSTOM_PROVIDER,
          apiKey: customApiKey.trim(),
          baseUrl: customBaseUrl.trim(),
          name: customName.trim(),
          model: customModel.trim(),
        }),
      });

      const data = (await res.json()) as {
        valid?: boolean;
        error?: string;
      };

      if (data.valid) {
        setCustomVerifyResult("success");
        setCustomApiKey("");
        await loadSettings();
      } else {
        setCustomVerifyResult("error");
        setCustomVerifyError(data.error ?? "验证失败");
      }
    } catch {
      setCustomVerifyResult("error");
      setCustomVerifyError("网络错误");
    } finally {
      setCustomVerifying(false);
    }
  };

  const handleCustomDelete = async () => {
    setCustomDeleting(true);
    try {
      await fetch("/api/settings/verify-key", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: CUSTOM_PROVIDER }),
      });
      setCustomBaseUrl("");
      setCustomName("");
      setCustomModel("");
      setCustomApiKey("");
      await loadSettings();
    } finally {
      setCustomDeleting(false);
    }
  };

  const isCustomSelected = settings.default_provider === CUSTOM_PROVIDER;
  const hasCustomKey = settings.custom_provider_api_key !== null;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Flash message */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-ui ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            {message.type === "success" ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          {message.text}
        </div>
      )}

      {/* Service Provider Selection */}
      <section>
        <h2 className="text-sm font-semibold text-ink font-ui mb-1">
          AI 服务商
        </h2>
        <p className="text-xs text-ink2/60 mb-4">选择服务商并配置 API Key</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PRESET_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider}
              provider={provider}
              selected={settings.default_provider === provider}
              maskedKey={
                (settings[`${provider}_api_key` as keyof AISettings] as string | null) ?? null
              }
              onSelect={() =>
                saveSettings({
                  default_provider: provider,
                  default_model: getDefaultModelId(provider),
                })
              }
              onVerified={() => void loadSettings()}
            />
          ))}

          {/* Custom Provider Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              saveSettings({
                default_provider: CUSTOM_PROVIDER,
                default_model: customModel || settings.custom_provider_model || "",
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                saveSettings({
                  default_provider: CUSTOM_PROVIDER,
                  default_model: customModel || settings.custom_provider_model || "",
                });
            }}
            className={`rounded-xl border-2 p-4 transition-colors cursor-pointer ${
              isCustomSelected
                ? "border-ink bg-ink/5"
                : "border-line hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {customName || "自定义服务商"}
                </span>
                {hasCustomKey && (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
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
              {isCustomSelected && (
                <span className="text-xs text-ink2">当前选择</span>
              )}
            </div>

            {/* Custom provider masked key */}
            {hasCustomKey && !customApiKey && (
              <div className="flex items-center justify-between mt-1">
                <code className="text-xs text-ink2 bg-ink/5 px-2 py-1 rounded">
                  {settings.custom_provider_api_key}
                </code>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCustomDelete();
                  }}
                  disabled={customDeleting}
                  className="text-xs text-danger hover:text-danger/80 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {customDeleting ? "删除中..." : "删除"}
                </button>
              </div>
            )}

            {/* Custom provider form */}
            <div
              className="mt-3 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                placeholder="服务商名称"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="input-base"
              />
              <input
                type="text"
                placeholder="Base URL (如 https://api.example.com)"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                className="input-base"
              />
              <input
                type="text"
                placeholder="模型名称"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="input-base"
              />
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="API Key"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="input-base min-w-0"
                />
                <button
                  type="button"
                  onClick={() => void handleCustomVerify()}
                  disabled={customVerifying || !customBaseUrl.trim() || !customApiKey.trim()}
                  className="text-xs px-3 py-1.5 rounded bg-ink text-bg font-medium disabled:opacity-50 transition-colors"
                >
                  {customVerifying ? "验证中..." : "验证"}
                </button>
              </div>
              {customVerifyResult === "success" && (
                <p className="text-xs text-success">API Key 验证成功</p>
              )}
              {customVerifyResult === "error" && (
                <p className="text-xs text-danger">{customVerifyError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Model Selection */}
      <section>
        <h2 className="text-sm font-semibold text-ink font-ui mb-1">模型</h2>
        <p className="text-xs text-ink2/60 mb-4">选择用于翻译和查词的模型</p>
        <ModelSelector
          provider={settings.default_provider}
          selectedModel={settings.default_model}
          onChange={(model) => saveSettings({ default_model: model })}
        />
      </section>

      {/* Prompt Configuration */}
      <section>
        <h2 className="text-sm font-semibold text-ink font-ui mb-1">
          提示词配置
        </h2>
        <p className="text-xs text-ink2/60 mb-4">自定义 AI 的翻译、查词和摘要提示词</p>
        <div className="space-y-4">
          <PromptEditor
            label="翻译提示词"
            value={settings.prompt_translate}
            defaultValue={DEFAULT_SETTINGS.prompt_translate}
            onChange={(v) => saveSettings({ prompt_translate: v })}
            onRestore={() =>
              saveSettings({ prompt_translate: DEFAULT_SETTINGS.prompt_translate })
            }
          />
          <PromptEditor
            label="查词提示词"
            value={settings.prompt_dictionary}
            defaultValue={DEFAULT_SETTINGS.prompt_dictionary}
            onChange={(v) => saveSettings({ prompt_dictionary: v })}
            onRestore={() =>
              saveSettings({ prompt_dictionary: DEFAULT_SETTINGS.prompt_dictionary })
            }
          />
          <PromptEditor
            label="摘要提示词"
            value={settings.prompt_summary}
            defaultValue={DEFAULT_SETTINGS.prompt_summary}
            onChange={(v) => saveSettings({ prompt_summary: v })}
            onRestore={() =>
              saveSettings({ prompt_summary: DEFAULT_SETTINGS.prompt_summary })
            }
          />
        </div>
      </section>
    </div>
  );
}
