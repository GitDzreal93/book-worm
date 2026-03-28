import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { getPreset, getBuiltinModels } from "@/lib/default-prompts";
import { CUSTOM_PROVIDER } from "@/types/settings";
import type { ModelInfo } from "@/types/settings";

/** Database setting keys for API keys per provider. */
const KEY_MAP: Record<string, string> = {
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
const ALL_PROVIDERS = new Set<string>(Object.keys(KEY_MAP));

/**
 * Fetches models from a provider's API when an API key is available.
 *
 * Falls back to the builtin list on any error.
 */
async function fetchModelsFromApi(
  provider: string,
  apiKey: string,
): Promise<ModelInfo[] | null> {
  try {
    let url: string;
    let headers: Record<string, string>;

    // Custom provider
    if (provider === CUSTOM_PROVIDER) {
      const baseUrl = await getSetting("custom_provider_base_url");
      if (!baseUrl) return null;
      const normalized = baseUrl.replace(/\/+$/, "");
      url = `${normalized}/v1/models`;
      headers = { Authorization: `Bearer ${apiKey}` };
    }
    // Google has a proprietary API format
    else if (provider === "google") {
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      headers = {};
    }
    // Anthropic has a proprietary auth format
    else if (provider === "anthropic") {
      url = "https://api.anthropic.com/v1/models";
      headers = {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
    }
    // All other providers use OpenAI-compatible format
    else {
      const preset = getPreset(provider);
      const endpoint = preset?.baseUrl ?? "https://api.openai.com";
      const normalized = endpoint.replace(/\/+$/, "");
      url = `${normalized}/v1/models`;
      headers = { Authorization: `Bearer ${apiKey}` };
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;

    // Google has a different response format
    if (provider === "google") {
      const models = (data.models as Array<{ name: string; displayName?: string }>) ?? [];
      return models.map((m) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName ?? m.name.replace("models/", ""),
      }));
    }

    // OpenAI-compatible format (OpenAI, DeepSeek, Qwen, Kimi, Doubao, Custom)
    const models = (data.data as Array<{ id: string }>) ?? [];
    return models.map((m) => ({
      id: m.id,
      name: m.id,
    }));
  } catch {
    return null;
  }
}

/** GET /api/settings/models?provider=xxx */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");

  if (!provider || !ALL_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: "缺少或无效的 provider 参数" },
      { status: 400 },
    );
  }

  let builtin: ModelInfo[];

  if (provider === CUSTOM_PROVIDER) {
    // Custom provider: return user-configured model
    const customModel = await getSetting("custom_provider_model");
    builtin = customModel ? [{ id: customModel, name: customModel }] : [];
  } else {
    builtin = getBuiltinModels(provider);
  }

  // Try API-based fetch if the provider has a saved API key.
  const apiKey = await getSetting(KEY_MAP[provider]);
  if (apiKey) {
    const apiModels = await fetchModelsFromApi(provider, apiKey);
    if (apiModels && apiModels.length > 0) {
      // Merge: always include builtin models in the list.
      const allIds = new Set<string>([
        ...builtin.map((m) => m.id),
        ...apiModels.map((m) => m.id),
      ]);
      const merged = [...allIds]
        .map((id) => {
          const fromApi = apiModels.find((m) => m.id === id);
          const fromBuiltin = builtin.find((m) => m.id === id);
          return fromApi ?? fromBuiltin!;
        })
        .filter(Boolean) as ModelInfo[];

      return NextResponse.json({ provider, models: merged, source: "api" });
    }
  }

  return NextResponse.json({ provider, models: builtin, source: "builtin" });
}
