"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface BookCardProps {
  slug: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  readPercentage: number;
  totalChapters: number;
  description: string | null;
}

/** 书架上的书籍卡片，显示封面缩略图、标题、作者和阅读进度 */
export function BookCard({
  slug,
  title,
  author,
  coverImage,
  readPercentage,
  totalChapters,
  description,
}: BookCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close detail on click outside
  useEffect(() => {
    if (!showDetail) return;

    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowDetail(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDetail]);

  return (
    <div ref={cardRef} className="relative">
      <Link
        href={`/read/${slug}`}
        className="group flex flex-col overflow-hidden rounded-lg border border-line bg-tip-bg transition-shadow hover:shadow-lg"
      >
        {/* 封面缩略图 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-line">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4">
              <span className="text-center text-sm text-ink2 leading-relaxed">
                {title}
              </span>
            </div>
          )}

          {/* 阅读进度条 */}
          {readPercentage > 0 && (
            <div className="absolute right-0 bottom-0 left-0">
              <div className="h-1 bg-line">
                <div
                  className="h-full bg-orel transition-all"
                  style={{ width: `${Math.min(readPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 书籍信息 */}
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink leading-tight font-ui">
            {title}
          </h3>
          {author && (
            <p className="mt-1 truncate text-xs text-ink2">{author}</p>
          )}
          {totalChapters > 0 && (
            <p className="mt-auto pt-2 text-xs text-ink2">
              {Math.round(readPercentage)}% 已读 · {totalChapters} 章
            </p>
          )}
        </div>
      </Link>

      {/* Info button */}
      {description && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDetail(!showDetail);
          }}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-bg/80 border border-line flex items-center justify-center text-[10px] text-ink2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-ink"
          title="查看简介"
        >
          i
        </button>
      )}

      {/* Detail panel */}
      {showDetail && description && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-line bg-bg p-3 shadow-lg text-xs text-ink2 leading-relaxed max-h-40 overflow-y-auto">
          {description}
        </div>
      )}
    </div>
  );
}
