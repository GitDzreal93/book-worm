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

function attr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function makeRubyTag(entry: AnnotationEntry, matchedText: string): string {
  return (
    `<ruby class="cn ${entry.colorClass}" ` +
    `data-nick="${attr(entry.nick)}" ` +
    `data-orig="${attr(entry.orig)}" ` +
    `data-id="${entry.id}" ` +
    `data-color-class="${entry.colorClass}" ` +
    `data-gen="${attr(entry.gen)}" ` +
    `data-desc="${attr(entry.desc)}">` +
    `${matchedText}<rt>${entry.nick}</rt></ruby>`
  );
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

  // Longer aliases first — critical for placeholder algorithm correctness
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

/**
 * Annotate a single plain-text segment using the placeholder algorithm.
 *
 * Long names are matched first and replaced with unique placeholders (\x00PHn\x00).
 * Once a region is consumed by a placeholder, shorter aliases cannot match inside it.
 * Finally, all placeholders are replaced with <ruby> tags.
 */
function annotateSegment(text: string, entries: AnnotationEntry[]): string {
  const placeholders = new Map<string, string>();
  let counter = 0;

  for (const entry of entries) {
    let start = 0;
    while (true) {
      const idx = text.indexOf(entry.alias, start);
      if (idx === -1) break;
      const ph = `\x00PH${counter}\x00`;
      counter++;
      text = text.slice(0, idx) + ph + text.slice(idx + entry.alias.length);
      placeholders.set(ph, makeRubyTag(entry, entry.alias));
      start = idx + ph.length;
    }
  }

  for (const [ph, tag] of placeholders) {
    text = text.replaceAll(ph, tag);
  }

  return text;
}

/**
 * Client-side annotation: replaces character name occurrences in plain text
 * with `<ruby class="cn ...">` markup for the reader's hover/tooltip system.
 *
 * Uses a placeholder-based algorithm: long names are matched first and replaced
 * with temporary placeholders, preventing short aliases from matching inside
 * already-consumed substrings (e.g. "伊凡" inside "索菲亚·伊凡诺芙娜").
 */
export function annotateText(text: string, characters: CharacterData[]): string {
  if (!characters.length || !text.trim()) return text;

  const entries = buildEntries(characters);
  if (entries.length === 0) return text;

  // Process only non-tag segments to avoid annotating inside HTML attributes/tags
  const segments = text.split(/(<[^>]+>)/g);

  return segments
    .map((seg) => {
      if (!seg || seg.startsWith("<")) return seg;
      return annotateSegment(seg, entries);
    })
    .join("");
}
