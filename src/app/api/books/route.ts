import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/books
 *
 * Returns all books for the bookshelf, ordered by creation date (newest first).
 * Each book includes a computed `readPercentage` based on the current chapter
 * relative to the total chapter count, and its cover image encoded as a
 * base64 data URI.
 */
export async function GET() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
  });

  /** Maps each book's `currentChapterId` to its chapter number (1-indexed). */
  const chapterNumbers = new Map<string, number>();

  const bookIdsWithCurrentChapter = books
    .map((book) => book.currentChapterId)
    .filter((id): id is string => id !== null);

  if (bookIdsWithCurrentChapter.length > 0) {
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: bookIdsWithCurrentChapter } },
      select: { id: true, number: true },
    });

    for (const chapter of chapters) {
      chapterNumbers.set(chapter.id, chapter.number);
    }
  }

  const serializedBooks = books.map((book) => {
    let readPercentage = 0;

    if (book.currentChapterId !== null && book.totalChapters > 0) {
      const currentChapterNumber = chapterNumbers.get(book.currentChapterId);
      if (currentChapterNumber !== undefined) {
        readPercentage = (currentChapterNumber / book.totalChapters) * 100;
      }
    }

    const coverImage = book.coverImage
      ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString("base64")}`
      : null;

    return {
      id: book.id,
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      language: book.language,
      description: book.description,
      coverImage,
      totalChapters: book.totalChapters,
      readPercentage,
      createdAt: book.createdAt,
    };
  });

  return NextResponse.json({ books: serializedBooks });
}
