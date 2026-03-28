import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/books/[bookSlug]/chapters/[chapterNumber] - 获取单章节完整内容（含段落+翻译+梗概） */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string; chapterNumber: string }> },
) {
  const { bookSlug, chapterNumber } = await params;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
    select: { id: true },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const chapter = await prisma.chapter.findUnique({
    where: {
      bookId_number: {
        bookId: book.id,
        number: parseInt(chapterNumber, 10),
      },
    },
    include: {
      paragraphs: {
        orderBy: { order: "asc" },
        include: {
          translation: {
            select: { id: true, paragraphId: true, content: true, isEdited: true },
          },
        },
      },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    summary: chapter.summary ?? null,
    paragraphs: chapter.paragraphs.map((p) => ({
      id: p.id,
      order: p.order,
      content: p.content,
      translation: p.translation
        ? {
            id: p.translation.id,
            paragraphId: p.translation.paragraphId,
            content: p.translation.content,
            isEdited: p.translation.isEdited,
          }
        : null,
    })),
  });
}
