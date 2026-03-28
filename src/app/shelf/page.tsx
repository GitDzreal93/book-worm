import { prisma } from "@/lib/prisma";
import { BookGrid } from "@/components/shelf/BookGrid";
import { ImportDialog } from "@/components/shelf/ImportDialog";

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
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="page-title">书架</h1>
            {books.length > 0 && (
              <p className="page-desc">
                共 {books.length} 本书 · {books.filter((b) => b.readPercentage === 100).length} 本已读完
              </p>
            )}
          </div>
          <ImportDialog />
        </div>

        {books.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="13" y2="11" />
            </svg>
            <p className="empty-state-title">书架空空如也</p>
            <p className="empty-state-desc">
              点击右上方按钮导入一本 epub 电子书，开始你的阅读旅程
            </p>
          </div>
        ) : (
          <BookGrid books={books} />
        )}
      </div>
    </main>
  );
}
