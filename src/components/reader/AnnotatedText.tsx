"use client";

import { useRef, useCallback, useEffect } from "react";
import { useSidebar } from "@/components/layout/SidebarProvider";
import type { CharacterData } from "@/lib/types";

interface Props {
  content: string;
  onCharHover?: (char: CharacterData, rect: DOMRect) => void;
  onCharUnhover?: () => void;
}

export function AnnotatedText({ content, onCharHover, onCharUnhover }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isShortNameMain, pinnedCharacter, setPinnedCharacter } = useSidebar();

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

  return (
    <p
      ref={ref}
      className="text-[19px] mb-[1.4em] text-indent-[2em] leading-[2.2]"
      style={{ textIndent: "2em" }}
      dangerouslySetInnerHTML={{ __html: content }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
}
