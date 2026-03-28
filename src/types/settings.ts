/** All supported preset provider identifiers. */
export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "qwen"
  | "kimi"
  | "doubao";

/** A single model option displayed in the model selector. */
export interface ModelInfo {
  /** Machine-readable model identifier (e.g. "gpt-4o-mini"). */
  id: string;
  /** Human-readable display name (e.g. "GPT-4o Mini"). */
  name: string;
}

/** Configuration for a preset provider. */
export interface ProviderPreset {
  /** Provider identifier used in settings storage. */
  id: AIProvider;
  /** Display name shown in the UI. */
  name: string;
  /** API base URL for OpenAI-compatible providers; null for Anthropic/Google. */
  baseUrl: string | null;
  /** Database settings key for the API key. */
  apiKeySetting: string;
  /** Built-in default model ID. */
  defaultModel: string;
  /** Built-in fallback model list. */
  builtinModels: ModelInfo[];
}

/** All recognised settings keys stored in the database. */
export type SettingKey =
  | "default_provider"
  | "default_model"
  | "openai_api_key"
  | "anthropic_api_key"
  | "google_api_key"
  | "deepseek_api_key"
  | "qwen_api_key"
  | "kimi_api_key"
  | "doubao_api_key"
  | "custom_provider_name"
  | "custom_provider_base_url"
  | "custom_provider_api_key"
  | "custom_provider_model"
  | "prompt_translate"
  | "prompt_dictionary"
  | "prompt_summary";

/** The preset provider identifiers (all except "custom"). */
export const PRESET_PROVIDERS: AIProvider[] = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "qwen",
  "kimi",
  "doubao",
];

/** All preset API key setting keys. */
export const API_KEY_KEYS: readonly SettingKey[] = [
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "deepseek_api_key",
  "qwen_api_key",
  "kimi_api_key",
  "doubao_api_key",
] as const;

/** Special provider ID for user-defined custom providers. */
export const CUSTOM_PROVIDER = "custom";

/** Full shape of the AI settings object consumed by the frontend. */
export interface AISettings {
  default_provider: string;
  default_model: string;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  google_api_key: string | null;
  deepseek_api_key: string | null;
  qwen_api_key: string | null;
  kimi_api_key: string | null;
  doubao_api_key: string | null;
  custom_provider_name: string | null;
  custom_provider_base_url: string | null;
  custom_provider_api_key: string | null;
  custom_provider_model: string | null;
  prompt_translate: string;
  prompt_dictionary: string;
  prompt_summary: string;
}

/** System defaults for every setting key. */
export const DEFAULT_SETTINGS: AISettings = {
  default_provider: "openai",
  default_model: "gpt-4o-mini",
  openai_api_key: null,
  anthropic_api_key: null,
  google_api_key: null,
  deepseek_api_key: null,
  qwen_api_key: null,
  kimi_api_key: null,
  doubao_api_key: null,
  custom_provider_name: null,
  custom_provider_base_url: null,
  custom_provider_api_key: null,
  custom_provider_model: null,
  prompt_translate:
    '你是一位资深的文学翻译家，精通{sourceLanguage}与中文的双语转换。\n\n## 翻译原则\n- 忠忠实原文：准确传达原文含义，不遗漏、不添加、不曲解。\n- 保持文风：保留原文的叙事节奏、语气和文体特征（如幽默、严肃、诗意）。\n- 信达雅统一：在准确的基础上追求中文表达的流畅与优美。\n\n## 人名处理规则\n- 人名一律保留原文拼写，不翻译为中文。\n- 若人名有常用中译名（如"Alexander"→"亚历山大"），在首次出现时可括注中文名，后续统一使用原文。\n- 地名人名同理，保留原文。\n\n## 输出格式\n- 仅输出翻译后的中文文本，每个段落对应原文的一个段落。\n- 不要添加任何解释、注释、译者注或额外说明。\n- 不要输出标记（如 markdown 加粗/斜体）或换行以外的格式符号。',
  prompt_dictionary:
    "You are a professional bilingual dictionary assistant. Given a word and its context in a literary work, provide a precise, context-aware definition.\n\nOutput ONLY a JSON object with exactly these fields:\n{\n  \"definition\": \"<concise Chinese definition, 2-4 words, matching the literary context>\",\n  \"partOfSpeech\": \"<part of speech: noun|verb|adjective|adverb|preposition|conjunction|interjection|determiner|pronoun>\",\n  \"phonetic\": \"<IPA phonetic transcription, or null if unavailable>\",\n  \"example\": \"<a short example sentence using the word in this context, in Chinese, or null>\"\n}\n\nRules:\n- Definition must be in Chinese, concise, and tailored to how the word is used in the specific literary context.\n- Do NOT simply give the dictionary definition — consider the narrative context.\n- If the word is a proper noun (person/place), note it in the definition.\n- Respond with ONLY the JSON object, no other text.",
  prompt_summary:
    '你是一位专业的文学评论家。请阅读以下小说章节内容，生成一份中文梗概。\n\n## 要求\n- 长度：2-4 句话，精炼概括核心内容。\n- 内容覆盖：必须包含该章节的关键情节发展、重要转折点和角色互动。\n- 视角：以第三人称叙述，语气客观但具有洞察力。\n- 语言：使用流畅的中文表达，避免翻译腔。\n\n## 输出格式\n- 直接输出梗概文本，不要添加"梗概："、"摘要："等前缀。\n- 不要分行，以连续段落形式输出。',
};
