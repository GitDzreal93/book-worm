import { prisma } from "@/lib/prisma";
import { generateCompletion } from "./ai-client";
import { getSetting } from "./settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

/** The result of a dictionary lookup. */
interface DictionaryResult {
  /** The definition of the word. */
  definition: string;
  /** The part of speech (e.g. "noun", "verb"), or null if unavailable. */
  partOfSpeech: string | null;
  /** Phonetic transcription (e.g. "/wɜːrd/"), or null if unavailable. */
  phonetic: string | null;
}

/** Parameters for {@link lookupWord}. */
interface LookupParams {
  /** The word to look up. */
  word: string;
  /** The ID of the book the word was found in (used as cache scope). */
  bookId: string;
  /** The surrounding sentence for disambiguation by the LLM layer. */
  context?: string;
}

/**
 * Looks up a word using a three-tier strategy:
 *
 * 1. **DB cache** -- checks the `VocabularyWord` table for a previously
 *    cached definition scoped to `bookId + word`.
 * 2. **Wiktionary API** -- queries the English Wiktionary MediaWiki API and
 *    extracts a basic definition from the wikitext. On success the result is
 *    persisted to the DB for future lookups.
 * 3. **LLM fallback** -- asks the configured AI model for a context-aware
 *    definition when Wiktionary has no useful result. The response is also
 *    cached.
 *
 * Each layer is wrapped in its own try/catch so that a failure in one tier
 * falls through to the next without crashing the caller.
 *
 * @param params - Lookup parameters including the word, book ID, and optional
 *                 context sentence for LLM disambiguation.
 * @returns The best available definition result.
 * @throws {Error} When all three layers fail to produce a result.
 */
export async function lookupWord(params: LookupParams): Promise<DictionaryResult> {
  const { word, bookId, context } = params;

  // --- Layer 1: DB cache ---------------------------------------------------
  try {
    const cached = await prisma.vocabularyWord.findUnique({
      where: { bookId_word: { bookId, word } },
    });

    if (cached) {
      return {
        definition: cached.definition,
        partOfSpeech: cached.partOfSpeech,
        phonetic: cached.phonetic,
      };
    }
  } catch {
    // DB unavailable -- continue to next layer.
  }

  // --- Layer 2: Wiktionary API ---------------------------------------------
  try {
    const wiktionaryResult = await fetchFromWiktionary(word);

    if (wiktionaryResult) {
      await cacheResult(bookId, word, wiktionaryResult, context);
      return wiktionaryResult;
    }
  } catch {
    // Wiktionary unavailable -- continue to LLM.
  }

  // --- Layer 3: LLM fallback -----------------------------------------------
  const llmResult = await fetchFromLLM(word, context);
  await cacheResult(bookId, word, llmResult, context);
  return llmResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Queries the English Wiktionary MediaWiki API for a word definition.
 *
 * @param word - The word to look up.
 * @returns A parsed result, or `null` if no useful definition was found.
 */
async function fetchFromWiktionary(
  word: string,
): Promise<DictionaryResult | null> {
  const url =
    `https://en.wiktionary.org/w/api.php` +
    `?action=parse&page=${encodeURIComponent(word)}` +
    `&prop=wikitext&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as {
    parse?: { wikitext?: { "*": string } };
  };

  const wikitext = data?.parse?.wikitext?.["*"];
  if (!wikitext) {
    return null;
  }

  return parseWiktionaryWikitext(wikitext);
}

/**
 * Parses raw Wiktionary wikitext to extract a basic definition.
 *
 * The parser looks for the first `#` list item under a level-3 heading
 * that resembles a part-of-speech header (noun, verb, adjective, etc.).
 * It is intentionally simple and may not handle every edge case.
 *
 * @param wikitext - The raw wikitext returned by the Wiktionary API.
 * @returns A parsed result, or `null` if nothing useful was found.
 */
function parseWiktionaryWikitext(
  wikitext: string,
): DictionaryResult | null {
  const lines = wikitext.split("\n");

  /** Known English part-of-speech heading fragments. */
  const POS_HEADINGS = [
    "Noun", "Verb", "Adjective", "Adverb", "Pronoun",
    "Preposition", "Conjunction", "Interjection", "Determiner",
    "Particle", "Numeral", "Article",
  ];

  let currentPos: string | null = null;
  let definition: string | null = null;

  for (const line of lines) {
    // Detect part-of-speech headings: === Noun ===, === Verb ===, etc.
    const headingMatch = line.match(/^===\s+(.+?)\s+===$/);
    if (headingMatch) {
      const headingText = headingMatch[1];
      const matchedPos = POS_HEADINGS.find(
        (pos) => headingText.toLowerCase().startsWith(pos.toLowerCase()),
      );
      if (matchedPos) {
        currentPos = matchedPos.toLowerCase();
      } else {
        // We hit a non-POS heading (e.g. Etymology, Translations); stop.
        if (definition) break;
      }
      continue;
    }

    // Extract the first numbered definition line (# ...).
    if (definition === null && line.startsWith("#") && currentPos) {
      definition = line
        .replace(/^#+\s*/, "")     // remove leading # and whitespace
        .replace(/\{\{[^}]*\}\}/g, "") // remove simple {{templates}}
        .trim();

      if (definition.length === 0) {
        definition = null;
        continue;
      }

      break;
    }
  }

  if (!definition) {
    return null;
  }

  return {
    definition,
    partOfSpeech: currentPos,
    phonetic: null,
  };
}

/**
 * Asks the configured LLM for a context-aware word definition.
 *
 * @param word - The word to define.
 * @param context - Optional surrounding sentence for disambiguation.
 * @returns The parsed LLM response as a {@link DictionaryResult}.
 * @throws {Error} When the LLM response cannot be parsed.
 */
async function fetchFromLLM(
  word: string,
  context?: string,
): Promise<DictionaryResult> {
  const contextClause = context
    ? ` as used in context: "${context}"`
    : "";

  const customPrompt = await getSetting("prompt_dictionary");
  const systemPrompt = customPrompt ?? DEFAULT_SETTINGS.prompt_dictionary;

  const prompt =
    `Define the word "${word}"${contextClause}. ` +
    "Return JSON with fields: " +
    "definition (string), partOfSpeech (string|null), phonetic (string|null). " +
    "Only output the JSON, no other text.";

  const raw = await generateCompletion(prompt, systemPrompt);

  const text = raw.trim();
  // Strip optional markdown code fences if present.
  const jsonStr = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```\s*$/i, "");

  const parsed = JSON.parse(jsonStr) as {
    definition?: string;
    partOfSpeech?: string | null;
    phonetic?: string | null;
  };

  if (typeof parsed.definition !== "string" || parsed.definition.length === 0) {
    throw new Error(`LLM returned no usable definition for "${word}"`);
  }

  return {
    definition: parsed.definition,
    partOfSpeech: typeof parsed.partOfSpeech === "string" ? parsed.partOfSpeech : null,
    phonetic: typeof parsed.phonetic === "string" ? parsed.phonetic : null,
  };
}

/**
 * Persists a dictionary result to the `VocabularyWord` table.
 *
 * The record is created without setting `nextReviewDate` -- that field is
 * reserved for when the user explicitly adds the word to their review list.
 *
 * @param bookId - The book the word belongs to.
 * @param word - The word that was looked up.
 * @param result - The definition result to cache.
 * @param context - Optional context sentence to store alongside the entry.
 */
async function cacheResult(
  bookId: string,
  word: string,
  result: DictionaryResult,
  context?: string,
): Promise<void> {
  try {
    await prisma.vocabularyWord.upsert({
      where: { bookId_word: { bookId, word } },
      update: {
        definition: result.definition,
        partOfSpeech: result.partOfSpeech,
        phonetic: result.phonetic,
        contextSentence: context ?? null,
      },
      create: {
        bookId,
        word,
        definition: result.definition,
        partOfSpeech: result.partOfSpeech,
        phonetic: result.phonetic,
        contextSentence: context ?? null,
      },
    });
  } catch {
    // Best-effort caching -- do not surface DB write errors to the caller.
  }
}
