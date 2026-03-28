"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useSidebar } from "@/components/layout/SidebarProvider";
import { HighlightToolbar } from "./HighlightToolbar";
import type { CharacterData, HighlightData } from "@/lib/types";

interface Props {
  content: string;
  paragraphId: string;
  bookId?: string;
  highlights?: HighlightData[];
  onCharHover?: (char: CharacterData, rect: DOMRect) => void;
  onCharUnhover?: () => void;
}

export function AnnotatedText({
  content,
  paragraphId,
  bookId,
  highlights = [],
  onCharHover,
  onCharUnhover,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isShortNameMain, pinnedCharacter, setPinnedCharacter } = useSidebar();

  const [selectionInfo, setSelectionInfo] = useState<{
    startOffset: number;
    endOffset: number;
    text: string;
    rect: { x: number; y: number };
  } | null>(null);

  const [renderHighlights, setRenderHighlights] = useState<HighlightData[]>(highlights);

  useEffect(() => {
    setRenderHighlights(highlights);
  }, [highlights]);

  const getCharData = useCallback((el: Element): CharacterData | null => {
    const nick = el.getAttribute("data-nick");
    const orig = el.getAttribute("data-orig");
    const colorClass = el.getAttribute("data-color-class") || "";
    const gen = el.getAttribute("data-gen") || "";
    const desc = el.getAttribute("data-desc") || "";
    const id = el.getAttribute("data-id") || "";
    if (!nick || !orig) return null;
    return { id, nick, orig, colorClass: colorClass as CharacterData["colorClass"], gen, desc };
  }, []);

  // Text swap: direct DOM manipulation
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rubies = el.querySelectorAll(".cn");
    rubies.forEach((ruby) => {
      const firstChild = ruby.firstChild;
      if (!firstChild || firstChild.nodeType !== Node.TEXT_NODE) return;

      const rt = ruby.querySelector("rt");
      if (isShortNameMain) {
        firstChild.textContent = ruby.getAttribute("data-nick") || firstChild.textContent;
        if (rt) rt.style.display = "none";
      } else {
        firstChild.textContent = ruby.getAttribute("data-orig") || firstChild.textContent;
        if (rt) rt.style.display = "";
      }
    });
  }, [isShortNameMain]);

  // Sync pinned state
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rubies = el.querySelectorAll(".cn");
    rubies.forEach((ruby) => {
      if (pinnedCharacter && ruby.getAttribute("data-nick") === pinnedCharacter.nick) {
        ruby.classList.add("pinned");
      } else {
        ruby.classList.remove("pinned");
      }
    });
  }, [pinnedCharacter]);

  // Render highlight marks
  useEffect(() => {
    const el = ref.current;
    if (!el || renderHighlights.length === 0) return;

    // Remove existing highlight marks
    el.querySelectorAll(".hl-mark").forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
      parent.normalize();
    });

    // Apply highlight marks
    const textNodes: { node: Text; offset: number }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let globalOffset = 0;

    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push({ node: node as Text, offset: globalOffset });
      globalOffset += (node as Text).length;
    }

    const totalLength = globalOffset;
    // Process highlights in reverse order to preserve offsets
    const sorted = [...renderHighlights].sort((a, b) => a.startOffset - b.startOffset);

    for (const hl of sorted) {
      const start = Math.max(0, hl.startOffset);
      const end = Math.min(totalLength, hl.endOffset);
      if (start >= end) continue;

      // Find text node containing start offset
      const startNode = textNodes.find(
        (tn) => tn.offset <= start && start < tn.offset + tn.node.length,
      );
      const endNode = textNodes.find(
        (tn) => tn.offset <= end && end <= tn.offset + tn.node.length,
      );
      if (!startNode || !endNode) continue;

      try {
        const range = document.createRange();
        range.setStart(startNode.node, start - startNode.offset);
        range.setEnd(endNode.node, end - endNode.offset);

        const colorMap: Record<string, string> = {
          yellow: "rgba(250, 204, 21, 0.25)",
          green: "rgba(134, 239, 172, 0.3)",
          blue: "rgba(147, 197, 253, 0.3)",
          red: "rgba(252, 165, 165, 0.3)",
          purple: "rgba(196, 181, 253, 0.3)",
        };

        const mark = document.createElement("span");
        mark.className = "hl-mark";
        mark.style.backgroundColor = colorMap[hl.color] || colorMap.yellow;

        range.surroundContents(mark);
      } catch {
        // surroundContents can fail if range crosses element boundaries
      }
    }
  }, [renderHighlights]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".cn");
      if (!target || !onCharHover) return;
      if (pinnedCharacter && target.getAttribute("data-nick") === pinnedCharacter.nick) return;
      const charData = getCharData(target);
      if (!charData) return;
      onCharHover(charData, target.getBoundingClientRect());
    },
    [getCharData, onCharHover, pinnedCharacter]
  );

  const handleMouseLeave = useCallback(() => {
    onCharUnhover?.();
  }, [onCharUnhover]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".cn");
      if (!target) return;
      e.stopPropagation();
      const charData = getCharData(target);
      if (!charData) return;
      if (pinnedCharacter && pinnedCharacter.nick === charData.nick) {
        setPinnedCharacter(null);
      } else {
        setPinnedCharacter(charData);
      }
    },
    [getCharData, pinnedCharacter, setPinnedCharacter]
  );

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !bookId) return;

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text || text.length < 2) return;

    // Check selection is within this paragraph
    if (!ref.current?.contains(range.commonAncestorContainer)) return;

    // Calculate offsets relative to paragraph text content
    const preRange = document.createRange();
    preRange.selectNodeContents(ref.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + text.length;

    const rect = range.getBoundingClientRect();
    setSelectionInfo({
      startOffset,
      endOffset,
      text,
      rect: { x: rect.left + rect.width / 2, y: rect.top },
    });
  }, [bookId]);

  return (
    <>
      <p
        ref={ref}
        className="text-[19px] mb-[1.4em] text-indent-[2em] leading-[2.2]"
        style={{ textIndent: "2em" }}
        dangerouslySetInnerHTML={{ __html: content }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseUp={handleMouseUp}
      />
      {selectionInfo && bookId && (
        <HighlightToolbar
          paragraphId={paragraphId}
          bookId={bookId}
          selection={selectionInfo}
          position={selectionInfo.rect}
          onClose={() => setSelectionInfo(null)}
          onCreated={(hl) => {
            setRenderHighlights((prev) => [...prev, hl]);
          }}
        />
      )}
    </>
  );
}
