import { BookCard } from "./BookCard";

interface BookGridProps {
  books: Array<{
    slug: string;
    title: string;
    author: string | null;
    coverImage: string | null;
    totalChapters: number;
    readPercentage: number;
    description: string | null;
  }>;
}

/** 响应式网格布局排列 BookCard */
export function BookGrid({ books }: BookGridProps) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <BookCard
          key={book.slug}
          slug={book.slug}
          title={book.title}
          author={book.author}
          coverImage={book.coverImage}
          totalChapters={book.totalChapters}
          readPercentage={book.readPercentage}
          description={book.description}
        />
      ))}
    </div>
  );
}
