/**
 * SM-2 (SuperMemo 2) spaced repetition algorithm.
 *
 * Used to schedule vocabulary review sessions based on recall quality.
 */

/** SRS-related fields needed from a vocabulary word. */
interface SrsWord {
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  nextReviewDate: string | null;
}

/** Fields produced by {@link processReview}. */
interface SrsResult {
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  nextReviewDate: Date;
}

/**
 * Process a review for a word and return the updated SRS fields.
 *
 * @param word  - The current SRS state of the word.
 * @param quality - User self-assessed recall quality (0 = no recall, 5 = perfect).
 * @returns Updated SRS fields including the next review date.
 */
export function processReview(word: SrsWord, quality: number): SrsResult {
  let { easeFactor, interval, repetitionCount } = word;

  if (quality >= 3) {
    // Correct response — advance the schedule
    if (repetitionCount === 0) {
      interval = 1;
    } else if (repetitionCount === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitionCount += 1;
    easeFactor =
      Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Incorrect response — restart repetitions
    repetitionCount = 0;
    interval = 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { easeFactor, interval, repetitionCount, nextReviewDate };
}

/**
 * Check whether a word is due for review.
 *
 * @param word - The word to check.
 * @returns `true` if `nextReviewDate` is unset (never reviewed) or in the past.
 */
export function isDue(word: SrsWord): boolean {
  if (word.nextReviewDate === null) return true;
  return new Date(word.nextReviewDate) <= new Date();
}

/**
 * Sort words by review priority.
 *
 * Due words appear first (sorted by `nextReviewDate` ascending, with `null`
 * treated as highest priority), followed by future-due words.
 *
 * @param words - Array of words to sort (sorted in place).
 * @returns The same array, now sorted.
 */
export function sortByPriority<T extends SrsWord>(words: T[]): T[] {
  return words.sort((a, b) => {
    const aDue = isDue(a);
    const bDue = isDue(b);

    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    const aDate = a.nextReviewDate === null ? 0 : new Date(a.nextReviewDate).getTime();
    const bDate = b.nextReviewDate === null ? 0 : new Date(b.nextReviewDate).getTime();
    return aDate - bDate;
  });
}
