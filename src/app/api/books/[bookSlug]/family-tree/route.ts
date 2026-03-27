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

  const relations = await prisma.familyRelation.findMany({
    where: { bookId: book.id },
    include: {
      person: true,
      relative: true,
    },
  });

  const data = relations.map((r) => ({
    id: r.id,
    personNick: r.person.nick,
    personColorClass: r.person.colorClass,
    relativeNick: r.relative.nick,
    relativeColorClass: r.relative.colorClass,
    type: r.type,
    note: r.note,
  }));

  return NextResponse.json({ relations: data });
}
