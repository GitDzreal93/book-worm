/**
 * Extract name candidates from novel text.
 *
 * Targets transliterated foreign names containing the CJK interpunct (·),
 * e.g. "奥雷里亚诺·布恩迪亚". Returns unique names sorted by
 * descending frequency, filtered by a minimum occurrence threshold.
 *
 * Note: Regex-based extraction of CJK names without word boundaries is
 * inherently imprecise. Some matches may include extra trailing characters.
 * The frequency filter (≥ 2) eliminates most noise, and the LLM prompt
 * treats these as reference hints rather than definitive name lists.
 */

export interface NameCandidate {
  name: string;
  count: number;
}

/**
 * Match CJK interpunct-name patterns.
 * Each segment is 2-6 CJK chars joined by ·.
 */
const NAME_RE = /[\u4e00-\u9fff]{2,6}(?:·[\u4e00-\u9fff]{2,6})+/g;
const MIN_FREQUENCY = 2;

/**
 * Extract transliterated name candidates (names containing ·) from text.
 *
 * @param text - Full novel text to scan
 * @param minFrequency - Minimum occurrence count to include (default 2)
 * @returns Unique names sorted by frequency descending
 */
export function extractNameCandidates(text: string, minFrequency = MIN_FREQUENCY): NameCandidate[] {
  const matches = text.matchAll(NAME_RE);
  const freq = new Map<string, number>();

  for (const m of matches) {
    const name = m[0]!;
    freq.set(name, (freq.get(name) ?? 0) + 1);
  }

  const results: NameCandidate[] = [];
  for (const [name, count] of freq) {
    if (count >= minFrequency) {
      results.push({ name, count });
    }
  }

  results.sort((a, b) => b.count - a.count);
  return results;
}
