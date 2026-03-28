import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SETTINGS,
  API_KEY_KEYS,
  type AISettings,
  type SettingKey,
} from "@/types/settings";

/**
 * Reads a single setting value from the database.
 *
 * @param key - The setting key.
 * @returns The stored value, or `null` if not found.
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.aiSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/**
 * Reads all settings from the database and merges them with defaults.
 *
 * API Key fields are returned as-is (raw values) — callers that expose
 * settings to the frontend should apply {@link maskApiKey} themselves.
 *
 * @returns A complete {@link AISettings} object.
 */
export async function getSettings(): Promise<AISettings> {
  const rows = await prisma.aiSetting.findMany();
  const overrides = new Map<string, string>(
    rows.map((r) => [r.key, r.value]),
  );

  const result: AISettings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    if (overrides.has(key)) {
      const raw = overrides.get(key)!;
      // API key fields: keep raw value here; masking is the API layer's job.
      (result as unknown as Record<string, unknown>)[key] =
        raw !== "" ? raw : null;
    }
  }

  return result;
}

/**
 * Upserts a single setting key-value pair.
 *
 * @param key - The setting key.
 * @param value - The value to store.
 */
export async function setSetting(
  key: string,
  value: string,
): Promise<void> {
  await prisma.aiSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Upserts multiple settings in a single transaction.
 *
 * API Key fields (`*_api_key`) are silently skipped — use the dedicated
 * `/api/settings/verify-key` endpoint to save API keys.
 *
 * @param partial - A partial settings object with string values.
 * @returns The list of keys that were actually updated.
 */
export async function setSettings(
  partial: Partial<Record<string, string>>,
): Promise<string[]> {
  const entries = Object.entries(partial).filter(
    ([key, value]) => !isApiKeyField(key) && key in DEFAULT_SETTINGS && value !== undefined,
  ) as Array<[string, string]>;

  if (entries.length === 0) return [];

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.aiSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  return entries.map(([key]) => key);
}

/**
 * Deletes a setting from the database.
 *
 * @param key - The setting key to remove.
 * @returns `true` if a row was deleted, `false` otherwise.
 */
export async function deleteSetting(key: string): Promise<boolean> {
  try {
    await prisma.aiSetting.delete({ where: { key } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Masks an API key for safe display: first 4 + `****` + last 4 characters.
 *
 * Keys shorter than 8 characters are masked more aggressively.
 *
 * @param value - The raw API key string.
 * @returns The masked representation, or `null` if the input is falsy.
 */
export function maskApiKey(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isApiKeyField(key: string): boolean {
  return (API_KEY_KEYS as readonly string[]).includes(key);
}
