import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/highlights?bookSlug=xxx&chapterNumber=xxx */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookSlug = searchParams.get("bookSlug");
  const chapterNumber = searchParams.get("chapterNumber");

  const where: Record<string, unknown> = {};
  if (bookSlug) {
    where.book = { slug: bookSlug };
  }
  if (chapterNumber) {
    where.paragraph = { chapter: { number: parseInt(chapterNumber, 10) } };
  }

  const highlights = await prisma.highlight.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      paragraph: {
        select: {
          chapter: { select: { number: true, title: true } },
        },
      },
    },
  });

  const data = highlights.map((h) => ({
    id: h.id,
    paragraphId: h.paragraphId,
    bookId: h.bookId,
    startOffset: h.startOffset,
    endOffset: h.endOffset,
    color: h.color,
    note: h.note,
    chapterNumber: h.paragraph.chapter.number,
    chapterTitle: h.paragraph.chapter.title,
    createdAt: h.createdAt,
  }));

  return NextResponse.json({ highlights: data });
}

/** POST /api/highlights — create a new highlight */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { paragraphId, bookId, startOffset, endOffset, color, note, text } = body as {
    paragraphId: string;
    bookId: string;
    startOffset: number;
    endOffset: number;
    color?: string;
    note?: string;
    text?: string;
  };

  if (!paragraphId || !bookId || startOffset === undefined || endOffset === undefined) {
    return NextResponse.json({ error: "paragraphId, bookId, startOffset, endOffset are required" }, { status: 400 });
  }

  const highlight = await prisma.highlight.create({
    data: {
      paragraphId,
      bookId,
      startOffset,
      endOffset,
      color: color || "yellow",
      note: note || null,
    },
  });

  return NextResponse.json(highlight, { status: 201 });
}

/** PUT /api/highlights — update a highlight */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, color, note } = body as {
    id: string;
    color?: string;
    note?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (color !== undefined) updateData.color = color;
  if (note !== undefined) updateData.note = note;

  const highlight = await prisma.highlight.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(highlight);
}

/** DELETE /api/highlights?id=xxx */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.highlight.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
