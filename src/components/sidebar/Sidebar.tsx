"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { DragHandle } from "./DragHandle";
import { SidebarTabs } from "./SidebarTabs";
import { TableOfContents } from "./TableOfContents";
import { CharacterPanel } from "./CharacterPanel";
import { FamilyTree } from "./FamilyTree";
import { TranslationPanel } from "@/components/reader/TranslationPanel";
import { NotesPanel } from "./NotesPanel";
import { cn } from "@/lib/utils";
import type { CharacterData, FamilyRelationData } from "@/lib/types";

interface ChapterMeta {
  id: string;
  number: number;
  title: string;
  summary?: string | null;
}

interface Props {
  chapters: ChapterMeta[];
  characters: CharacterData[];
  relations: FamilyRelationData[];
  currentChapterIdx: number;
  onChapterSelect: (idx: number) => void;
}

/** 侧边栏内容区域，根据当前活动标签显示不同面板 */
function SidebarContent({ chapters, characters, relations, currentChapterIdx, onChapterSelect }: { chapters: ChapterMeta[]; characters: CharacterData[]; relations: FamilyRelationData[]; currentChapterIdx: number; onChapterSelect: (idx: number) => void }) {
  const { activeTab, bookSlug } = useSidebar();

  switch (activeTab) {
    case "char":
      return <CharacterPanel characters={characters} />;
    case "tree":
      return <FamilyTree characters={characters} relations={relations} />;
    case "translate":
      return <TranslationPanel bookSlug={bookSlug} />;
    case "notes":
      return <NotesPanel bookSlug={bookSlug} />;
    default:
      return <TableOfContents chapters={chapters} currentChapterIdx={currentChapterIdx} onChapterSelect={onChapterSelect} />;
  }
}

export function Sidebar({ chapters, characters, relations, currentChapterIdx, onChapterSelect }: Props) {
  const { isOpen, width } = useSidebar();

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-shrink-0 border-l border-line overflow-hidden transition-[width] duration-220 relative bg-bg",
          !isOpen && "!w-0 !border-l-transparent"
        )}
        style={{ width: isOpen ? width : 0 }}
      >
        <DragHandle />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <SidebarTabs />
          <SidebarContent chapters={chapters} characters={characters} relations={relations} currentChapterIdx={currentChapterIdx} onChapterSelect={onChapterSelect} />
        </div>
      </div>

      {/* Mobile sidebar (overlay) */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[260] w-[85vw] max-w-[320px] bg-bg border-l border-line flex flex-col md:hidden transition-transform duration-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <SidebarTabs />
          <SidebarContent chapters={chapters} characters={characters} relations={relations} currentChapterIdx={currentChapterIdx} onChapterSelect={onChapterSelect} />
        </div>
      </div>
    </>
  );
}
