import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCompletion } from "@/lib/ai-client";
import { getSetting } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

/** GET /api/summaries?bookSlug=xxx — return all chapter summaries for a book */
export async function GET(request: NextRequest) {
  const bookSlug = request.nextUrl.searchParams.get("bookSlug");
  if (!bookSlug) {
    return NextResponse.json({ error: "bookSlug is required" }, { status: 400 });
  }

  const chapters = await prisma.chapter.findMany({
    where: { book: { slug: bookSlug } },
    orderBy: { number: "asc" },
    select: { id: true, number: true, title: true, summary: true },
  });

  return NextResponse.json({ chapters });
}

/** POST /api/summaries — generate AI summary for a chapter */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookSlug, chapterNumber } = body as {
    bookSlug: string;
    chapterNumber?: number;
  };

  if (!bookSlug) {
    return NextResponse.json({ error: "bookSlug is required" }, { status: 400 });
  }

  const chapterWhere = chapterNumber
    ? { book: { slug: bookSlug }, number: chapterNumber }
    : { book: { slug: bookSlug } };

  const chapters = await prisma.chapter.findMany({
    where: chapterWhere,
    orderBy: { number: "asc" },
    include: {
      paragraphs: { orderBy: { order: "asc" }, select: { content: true } },
    },
  });

  if (chapters.length === 0) {
    return NextResponse.json({ error: "No chapters found" }, { status: 404 });
  }

  const book = await prisma.book.findUniqueOrThrow({
    where: { slug: bookSlug },
    select: { title: true },
  });

  const results = [];

  for (const chapter of chapters) {
    const fullText = chapter.paragraphs.map((p) => p.content).join("\n\n");

    const customPrompt = await getSetting("prompt_summary");
    const systemPrompt = customPrompt ?? DEFAULT_SETTINGS.prompt_summary;

    const userPrompt =
      `书籍：${book.title}\n` +
      `章节：${chapter.title}\n\n` +
      `章节内容：\n${fullText.slice(0, 4000)}`;

    const summary = await generateCompletion(userPrompt, systemPrompt);

    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { summary },
    });

    results.push({
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      summary,
    });
  }

  return NextResponse.json({ summaries: results });
}
