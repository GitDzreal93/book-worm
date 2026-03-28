"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { CharacterData, SidebarTab } from "@/lib/types";

interface SidebarContextValue {
  isOpen: boolean;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  pinnedCharacter: CharacterData | null;
  setPinnedCharacter: (char: CharacterData | null) => void;
  width: number;
  setWidth: (w: number) => void;
  isShortNameMain: boolean;
  toggleTextSwap: () => void;
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  bookSlug: string;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children, bookSlug }: { children: ReactNode; bookSlug?: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>("toc");
  const [pinnedCharacter, setPinnedCharacter] = useState<CharacterData | null>(null);
  const [isShortNameMain, setIsShortNameMain] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const [width, setWidthState] = useState(() => {
    if (typeof window === "undefined") return 290;
    const saved = localStorage.getItem("sideW");
    return saved ? parseInt(saved, 10) : 290;
  });

  const toggleOpen = useCallback(() => setIsOpen((p) => !p), []);
  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);

  const setWidth = useCallback((w: number) => {
    setWidthState(w);
    localStorage.setItem("sideW", String(w));
  }, []);

  const toggleTextSwap = useCallback(() => {
    setIsShortNameMain((p) => !p);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleOpen,
        setOpen,
        activeTab,
        setActiveTab,
        pinnedCharacter,
        setPinnedCharacter,
        width,
        setWidth,
        isShortNameMain,
        toggleTextSwap,
        showTranslation,
        setShowTranslation,
        bookSlug: bookSlug || "",
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
