import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupWord } from "@/lib/dictionary";

/** GET /api/vocabulary?bookSlug=xxx&sort=xxx&search=xxx&page=1&limit=20 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookSlug = searchParams.get("bookSlug");
  const sort = searchParams.get("sort") || "recent";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where: Record<string, unknown> = {};
  if (bookSlug) {
    where.book = { slug: bookSlug };
  }
  if (search) {
    where.word = { contains: search, mode: "insensitive" };
  }

  const orderBy: Record<string, string> =
    sort === "alpha"
      ? { word: "asc" }
      : sort === "chapter"
        ? { chapterTitle: "asc" }
        : { createdAt: "desc" };

  const [words, total] = await Promise.all([
    prisma.vocabularyWord.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vocabularyWord.count({ where }),
  ]);

  return NextResponse.json({ words, total, page, limit });
}

/** POST /api/vocabulary — look up a word and save it to vocabulary */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { word, bookId, context, chapterTitle } = body as {
    word: string;
    bookId: string;
    context?: string;
    chapterTitle?: string;
  };

  if (!word || !bookId) {
    return NextResponse.json({ error: "word and bookId are required" }, { status: 400 });
  }

  // Check existing
  const existing = await prisma.vocabularyWord.findUnique({
    where: { bookId_word: { bookId, word: word.toLowerCase() } },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  // Look up definition
  const result = await lookupWord({
    word,
    bookId,
    context,
  });

  // Create vocabulary word with nextReviewDate set for immediate review
  const vocabWord = await prisma.vocabularyWord.create({
    data: {
      bookId,
      word: word.toLowerCase(),
      definition: result.definition,
      partOfSpeech: result.partOfSpeech,
      phonetic: result.phonetic,
      contextSentence: context || null,
      chapterTitle: chapterTitle || null,
      nextReviewDate: new Date(),
    },
  });

  return NextResponse.json(vocabWord, { status: 201 });
}
