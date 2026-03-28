import { prisma } from "@/lib/prisma";

async function getHighlights() {
  const highlights = await prisma.highlight.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      book: { select: { slug: true, title: true } },
      paragraph: {
        select: {
          chapter: { select: { number: true, title: true } },
        },
      },
    },
  });

  return highlights.map((h) => ({
    id: h.id,
    bookSlug: h.book.slug,
    bookTitle: h.book.title,
    chapterNumber: h.paragraph.chapter.number,
    chapterTitle: h.paragraph.chapter.title,
    color: h.color,
    note: h.note,
    createdAt: h.createdAt,
  }));
}

export default async function NotesPage() {
  const notes = await getHighlights();

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-ink font-ui mb-6">所有笔记</h1>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-20">
            <p className="text-lg text-ink2">还没有笔记</p>
            <p className="mt-2 text-sm text-ink2">
              在阅读时选中文字即可添加高亮和笔记
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-line px-4 py-3"
              >
                <div className="flex items-center gap-2 text-xs text-ink2 opacity-50 mb-1">
                  <span className="font-ui">{note.bookTitle}</span>
                  <span>·</span>
                  <span>{note.chapterTitle}</span>
                  <span>·</span>
                  <span>{new Date(note.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                {note.note && (
                  <p className="text-sm text-ink leading-relaxed">{note.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
