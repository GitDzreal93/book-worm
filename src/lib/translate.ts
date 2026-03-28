import { prisma } from "@/lib/prisma";
import { generateCompletion } from "./ai-client";
import { getSetting } from "./settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

/** Possible states for the translation queue. */
type TranslationStatus = "idle" | "processing" | "completed";

/** Snapshot of the current translation progress. */
interface TranslationQueueState {
  status: TranslationStatus;
  bookSlug: string | null;
  translated: number;
  total: number;
}

/** In-memory translation queue state. */
const queueState: TranslationQueueState = {
  status: "idle",
  bookSlug: null,
  translated: 0,
  total: 0,
};

/**
 * Returns a snapshot of the current translation queue status.
 */
export function getTranslationStatus(): TranslationQueueState {
  return { ...queueState };
}

/**
 * Runs promises with a bounded concurrency limit.
 * @param tasks - Async functions to execute.
 * @param concurrency - Maximum number of parallel tasks.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((value) => {
      results.push(value);
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Starts translating paragraphs of a book.
 *
 * If `chapterNumbers` is provided, only those chapters are translated.
 * Otherwise all chapters are processed.
 *
 * Paragraphs that already have a `ParagraphTranslation` record are skipped.
 * Translations run with an outer concurrency of 3 while preserving
 * paragraph order within each chapter.
 *
 * @param bookSlug - The unique slug of the book to translate.
 * @param chapterNumbers - Optional list of chapter numbers to translate.
 */
export async function startTranslation(
  bookSlug: string,
  chapterNumbers?: number[],
): Promise<void> {
  queueState.status = "processing";
  queueState.bookSlug = bookSlug;
  queueState.translated = 0;
  queueState.total = 0;

  try {
    const book = await prisma.book.findUniqueOrThrow({
      where: { slug: bookSlug },
    });

    const sourceLanguage = book.language ?? "English";

    const chapterFilter: Record<string, unknown> = chapterNumbers
      ? { bookId: book.id, number: { in: chapterNumbers } }
      : { bookId: book.id };

    const chapters = await prisma.chapter.findMany({
      where: chapterFilter,
      orderBy: { number: "asc" },
      select: { id: true },
    });

    // Load all paragraphs across the selected chapters, ordered by chapter
    // number then paragraph order, and skip those already translated.
    const allParagraphs = await prisma.paragraph.findMany({
      where: {
        chapterId: { in: chapters.map((c) => c.id) },
        translation: null,
      },
      orderBy: [{ chapter: { number: "asc" } }, { order: "asc" }],
      select: { id: true, content: true },
    });

    queueState.total = allParagraphs.length;

    const customPrompt = await getSetting("prompt_translate");
    const systemPrompt = customPrompt
      ? customPrompt.replace("{sourceLanguage}", sourceLanguage)
      : DEFAULT_SETTINGS.prompt_translate.replace(
          "{sourceLanguage}",
          sourceLanguage,
        );

    // Build a task per paragraph so we can run them with bounded concurrency.
    const tasks: Array<() => Promise<void>> = allParagraphs.map(
      (paragraph) => {
        return async () => {
          const userPrompt = paragraph.content;
          const translatedContent = await generateCompletion(
            userPrompt,
            systemPrompt,
          );

          await prisma.paragraphTranslation.upsert({
            where: { paragraphId: paragraph.id },
            update: { content: translatedContent },
            create: {
              paragraphId: paragraph.id,
              content: translatedContent,
            },
          });

          queueState.translated += 1;
        };
      },
    );

    await runWithConcurrency(tasks, 3);

    queueState.status = "completed";
  } catch (error: unknown) {
    queueState.status = "idle";
    queueState.bookSlug = null;
    throw error;
  }
}

/**
 * Returns translations for all paragraphs in a specific chapter.
 *
 * @param bookSlug - The unique slug of the book.
 * @param chapterNumber - The chapter number to fetch translations for.
 * @returns Paragraph translations ordered by paragraph order, or an empty
 *          array if the book or chapter is not found.
 */
export async function getChapterTranslations(
  bookSlug: string,
  chapterNumber: number,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      book: { slug: bookSlug },
      number: chapterNumber,
    },
    select: { id: true },
  });

  if (!chapter) {
    return [];
  }

  const translations = await prisma.paragraphTranslation.findMany({
    where: {
      paragraph: { chapterId: chapter.id },
    },
    orderBy: { paragraph: { order: "asc" } },
    select: {
      id: true,
      paragraphId: true,
      content: true,
      isEdited: true,
    },
  });

  return translations;
}
