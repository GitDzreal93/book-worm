import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/** GET /api/books/[bookSlug]/chapters/[chapterNumber]/translation - 获取章节翻译数据 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string; chapterNumber: string }> }
) {
  const { bookSlug, chapterNumber } = await params;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
    select: { id: true },
  });

  if (!book) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: {
      bookId_number: { bookId: book.id, number: parseInt(chapterNumber, 10) },
    },
    include: {
      paragraphs: {
        orderBy: { order: "asc" },
        include: {
          translation: true,
        },
      },
    },
  });

  if (!chapter) notFound();

  const paragraphs = chapter.paragraphs.map((p) => ({
    paragraphId: p.id,
    translation: p.translation?.content ?? null,
  }));

  return NextResponse.json({ paragraphs });
}
