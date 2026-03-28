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

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a list of annotation entries from the characters array,
 * sorted by alias length descending to prefer longer matches first.
 */
function buildEntries(characters: CharacterData[]): AnnotationEntry[] {
  const entries: AnnotationEntry[] = [];

  for (const char of characters) {
    const allAliases: string[] = [];

    if (char.aliases && char.aliases.length > 0) {
      for (const a of char.aliases) {
        if (a.alias) allAliases.push(a.alias);
      }
    }

    // Always include orig and nick as fallback aliases
    if (!allAliases.includes(char.orig)) allAliases.push(char.orig);
    if (char.nick !== char.orig && !allAliases.includes(char.nick)) {
      allAliases.push(char.nick);
    }

    for (const alias of allAliases) {
      if (alias && alias.trim().length >= 2) {
        entries.push({
          alias,
          nick: char.nick,
          orig: char.orig,
          id: char.id,
          colorClass: char.colorClass,
          gen: char.gen,
          desc: char.desc,
        });
      }
    }
  }

  // Longer aliases first to avoid partial replacements
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

const ANNOTATION_MARKER = "\x00";

/**
 * Client-side annotation: replaces character name occurrences in plain text
 * with ruby HTML markup that the AnnotatedText component recognises.
 *
 * The content is treated as plain text. If it already contains HTML tags
 * (e.g. from a previous annotation pass), those annotated spans are skipped.
 *
 * @param text - Plain paragraph text (may contain existing HTML)
 * @param characters - Character data with aliases
 * @returns HTML string with character names wrapped in <ruby class="cn"> elements
 */
export function annotateText(text: string, characters: CharacterData[]): string {
  if (!characters.length || !text.trim()) return text;

  const entries = buildEntries(characters);
  if (entries.length === 0) return text;

  // Split text into HTML-tag segments and text segments to avoid annotating
  // inside existing tags.
  const segments = text.split(/(<[^>]+>)/g);

  const annotated = segments.map((seg) => {
    // Leave HTML tags and existing annotated spans untouched
    if (seg.startsWith("<")) return seg;
    if (!seg) return seg;

    let result = seg;

    for (const entry of entries) {
      // Skip if no occurrence (quick check before regex)
      if (!result.includes(entry.alias)) continue;

      // Build a safe regex that avoids matching inside existing annotations
      // (markers left by previous replacements use ANNOTATION_MARKER)
      const escapedAlias = escapeRegex(entry.alias);
      const escapedDesc = entry.desc
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const rubyHtml =
        `<ruby class="cn ${entry.colorClass}" ` +
        `data-nick="${entry.nick}" ` +
        `data-orig="${entry.orig.replace(/"/g, "&quot;")}" ` +
        `data-id="${entry.id}" ` +
        `data-color-class="${entry.colorClass}" ` +
        `data-gen="${entry.gen.replace(/"/g, "&quot;")}" ` +
        `data-desc="${escapedDesc}">` +
        `${ANNOTATION_MARKER}${entry.alias}${ANNOTATION_MARKER}<rt>${entry.nick}</rt></ruby>`;

      result = result.replace(new RegExp(escapedAlias, "g"), rubyHtml);
    }

    // Remove the temporary markers used to prevent re-annotation
    result = result.replace(new RegExp(escapeRegex(ANNOTATION_MARKER), "g"), "");

    return result;
  });

  return annotated.join("");
}
