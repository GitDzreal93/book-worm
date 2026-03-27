"use client";

import { cn } from "@/lib/utils";
import type { CharacterData } from "@/lib/types";

interface Props {
  character: CharacterData;
  onClick: () => void;
}

const CHIP_CLASS_MAP: Record<string, string> = {
  "ct-orel": "chip-orel",
  "ct-jose": "chip-jose",
  "ct-female": "chip-female",
  "ct-outsider": "chip-outsider",
};

export function CharacterChip({ character, onClick }: Props) {
  const chipClass = CHIP_CLASS_MAP[character.colorClass] || "";

  return (
    <span
      className={cn(
        "inline-block py-[3px] px-[9px] rounded-full text-[11px] font-ui font-semibold cursor-pointer border border-transparent transition-all select-none hover:brightness-110",
        chipClass
      )}
      onClick={onClick}
    >
      {character.nick}
    </span>
  );
}
