"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import type { CharacterData } from "@/lib/types";

interface Props {
  character: CharacterData;
}

export function CharacterCard({ character }: Props) {
  const { setPinnedCharacter } = useSidebar();

  return (
    <div className="mb-2">
      <span
        className="float-right text-[17px] text-ink2 cursor-pointer leading-none mt-0.5 ml-2 hover:text-ink"
        onClick={() => setPinnedCharacter(null)}
      >
        ×
      </span>
      <div className="text-[22px] font-bold text-ink">{character.nick}</div>
      <div className="text-xs text-ink2 mb-2">原名：{character.orig}</div>
      <div className="inline-block text-[11px] bg-line text-ink2 px-[9px] py-[2px] rounded-full mb-3 font-ui">
        {character.gen}
      </div>
      <div className="text-[13px] font-serif leading-[1.8] text-ink border-t border-line pt-[11px]">
        {character.desc}
      </div>
    </div>
  );
}
