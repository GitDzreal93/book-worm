import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEpub, generateSlug } from "@/lib/epub-parser";
import { getSetting } from "@/lib/settings";

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

    // Fire-and-forget LLM generation if a provider is configured
    let generationStarted = false;
    try {
      const provider = await getSetting("default_provider");
      const apiKeyField =
        provider === "custom" ? "custom_provider_api_key" : `${provider}_api_key`;
      const apiKey = provider ? await getSetting(apiKeyField) : null;

      if (provider && apiKey) {
        const baseUrl =
          typeof process !== "undefined"
            ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}`
            : "http://localhost:3000";

        fetch(`${baseUrl}/api/books/${book.slug}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "all" }),
        }).catch(() => {});
        generationStarted = true;
      }
    } catch {
      // Non-fatal: generation trigger failure should not fail the import
    }

    return NextResponse.json(
      {
        id: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        totalChapters: book.totalChapters,
        totalParagraphs: book.totalParagraphs,
        generationStarted,
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
