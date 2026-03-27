"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { CharacterTooltip } from "@/components/reader/CharacterTooltip";
import { TextSwapButton } from "@/components/reader/TextSwapButton";
import { Sidebar } from "@/components/sidebar/Sidebar";
import type { CharacterData, ChapterData, FamilyRelationData } from "@/lib/types";
import { useState } from "react";

interface Props {
  bookTitle: string;
  chapters: ChapterData[];
  characters: CharacterData[];
  relations: FamilyRelationData[];
}

export function ReaderLayoutClient({ bookTitle, chapters, characters, relations }: Props) {
  const { isOpen, toggleOpen } = useSidebar();
  const [tooltipChar, setTooltipChar] = useState<CharacterData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Reader panel */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-[660px] mx-auto px-10 py-14 pb-40 max-md:px-6 max-md:py-10">
          <ReaderContent
            chapters={chapters}
            onCharHover={(char, rect) => {
              setTooltipChar(char);
              setTooltipPos({ x: rect.x, y: rect.y });
            }}
            onCharUnhover={() => {
              setTooltipChar(null);
              setTooltipPos(null);
            }}
          />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        chapters={chapters}
        characters={characters}
        relations={relations}
      />

      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[250] md:hidden"
          onClick={toggleOpen}
        />
      )}

      {/* Toggle button */}
      <button
        className="fixed top-3.5 right-2.5 z-[300] w-[26px] h-[26px] bg-tip-bg border border-tip-bd rounded-md cursor-pointer text-[13px] flex items-center justify-center text-ink2 hover:text-ink hover:bg-side-bg transition-all font-ui select-none"
        onClick={toggleOpen}
        title="收起/展开侧边栏"
      >
        {isOpen ? "›" : "‹"}
      </button>

      {/* Text swap button */}
      <TextSwapButton />

      {/* Tooltip */}
      <CharacterTooltip character={tooltipChar} position={tooltipPos} />
    </div>
  );
}
