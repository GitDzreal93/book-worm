import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/** PUT /api/paragraphs/[paragraphId]/translation - 手动编辑翻译 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paragraphId: string }> }
) {
  const { paragraphId } = await params;

  const paragraph = await prisma.paragraph.findUnique({
    where: { id: paragraphId },
    select: { id: true },
  });

  if (!paragraph) notFound();

  const body = await request.json();
  const { content } = body as { content: string };

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "content 字段不能为空" },
      { status: 400 }
    );
  }

  const translation = await prisma.paragraphTranslation.upsert({
    where: { paragraphId },
    create: {
      paragraphId,
      content,
      isEdited: true,
    },
    update: {
      content,
      isEdited: true,
    },
  });

  return NextResponse.json({
    id: translation.id,
    content: translation.content,
    isEdited: translation.isEdited,
  });
}
