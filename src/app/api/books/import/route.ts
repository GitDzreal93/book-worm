import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEpub, generateSlug } from "@/lib/epub-parser";

/** POST /api/books/import - 上传并导入 epub 文件 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "请上传一个文件" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".epub")) {
      return NextResponse.json(
        { error: "不支持的文件格式，请上传 epub 文件" },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "文件过大，epub 文件不能超过 50MB" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const epubData = parseEpub(buffer);

    // 生成唯一 slug
    let slug = generateSlug(epubData.title);
    const existing = await prisma.book.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // 将 base64 封面图片转换为 Buffer
    const coverImageBuffer = epubData.coverImage
      ? Buffer.from(epubData.coverImage.split(",")[1] || "", "base64")
      : null;

    // 计算总段落数
    let totalParagraphs = 0;
    for (const chapter of epubData.chapters) {
      totalParagraphs += chapter.paragraphs.length;
    }

    // 创建书籍和章节
    const book = await prisma.book.create({
      data: {
        slug,
        title: epubData.title,
        author: epubData.author,
        language: epubData.language,
        coverImage: coverImageBuffer,
        totalChapters: epubData.chapters.length,
        totalParagraphs,
        readPercentage: 0,
        chapters: {
          create: epubData.chapters.map((chapter, index) => ({
            number: index + 1,
            title: chapter.title,
            paragraphs: {
              create: chapter.paragraphs.map((content, order) => ({
                order,
                content,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json(
      {
        id: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        totalChapters: book.totalChapters,
        totalParagraphs: book.totalParagraphs,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("导入 epub 失败:", error);
    return NextResponse.json(
      { error: "文件解析失败，请确认是有效的 epub 文件" },
      { status: 400 }
    );
  }
}
