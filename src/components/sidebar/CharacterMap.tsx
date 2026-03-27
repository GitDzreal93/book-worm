"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { CharacterChip } from "./CharacterChip";
import type { CharacterData } from "@/lib/types";

interface Props {
  characters: CharacterData[];
}

const GEN_ORDER: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7,
};

function genSortKey(gen: string): number {
  const firstChar = gen.charAt(0);
  return GEN_ORDER[firstChar] ?? 99;
}

function genLabel(gen: string): string {
  // Extract generation number prefix: "一代·霍系" -> "一代"
  const dotIdx = gen.indexOf("·");
  return dotIdx > 0 ? gen.substring(0, dotIdx) : gen;
}

export function CharacterMap({ characters }: Props) {
  const { activeTab, setPinnedCharacter, isOpen, setOpen } = useSidebar();

  if (activeTab !== "char") return null;

  // Group by generation label
  const groups = new Map<string, CharacterData[]>();
  for (const c of characters) {
    const label = genLabel(c.gen);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(c);
  }

  // Sort groups by generation number
  const sortedGroups = Array.from(groups.entries()).sort(
    ([a], [b]) => genSortKey(a) - genSortKey(b)
  );

  const handleChipClick = (char: CharacterData) => {
    setPinnedCharacter(char);
    if (!isOpen) setOpen(true);
  };

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <div className="text-[10px] font-ui tracking-[0.2em] text-ink2 mb-3 opacity-60">
        全部人物速查
      </div>
      {sortedGroups.map(([label, chars]) => (
        <div key={label} className="mb-4">
          <div className="text-[10px] font-ui text-ink2 opacity-50 tracking-[0.15em] mb-1.5">
            {label}
          </div>
          <div className="flex flex-wrap gap-[5px]">
            {chars.map((c) => (
              <CharacterChip key={c.id} character={c} onClick={() => handleChipClick(c)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
