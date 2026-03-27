"use client";

import { useMemo } from "react";
import { useSidebar } from "@/components/layout/SidebarProvider";
import type { CharacterData, FamilyRelationData, ColorClass } from "@/lib/types";

interface Props {
  relations: FamilyRelationData[];
  characters: CharacterData[];
}

const COLOR_MAP: Record<ColorClass, string> = {
  "ct-orel": "text-orel",
  "ct-jose": "text-jose",
  "ct-female": "text-female",
  "ct-outsider": "text-outsider",
};

const GEN_LABELS = ["一代", "二代", "三代", "四代", "五代", "六代", "七代"];

function getCharColorClass(nick: string, characters: CharacterData[]): string {
  const c = characters.find((ch) => ch.nick === nick);
  return c ? (COLOR_MAP[c.colorClass] || "text-ink") : "text-ink2";
}

export function FamilyTree({ relations, characters }: Props) {
  const { activeTab } = useSidebar();

  // Group relations by generation
  const treeData = useMemo(() => {
    // Build a map of character -> their parents (to determine generation)
    const parentMap = new Map<string, Set<string>>();
    for (const r of relations) {
      if (r.type === "parent-child") {
        if (!parentMap.has(r.relativeNick)) parentMap.set(r.relativeNick, new Set());
        parentMap.get(r.relativeNick)!.add(r.personNick);
      }
    }

    // Assign generations based on root characters (no parents)
    const genMap = new Map<string, number>();

    function assignGen(nick: string, gen: number) {
      if (genMap.has(nick)) return;
      genMap.set(nick, gen);
      for (const r of relations) {
        if (r.type === "parent-child" && r.personNick === nick) {
          assignGen(r.relativeNick, gen + 1);
        }
      }
    }

    // Find root characters (not children of anyone)
    const allChars = new Set<string>();
    for (const r of relations) {
      allChars.add(r.personNick);
      allChars.add(r.relativeNick);
    }
    for (const nick of allChars) {
      if (!parentMap.has(nick)) {
        assignGen(nick, 1);
      }
    }

    // Group by generation
    const groups = new Map<number, { nicks: string[]; notes: string[] }>();
    for (const [nick, gen] of genMap) {
      if (!groups.has(gen)) groups.set(gen, { nicks: [], notes: [] });
      groups.get(gen)!.nicks.push(nick);
    }

    // Collect notes (type: "note" relations)
    for (const r of relations) {
      if (r.type === "note" && genMap.has(r.personNick)) {
        const gen = genMap.get(r.personNick)!;
        if (!groups.has(gen)) groups.set(gen, { nicks: [], notes: [] });
        groups.get(gen)!.notes.push(`${r.personNick}：${r.note}`);
      }
    }

    // Sort generations
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([gen, data]) => ({
        gen,
        label: GEN_LABELS[gen - 1] || `${gen}代`,
        nicks: data.nicks,
        notes: data.notes,
      }));
  }, [relations]);

  if (activeTab !== "tree") return null;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 px-4">
      <div className="text-[11px] font-ui text-ink2 mb-3 opacity-60 tracking-[0.15em]">
        七代家族谱
      </div>
      <div className="text-xs font-ui leading-[2] text-ink">
        {treeData.map((group, idx) => (
          <div key={group.gen} className={idx > 0 ? "border-l border-line pl-3 ml-2 mb-3" : "mb-3"}>
            <div className="text-[10px] text-ink2 tracking-[0.2em] mb-1 opacity-55">
              {group.label}
            </div>
            {renderGenerationContent(group.nicks, relations, characters)}
            {group.notes.map((note, i) => (
              <div key={i} className="ml-2 text-[11px] text-ink2">
                <span className="text-outsider">{note}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderGenerationContent(
  nicks: string[],
  relations: FamilyRelationData[],
  characters: CharacterData[],
) {
  // Get spouse pairs
  const spousePairs: { person: string; relative: string; note: string | null }[] = [];
  const processed = new Set<string>();

  for (const r of relations) {
    if (r.type === "spouse" && nicks.includes(r.personNick)) {
      const key = [r.personNick, r.relativeNick].sort().join("-");
      if (!processed.has(key)) {
        processed.add(key);
        spousePairs.push({
          person: r.personNick,
          relative: r.relativeNick,
          note: r.note,
        });
      }
    }
  }

  // Get parent-child notes
  const pcNotes = new Map<string, string[]>();
  for (const r of relations) {
    if (r.type === "parent-child" && r.note && nicks.includes(r.relativeNick)) {
      if (!pcNotes.has(r.relativeNick)) pcNotes.set(r.relativeNick, []);
      pcNotes.get(r.relativeNick)!.push(r.note);
    }
  }

  return (
    <>
      {spousePairs.map(({ person, relative, note }) => (
        <div key={`${person}-${relative}`} className="flex items-center gap-1">
          <span className={`font-semibold ${getCharColorClass(person, characters)}`}>
            {person}
          </span>
          <span className="text-ink2"> × </span>
          <span className={`font-semibold ${getCharColorClass(relative, characters)}`}>
            {relative}
          </span>
          {note && (
            <span className="text-ink2 text-[11px]">（{note}）</span>
          )}
        </div>
      ))}
      {/* Single characters not in spouse pairs */}
      {nicks
        .filter((n) => !processed.has(n) && !spousePairs.some((p) => p.relative === n))
        .map((nick) => (
          <div key={nick}>
            <span className={`font-semibold ${getCharColorClass(nick, characters)}`}>
              {nick}
            </span>
            {pcNotes.get(nick)?.map((note, i) => (
              <span key={i} className="text-ink2 text-[11px]">（{note}）</span>
            ))}
          </div>
        ))}
    </>
  );
}
