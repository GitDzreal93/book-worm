import { NextRequest, NextResponse } from "next/server";
import { setSetting, deleteSetting } from "@/lib/settings";
import { getPreset } from "@/lib/default-prompts";
import { CUSTOM_PROVIDER } from "@/types/settings";

/** Database setting keys for API keys per provider. */
const KEY_SETTING_MAP: Record<string, string> = {
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
const ALL_PROVIDERS = new Set<string>(Object.keys(KEY_SETTING_MAP));

/**
 * Builds the verification request for a provider's /models endpoint.
 */
function buildVerifyRequest(
  provider: string,
  apiKey: string,
  baseUrl?: string,
): { url: string; headers: Record<string, string> } {
  // Custom provider: use user-provided base URL
  if (provider === CUSTOM_PROVIDER && baseUrl) {
    const normalized = baseUrl.replace(/\/+$/, "");
    return {
      url: `${normalized}/v1/models`,
      headers: { Authorization: `Bearer ${apiKey}` },
    };
  }

  // Preset providers with proprietary APIs
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/models",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
  }
  if (provider === "google") {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      headers: {},
    };
  }

  // OpenAI-compatible preset providers
  const preset = getPreset(provider);
  const endpoint = preset?.baseUrl;
  if (!endpoint) {
    return {
      url: "https://api.openai.com/v1/models",
      headers: { Authorization: `Bearer ${apiKey}` },
    };
  }

  // DeepSeek, Qwen, Kimi, Doubao — use OpenAI-compatible /models endpoint
  const normalized = endpoint.replace(/\/+$/, "");
  return {
    url: `${normalized}/v1/models`,
    headers: { Authorization: `Bearer ${apiKey}` },
  };
}

/**
 * POST /api/settings/verify-key
 *
 * Validates an API key by calling the provider's /models endpoint.
 * On success the key is saved to the database.
 *
 * For custom providers, accepts an optional `baseUrl` in the request body
 * and also saves the custom provider configuration.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    name?: string;
    model?: string;
  };

  const { provider, apiKey, baseUrl, name, model } = body;

  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: "缺少 provider 或 apiKey 参数" },
      { status: 400 },
    );
  }

  if (!ALL_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: `不支持的服务商: ${provider}` },
      { status: 400 },
    );
  }

  const config = buildVerifyRequest(provider, apiKey, baseUrl);

  try {
    const res = await fetch(config.url, {
      method: "GET",
      headers: config.headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({
        valid: false,
        provider,
        error: "API Key 无效",
      });
    }

    // Save the verified key.
    await setSetting(KEY_SETTING_MAP[provider], apiKey);

    // For custom provider, also save the configuration fields.
    if (provider === CUSTOM_PROVIDER) {
      if (baseUrl) await setSetting("custom_provider_base_url", baseUrl);
      if (name) await setSetting("custom_provider_name", name);
      if (model) await setSetting("custom_provider_model", model);
    }

    return NextResponse.json({ valid: true, provider });
  } catch (err: unknown) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "验证超时，请检查网络连接"
        : "服务商 API 不可达";
    return NextResponse.json({ valid: false, provider, error: msg }, { status: 502 });
  }
}

/**
 * DELETE /api/settings/verify-key
 *
 * Removes a saved API key for the given provider.
 * For custom providers, also clears the related configuration.
 */
export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as { provider?: string };
  const { provider } = body;

  if (!provider || !ALL_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: "缺少或无效的 provider 参数" },
      { status: 400 },
    );
  }

  await deleteSetting(KEY_SETTING_MAP[provider]);

  // For custom provider, also clear configuration fields.
  if (provider === CUSTOM_PROVIDER) {
    await deleteSetting("custom_provider_base_url");
    await deleteSetting("custom_provider_name");
    await deleteSetting("custom_provider_model");
  }

  return NextResponse.json({ deleted: true, provider });
}
