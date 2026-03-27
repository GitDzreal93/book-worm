"use client";

import type { CharacterData } from "@/lib/types";

interface Props {
  character: CharacterData | null;
  position: { x: number; y: number } | null;
}

export function CharacterTooltip({ character, position }: Props) {
  if (!character || !position) return null;

  let x = position.x + 18;
  let y = position.y + 14;
  if (x + 258 > window.innerWidth) x = position.x - 266;
  if (y + 230 > window.innerHeight) y = position.y - 238;

  return (
    <div
      className="fixed z-[999] w-[248px] bg-tip-bg border border-tip-bd rounded-[10px] p-3 px-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.12)] font-ui pointer-events-none"
      style={{ left: x, top: y }}
    >
      <div className="text-[15px] font-bold text-ink">{character.nick}</div>
      <div className="text-[11px] text-ink2 mt-0.5">原名：{character.orig}</div>
      <div className="inline-block text-[10px] bg-line text-ink2 px-[7px] py-[1px] rounded-full my-1">
        {character.gen}
      </div>
      <div className="text-[12px] font-serif leading-[1.65] text-ink border-t border-line pt-1.5 mt-0.5">
        {character.desc}
      </div>
      <div className="text-[10px] text-ink2 mt-1.5 opacity-55">点击锁定到侧边栏 →</div>
    </div>
  );
}
