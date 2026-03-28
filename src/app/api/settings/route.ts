import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSettings, maskApiKey } from "@/lib/settings";
import { API_KEY_KEYS, CUSTOM_PROVIDER, type AISettings } from "@/types/settings";

/** GET /api/settings — return all AI settings (API keys masked). */
export async function GET() {
  const settings = await getSettings();

  // Mask API keys before returning to the client.
  const masked: AISettings = { ...settings };
  for (const key of API_KEY_KEYS) {
    const raw = settings[key] as string | null;
    (masked as unknown as Record<string, unknown>)[key] = maskApiKey(raw);
  }
  // Also mask the custom provider API key.
  (masked as unknown as Record<string, unknown>)["custom_provider_api_key"] =
    maskApiKey(settings.custom_provider_api_key);

  return NextResponse.json({ settings: masked });
}

/** PUT /api/settings — batch-update non-key settings. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, string>;

  const updated = await setSettings(body);
  return NextResponse.json({ updated });
}
