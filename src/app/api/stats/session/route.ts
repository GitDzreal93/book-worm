import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/stats/session — create a new reading session */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookId } = body as { bookId: string };

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  const session = await prisma.readingSession.create({
    data: { bookId },
  });

  return NextResponse.json({ id: session.id }, { status: 201 });
}

/** PUT /api/stats/session — end a reading session */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const session = await prisma.readingSession.update({
    where: { id },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({ id: session.id });
}
