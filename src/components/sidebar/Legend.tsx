"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import type { CharacterData } from "@/lib/types";

const COLOR_META: Record<string, { cssVar: string; label: string }> = {
  "ct-orel":     { cssVar: "var(--orel)",     label: "主角A（主线男性角色）" },
  "ct-jose":     { cssVar: "var(--jose)",     label: "主角B（主线男性角色）" },
  "ct-female":   { cssVar: "var(--female)",   label: "女性人物" },
  "ct-outsider": { cssVar: "var(--outsider)", label: "外来 / 配角" },
};

interface Props {
  characters?: CharacterData[];
}

export function Legend({ characters = [] }: Props) {
  const { activeTab } = useSidebar();

  if (activeTab !== "char") return null;

  // Only show color classes that actually appear in this book's characters
  const presentClasses = new Set(characters.map((c) => c.colorClass));
  const items = Object.entries(COLOR_META).filter(([cls]) => presentClasses.has(cls as CharacterData["colorClass"]));

  if (items.length === 0) return null;

  return (
    <div className="mt-5 pt-3.5 border-t border-line">
      <div className="text-[10px] font-ui tracking-[0.2em] text-ink2 mb-2 opacity-60">
        颜色说明
      </div>
      {items.map(([cls, { cssVar, label }]) => (
        <div key={cls} className="flex items-center gap-[7px] text-[11px] font-ui text-ink2 mb-[5px]">
          <div
            className="w-[10px] h-[10px] rounded-sm flex-shrink-0"
            style={{ background: cssVar }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}
