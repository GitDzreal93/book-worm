"use client";

import { useCallback, useEffect, useState } from "react";
import type { AISettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { ProviderSelector } from "./ProviderSelector";
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

  
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = (await res.json()) as { settings: AISettings };
      const s = { ...DEFAULT_SETTINGS, ...data.settings };
      setSettings(s);
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

  const handleProviderChange = useCallback((provider: string, model: string) => {
    void saveSettings({ default_provider: provider, default_model: model });
  }, [saveSettings]);


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
        <ProviderSelector
          settings={settings}
          onProviderChange={handleProviderChange}
          onVerified={() => void loadSettings()}
        />
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
