import { generateText, type LanguageModel } from "ai";
import { getSetting } from "@/lib/settings";
import { getPreset, getDefaultModelId } from "@/lib/default-prompts";
import {
  type AIProvider,
  PRESET_PROVIDERS,
  CUSTOM_PROVIDER,
} from "@/types/settings";

/** Environment variable names for API keys per provider. */
const ENV_KEY_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  qwen: "QWEN_API_KEY",
  kimi: "KIMI_API_KEY",
  doubao: "DOUBAO_API_KEY",
};

/** Database setting keys for API keys per provider. */
const DB_KEY_MAP: Record<string, string> = {
  openai: "openai_api_key",
  anthropic: "anthropic_api_key",
  google: "google_api_key",
  deepseek: "deepseek_api_key",
  qwen: "qwen_api_key",
  kimi: "kimi_api_key",
  doubao: "doubao_api_key",
  custom: "custom_provider_api_key",
};

/** All supported provider identifiers. */
const ALL_PROVIDERS = [...PRESET_PROVIDERS, CUSTOM_PROVIDER] as const;

/**
 * Resolves the AI provider, model, API key, and optional base URL.
 *
 * Priority: database setting > environment variable.
 * Falls back to `"openai"` when nothing is configured.
 */
async function resolveConfig(): Promise<{
  provider: string;
  modelId: string;
  apiKey: string;
  baseUrl: string | null;
}> {
  // Try database settings first.
  const dbProvider = await getSetting("default_provider");
  const dbModel = await getSetting("default_model");

  let provider: string;
  if (dbProvider && ALL_PROVIDERS.includes(dbProvider as (typeof ALL_PROVIDERS)[number])) {
    provider = dbProvider;
  } else {
    // Fall back to env var, then default.
    const envProvider = process.env.AI_PROVIDER;
    if (ALL_PROVIDERS.includes(envProvider as (typeof ALL_PROVIDERS)[number])) {
      provider = envProvider!;
    } else {
      provider = "openai";
    }
  }

  // Resolve API key: DB > env.
  const dbApiKey = await getSetting(DB_KEY_MAP[provider]);
  const apiKey =
    dbApiKey ?? process.env[ENV_KEY_MAP[provider]] ?? "";

  if (!apiKey) {
    const preset = getPreset(provider);
    const displayName = preset?.name ?? provider;
    throw new Error(
      `未配置 ${displayName} 的 API Key。请在设置页面中配置。`
    );
  }

  const modelId = dbModel ?? getDefaultModelId(provider);

  // Resolve base URL for OpenAI-compatible providers.
  let baseUrl: string | null = null;
  if (provider === CUSTOM_PROVIDER) {
    baseUrl = await getSetting("custom_provider_base_url");
  } else {
    const preset = getPreset(provider);
    baseUrl = preset?.baseUrl ?? null;
  }

  return { provider, modelId, apiKey, baseUrl };
}

/**
 * Creates a language model for OpenAI-compatible providers.
 * Handles preset OpenAI-compatible providers (DeepSeek, Qwen, Kimi, Doubao)
 * and custom providers with a user-defined base URL.
 */
async function createOpenAICompatibleModel(
  modelId: string,
  apiKey: string,
  baseUrl: string | null,
): Promise<LanguageModel> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const openai = createOpenAI({ apiKey, baseURL: baseUrl ?? undefined });
  return openai(modelId);
}

/**
 * Creates a language model for the Anthropic provider with an explicit API key.
 */
async function createAnthropicModel(
  modelId: string,
  apiKey: string,
): Promise<LanguageModel> {
  let createAnthropic: (opts: { apiKey: string }) => (modelId: string) => LanguageModel;
  try {
    // @ts-expect-error -- package optionally installed at runtime
    const mod = await import(/* webpackIgnore: true */ "@ai-sdk/anthropic");
    createAnthropic = mod.createAnthropic;
  } catch {
    throw new Error(
      "The @ai-sdk/anthropic package is not installed. " +
        "Run `npm install @ai-sdk/anthropic` to use the Anthropic provider."
    );
  }
  const anthropic = createAnthropic({ apiKey });
  return anthropic(modelId);
}

/**
 * Creates a language model for the Google provider with an explicit API key.
 */
async function createGoogleModel(
  modelId: string,
  apiKey: string,
): Promise<LanguageModel> {
  let createGoogleGenerativeAI: (opts: { apiKey: string }) => (modelId: string) => LanguageModel;
  try {
    // @ts-expect-error -- package optionally installed at runtime
    const mod = await import(/* webpackIgnore: true */ "@ai-sdk/google");
    createGoogleGenerativeAI = mod.createGoogleGenerativeAI;
  } catch {
    throw new Error(
      "The @ai-sdk/google package is not installed. " +
        "Run `npm install @ai-sdk/google` to use the Google provider."
    );
  }
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}

/**
 * Returns a language model instance based on the configured settings.
 *
 * Resolution order: database settings > environment variables > system defaults.
 *
 * @returns A promise resolving to a Vercel AI SDK language model.
 * @throws {Error} When the required API key for the resolved provider is missing.
 */
export async function getAIModel(): Promise<LanguageModel> {
  const { provider, modelId, apiKey, baseUrl } = await resolveConfig();

  // Proprietary SDKs for Anthropic and Google.
  if (provider === "anthropic") {
    return createAnthropicModel(modelId, apiKey);
  }
  if (provider === "google") {
    return createGoogleModel(modelId, apiKey);
  }

  // All other providers (OpenAI, DeepSeek, Qwen, Kimi, Doubao, Custom)
  // use the OpenAI-compatible SDK with appropriate base URLs.
  return createOpenAICompatibleModel(modelId, apiKey, baseUrl);
}

/**
 * Generates a text completion from the configured AI model.
 *
 * @param prompt - The user prompt to send to the model.
 * @param systemPrompt - An optional system prompt for model instructions.
 * @returns The generated text content as a string.
 * @throws {Error} When the provider API key is missing or the API call fails.
 */
export async function generateCompletion(
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const model = await getAIModel();

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
  });

  return result.text;
}
