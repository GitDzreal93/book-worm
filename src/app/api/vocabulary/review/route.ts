import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processReview } from "@/lib/srs";

/** GET /api/vocabulary/review?bookSlug=xxx — get words due for review */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookSlug = searchParams.get("bookSlug");

  const now = new Date();

  const where: Record<string, unknown> = {
    nextReviewDate: { lte: now },
  };
  if (bookSlug) {
    where.book = { slug: bookSlug };
  }

  const dueWords = await prisma.vocabularyWord.findMany({
    where,
    orderBy: { nextReviewDate: "asc" },
    take: 50,
  });

  return NextResponse.json({ words: dueWords, total: dueWords.length });
}

/** POST /api/vocabulary/review — submit a review for a word */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wordId, quality } = body as { wordId: string; quality: number };

  if (!wordId || quality === undefined) {
    return NextResponse.json(
      { error: "wordId and quality are required" },
      { status: 400 },
    );
  }

  if (quality < 0 || quality > 5) {
    return NextResponse.json(
      { error: "quality must be between 0 and 5" },
      { status: 400 },
    );
  }

  const word = await prisma.vocabularyWord.findUnique({ where: { id: wordId } });
  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  const updated = processReview(
    {
      easeFactor: word.easeFactor,
      interval: word.interval,
      repetitionCount: word.repetitionCount,
      nextReviewDate: word.nextReviewDate?.toISOString() ?? null,
    },
    quality,
  );

  await Promise.all([
    prisma.vocabularyWord.update({
      where: { id: wordId },
      data: {
        easeFactor: updated.easeFactor,
        interval: updated.interval,
        repetitionCount: updated.repetitionCount,
        nextReviewDate: updated.nextReviewDate,
      },
    }),
    prisma.reviewLog.create({
      data: {
        wordId,
        quality,
      },
    }),
  ]);

  return NextResponse.json({
    easeFactor: updated.easeFactor,
    interval: updated.interval,
    repetitionCount: updated.repetitionCount,
    nextReviewDate: updated.nextReviewDate.toISOString(),
  });
}
