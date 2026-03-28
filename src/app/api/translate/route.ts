import { NextRequest, NextResponse } from "next/server";
import { startTranslation, getTranslationStatus } from "@/lib/translate";

/** POST /api/translate - 触发翻译任务 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookSlug, chapterNumbers } = body as {
      bookSlug: string;
      chapterNumbers?: number[];
    };

    if (!bookSlug) {
      return NextResponse.json(
        { error: "缺少 bookSlug 参数" },
        { status: 400 }
      );
    }

    // 检查是否已有翻译任务在运行
    const status = getTranslationStatus();
    if (status.status === "processing") {
      return NextResponse.json(
        { error: "已有翻译任务在运行中", taskId: status.bookSlug },
        { status: 409 }
      );
    }

    // 异步启动翻译（不等待完成）
    startTranslation(bookSlug, chapterNumbers);

    return NextResponse.json(
      {
        taskId: bookSlug,
        status: "processing",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("触发翻译失败:", error);
    return NextResponse.json(
      { error: "触发翻译失败" },
      { status: 500 }
    );
  }
}

/** GET /api/translate?bookSlug=xxx - 获取翻译进度 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookSlug = searchParams.get("bookSlug");

  const status = getTranslationStatus();

  // 如果请求特定书籍，只返回该书籍的状态
  if (bookSlug && status.bookSlug !== bookSlug) {
    return NextResponse.json({
      status: "idle",
      translated: 0,
      total: 0,
      percentage: 0,
    });
  }

  return NextResponse.json({
    status: status.status,
    translated: status.translated,
    total: status.total,
    percentage:
      status.total > 0
        ? Math.round((status.translated / status.total) * 100)
        : 0,
  });
}
