import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Shape of the progress response body. */
interface ProgressResponse {
  chapterId: string | null;
  paragraphOrder: number | null;
  readPercentage: number;
}

/**
 * GET /api/books/[bookSlug]/progress
 *
 * Returns the current reading progress for the specified book.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string }> },
): Promise<NextResponse<ProgressResponse>> {
  const { bookSlug } = await params;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
    select: {
      currentChapterId: true,
      currentParagraphOrder: true,
      readPercentage: true,
    },
  });

  if (!book) {
    notFound();
  }

  return NextResponse.json<ProgressResponse>({
    chapterId: book.currentChapterId,
    paragraphOrder: book.currentParagraphOrder,
    readPercentage: book.readPercentage,
  });
}

/** Shape of the PUT request body. */
interface UpdateProgressBody {
  chapterId: string;
  paragraphOrder: number;
}

/**
 * PUT /api/books/[bookSlug]/progress
 *
 * Updates the reading progress for the specified book and recalculates
 * the overall read percentage.
 *
 * The percentage is computed as:
 *   (paragraphs before current position / total paragraphs) * 100
 *
 * This counts every paragraph in chapters that come before the current
 * chapter, plus the paragraphs already read in the current chapter,
 * divided by the total paragraph count of the book.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookSlug: string }> },
): Promise<NextResponse<ProgressResponse | { error: string }>> {
  const { bookSlug } = await params;

  const body: UpdateProgressBody = await request.json();
  const { chapterId, paragraphOrder } = body;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
    select: { id: true, totalParagraphs: true },
  });

  if (!book) {
    notFound();
  }

  // Count paragraphs in all chapters that come before the current chapter.
  const currentChapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { bookId: true, number: true },
  });

  if (!currentChapter || currentChapter.bookId !== book.id) {
    return NextResponse.json(
      { error: "Chapter not found for this book" },
      { status: 400 },
    );
  }

  const paragraphsInPriorChapters = await prisma.paragraph.count({
    where: {
      chapter: {
        bookId: book.id,
        number: { lt: currentChapter.number },
      },
    },
  });

  // Total paragraphs read = paragraphs in prior chapters + paragraphs read
  // in the current chapter (paragraphOrder is 1-based).
  const totalRead = paragraphsInPriorChapters + paragraphOrder;
  const readPercentage =
    book.totalParagraphs > 0
      ? Math.round((totalRead / book.totalParagraphs) * 100)
      : 0;

  const updated = await prisma.book.update({
    where: { slug: bookSlug },
    data: {
      currentChapterId: chapterId,
      currentParagraphOrder: paragraphOrder,
      readPercentage,
    },
    select: {
      currentChapterId: true,
      currentParagraphOrder: true,
      readPercentage: true,
    },
  });

  return NextResponse.json<ProgressResponse>({
    chapterId: updated.currentChapterId,
    paragraphOrder: updated.currentParagraphOrder,
    readPercentage: updated.readPercentage,
  });
}
