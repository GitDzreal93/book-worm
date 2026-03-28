import { prisma } from "@/lib/prisma";
import { BookGrid } from "@/components/shelf/BookGrid";
import { ImportDialog } from "@/components/shelf/ImportDialog";

/** 获取所有书籍数据并按创建时间倒序排列 */
async function getBooks() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      author: true,
      language: true,
      description: true,
      coverImage: true,
      totalChapters: true,
      totalParagraphs: true,
      currentChapterId: true,
      currentParagraphOrder: true,
      readPercentage: true,
      createdAt: true,
    },
  });

  return books.map((book) => ({
    ...book,
    coverImage: book.coverImage
      ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString("base64")}`
      : null,
  }));
}

export default async function ShelfPage() {
  const books = await getBooks();

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink font-ui">书架</h1>
          <ImportDialog />
        </div>

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-20">
            <p className="text-lg text-ink2">书架空空如也</p>
            <p className="mt-2 text-sm text-ink2">
              点击上方按钮导入一本 epub 电子书开始阅读
            </p>
          </div>
        ) : (
          <BookGrid books={books} />
        )}
      </div>
    </main>
  );
}
