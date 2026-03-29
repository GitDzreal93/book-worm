import type { CharacterData } from "@/lib/types";

interface AnnotationEntry {
  alias: string;
  nick: string;
  orig: string;
  id: string;
  colorClass: string;
  gen: string;
  desc: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEntries(characters: CharacterData[]): AnnotationEntry[] {
  const seen = new Set<string>();
  const entries: AnnotationEntry[] = [];

  for (const char of characters) {
    const allAliases: string[] = [];

    for (const a of char.aliases ?? []) {
      if (a.alias?.trim()) allAliases.push(a.alias.trim());
    }
    if (!allAliases.includes(char.orig)) allAliases.push(char.orig);
    if (char.nick !== char.orig && !allAliases.includes(char.nick)) {
      allAliases.push(char.nick);
    }

    for (const alias of allAliases) {
      if (!alias || alias.length < 2 || seen.has(alias)) continue;
      seen.add(alias);
      entries.push({ alias, nick: char.nick, orig: char.orig, id: char.id, colorClass: char.colorClass, gen: char.gen, desc: char.desc });
    }
  }

  // Longer aliases first — regex alternation tries left-to-right so longer wins
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

/**
 * Client-side annotation: replaces character name occurrences in plain text
 * with `<ruby class="cn ...">` markup for the reader's hover/tooltip system.
 *
 * Uses a single-pass combined regex per text segment to prevent nested
 * ruby tags (which would occur with iterative per-alias replacements when a
 * short alias is a substring of a longer one that was already replaced).
 */
export function annotateText(text: string, characters: CharacterData[]): string {
  if (!characters.length || !text.trim()) return text;

  const entries = buildEntries(characters);
  if (entries.length === 0) return text;

  // Lookup map: matched alias text → entry
  const aliasMap = new Map<string, AnnotationEntry>(entries.map((e) => [e.alias, e]));

  // Combined alternation regex — tries alternatives left-to-right (longest first)
  const combined = new RegExp(entries.map((e) => escapeRegex(e.alias)).join("|"), "g");

  // Process only non-tag segments to avoid annotating inside HTML attributes/tags
  const segments = text.split(/(<[^>]+>)/g);

  return segments
    .map((seg) => {
      if (!seg || seg.startsWith("<")) return seg;

      return seg.replace(combined, (match) => {
        const entry = aliasMap.get(match);
        if (!entry) return match;
        return (
          `<ruby class="cn ${entry.colorClass}" ` +
          `data-nick="${attr(entry.nick)}" ` +
          `data-orig="${attr(entry.orig)}" ` +
          `data-id="${entry.id}" ` +
          `data-color-class="${entry.colorClass}" ` +
          `data-gen="${attr(entry.gen)}" ` +
          `data-desc="${attr(entry.desc)}">` +
          `${match}<rt>${entry.nick}</rt></ruby>`
        );
      });
    })
    .join("");
}
