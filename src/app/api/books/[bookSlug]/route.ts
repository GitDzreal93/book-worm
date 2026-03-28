import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/books/[bookSlug]
 *
 * Returns full details for a single book, including its cover image
 * encoded as a base64 data URI.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string }> },
) {
  const { bookSlug } = await params;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
  });

  if (!book) {
    notFound();
  }

  const coverImageBase64 = book.coverImage
    ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString("base64")}`
    : null;

  return NextResponse.json({
    ...book,
    coverImage: coverImageBase64,
  });
}

/**
 * DELETE /api/books/[bookSlug]
 *
 * Deletes a book and all related records (chapters, paragraphs, characters,
 * vocabulary words, highlights, reading sessions, etc.) via Prisma cascade.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bookSlug: string }> },
) {
  const { bookSlug } = await params;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
  });

  if (!book) {
    notFound();
  }

  await prisma.book.delete({
    where: { slug: bookSlug },
  });

  return NextResponse.json({ deleted: true });
}
