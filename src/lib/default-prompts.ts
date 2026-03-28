import type { AIProvider, ModelInfo, ProviderPreset } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

// ---------------------------------------------------------------------------
// Default system prompts
// ---------------------------------------------------------------------------

/** Keys for the three prompt categories. */
export type PromptCategory = "translate" | "dictionary" | "summary";

/** Returns the default system prompt for a given prompt category. */
export function getDefaultPrompt(category: PromptCategory): string {
  return DEFAULT_SETTINGS[`prompt_${category}`];
}

/**
 * Resolves the effective system prompt for a category.
 *
 * If a user-customised prompt is stored in the database it is returned,
 * otherwise the built-in default is used.
 */
export async function getEffectivePrompt(
  category: PromptCategory,
  userValue: string | undefined,
): Promise<string> {
  return userValue ?? getDefaultPrompt(category);
}

// ---------------------------------------------------------------------------
// Provider presets
// ---------------------------------------------------------------------------

/** All preset provider configurations. */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com",
    apiKeySetting: "openai_api_key",
    defaultModel: "gpt-4o-mini",
    builtinModels: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: null, // Uses @ai-sdk/anthropic, not OpenAI-compatible
    apiKeySetting: "anthropic_api_key",
    defaultModel: "claude-haiku-4-5-20251001",
    builtinModels: [
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    ],
  },
  {
    id: "google",
    name: "Google",
    baseUrl: null, // Uses @ai-sdk/google
    apiKeySetting: "google_api_key",
    defaultModel: "gemini-2.0-flash",
    builtinModels: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKeySetting: "deepseek_api_key",
    defaultModel: "deepseek-chat",
    builtinModels: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "qwen",
    name: "Qwen (通义千问)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
    apiKeySetting: "qwen_api_key",
    defaultModel: "qwen-plus",
    builtinModels: [
      { id: "qwen-plus", name: "Qwen Plus" },
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-turbo", name: "Qwen Turbo" },
    ],
  },
  {
    id: "kimi",
    name: "Kimi (月之暗面)",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeySetting: "kimi_api_key",
    defaultModel: "moonshot-v1-128k",
    builtinModels: [
      { id: "moonshot-v1-8k", name: "Moonshot v1 8K" },
      { id: "moonshot-v1-32k", name: "Moonshot v1 32K" },
      { id: "moonshot-v1-128k", name: "Moonshot v1 128K" },
    ],
  },
  {
    id: "doubao",
    name: "Doubao (豆包)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeySetting: "doubao_api_key",
    defaultModel: "doubao-1-5-pro-32k",
    builtinModels: [
      { id: "doubao-1-5-lite-32k", name: "Doubao 1.5 Lite 32K" },
      { id: "doubao-1-5-pro-32k", name: "Doubao 1.5 Pro 32K" },
      { id: "doubao-1-5-pro-256k", name: "Doubao 1.5 Pro 256K" },
    ],
  },
];

/** Lookup map for quick preset access. */
const PRESET_MAP = new Map<string, ProviderPreset>(
  PROVIDER_PRESETS.map((p) => [p.id, p]),
);

/** Returns the preset config for a provider ID, or undefined for custom. */
export function getPreset(providerId: string): ProviderPreset | undefined {
  return PRESET_MAP.get(providerId);
}

/** Returns the built-in model list for a preset provider. */
export function getBuiltinModels(providerId: string): ModelInfo[] {
  return PRESET_MAP.get(providerId)?.builtinModels ?? [];
}

/** Returns the recommended default model ID for a provider. */
export function getDefaultModelId(providerId: string): string {
  return PRESET_MAP.get(providerId)?.defaultModel ?? "gpt-4o-mini";
}
