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

const COVER_GRADIENTS = [
  "from-amber-800/20 via-orange-700/10 to-yellow-700/5",
  "from-emerald-800/20 via-teal-700/10 to-cyan-700/5",
  "from-indigo-800/20 via-violet-700/10 to-purple-700/5",
  "from-rose-800/20 via-pink-700/10 to-fuchsia-700/5",
  "from-slate-800/20 via-zinc-700/10 to-neutral-700/5",
  "from-cyan-800/20 via-sky-700/10 to-blue-700/5",
];

function getGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

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

  const isCompleted = readPercentage >= 100;

  return (
    <div ref={cardRef} className="relative group">
      <Link
        href={`/read/${slug}`}
        className="flex flex-col overflow-hidden rounded-lg border border-line bg-tip-bg transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-ink2/20"
      >
        {/* Cover */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-line">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${getGradient(title)} p-4`}>
              <span className="text-center font-serif text-lg font-bold leading-tight text-ink/60">
                {title.charAt(0)}
              </span>
              <span className="mt-2 text-center text-xs leading-relaxed text-ink/40 line-clamp-3">
                {title}
              </span>
            </div>
          )}

          {/* Progress overlay */}
          {readPercentage > 0 && readPercentage < 100 && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white/90 transition-all"
                  style={{ width: `${Math.min(readPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <div className="absolute top-2 left-2 rounded-md bg-success/90 px-1.5 py-0.5 text-[10px] font-ui font-medium text-white">
              已读
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col p-3 pt-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink font-ui">
            {title}
          </h3>
          {author && (
            <p className="mt-0.5 truncate text-xs text-ink2/70">{author}</p>
          )}
          {totalChapters > 0 && (
            <p className="mt-auto pt-1.5 text-[11px] text-ink2/50 font-ui">
              {Math.round(readPercentage)}% · {totalChapters} 章
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
          className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-ink2 opacity-0 backdrop-blur-sm transition-opacity hover:text-ink group-hover:opacity-100 cursor-pointer"
          title="查看简介"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      )}

      {/* Detail panel */}
      {showDetail && description && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-40 overflow-y-auto rounded-lg border border-line bg-bg p-3 shadow-xl text-xs leading-relaxed text-ink2">
          {description}
        </div>
      )}
    </div>
  );
}
