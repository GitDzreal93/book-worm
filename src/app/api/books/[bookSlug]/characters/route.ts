import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/books/[bookSlug]/characters - 返回人物列表及其名称变体 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string }> },
) {
  const { bookSlug } = await params;

  const book = await prisma.book.findUnique({ where: { slug: bookSlug } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const characters = await prisma.character.findMany({
    where: { bookId: book.id },
    orderBy: { sortOrder: "asc" },
    include: {
      aliases: {
        orderBy: [{ isPrimary: "desc" }, { alias: "asc" }],
      },
    },
  });

  return NextResponse.json(characters);
}
