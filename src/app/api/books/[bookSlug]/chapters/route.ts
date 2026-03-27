import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string }> },
) {
  const { bookSlug } = await params;

  const book = await prisma.book.findUnique({ where: { slug: bookSlug } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const chapters = await prisma.chapter.findMany({
    where: { bookId: book.id },
    orderBy: { number: "asc" },
    include: {
      paragraphs: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(chapters);
}
