"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { CharacterCard } from "./CharacterCard";
import { CharacterMap } from "./CharacterMap";
import { Legend } from "./Legend";
import type { CharacterData } from "@/lib/types";

interface Props {
  characters: CharacterData[];
}

export function CharacterPanel({ characters }: Props) {
  const { activeTab, pinnedCharacter } = useSidebar();

  if (activeTab !== "char") return null;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 px-4">
      {!pinnedCharacter && (
        <div className="text-[13px] font-ui text-ink2 opacity-45 text-center mt-10 leading-[1.9]">
          点击正文中的<br />任意人名
        </div>
      )}

      {pinnedCharacter && <CharacterCard character={pinnedCharacter} />}

      <CharacterMap characters={characters} />
      <Legend />
    </div>
  );
}
