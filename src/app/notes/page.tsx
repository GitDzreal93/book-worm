import { prisma } from "@/lib/prisma";

function relativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

async function getHighlights() {
  const highlights = await prisma.highlight.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      book: { select: { slug: true, title: true } },
      paragraph: {
        select: {
          content: true,
          chapter: { select: { number: true, title: true } },
        },
      },
    },
  });

  return highlights.map((h) => {
    const content = h.paragraph.content ?? "";
    const text = content.slice(
      Math.max(0, h.startOffset - 20),
      Math.min(content.length, h.endOffset + 20),
    );
    const isStartEllipsis = h.startOffset > 20;
    const isEndEllipsis = h.endOffset + 20 < content.length;

    return {
      id: h.id,
      bookSlug: h.book.slug,
      bookTitle: h.book.title,
      chapterNumber: h.paragraph.chapter.number,
      chapterTitle: h.paragraph.chapter.title,
      color: h.color,
      note: h.note,
      context: `${isStartEllipsis ? "..." : ""}${text}${isEndEllipsis ? "..." : ""}`,
      createdAt: h.createdAt,
    };
  });
}

const COLOR_MAP: Record<string, string> = {
  yellow: "bg-yellow-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  pink: "bg-pink-400",
  orange: "bg-orange-400",
  purple: "bg-purple-400",
  red: "bg-red-400",
};

export default async function NotesPage() {
  const notes = await getHighlights();

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="page-header">
          <h1 className="page-title">所有笔记</h1>
          {notes.length > 0 && (
            <p className="page-desc">
              共 {notes.length} 条笔记与高亮
            </p>
          )}
        </div>

        {notes.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <p className="empty-state-title">还没有笔记</p>
            <p className="empty-state-desc">
              在阅读时选中文字即可添加高亮和笔记
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="card flex gap-3 p-4"
              >
                {/* Color bar */}
                <div className={`w-1 shrink-0 rounded-full ${COLOR_MAP[note.color] ?? "bg-yellow-400"}`} />

                <div className="min-w-0 flex-1">
                  {/* Meta */}
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink2/60 font-ui">
                    <span className="font-medium text-ink2/80">{note.bookTitle}</span>
                    <span>·</span>
                    <span>{note.chapterTitle}</span>
                    <span>·</span>
                    <span>{relativeTime(note.createdAt)}</span>
                  </div>

                  {/* Context text */}
                  {note.context && (
                    <p className="text-sm leading-relaxed text-ink/70 line-clamp-3">
                      {note.context}
                    </p>
                  )}

                  {/* Note */}
                  {note.note && (
                    <div className="mt-2 rounded-md bg-ink/[0.03] px-3 py-2 text-sm leading-relaxed text-ink">
                      {note.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
