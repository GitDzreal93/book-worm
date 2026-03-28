"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { cn } from "@/lib/utils";

const tabs: { key: "toc" | "char" | "tree" | "translate" | "notes"; label: string }[] = [
  { key: "toc", label: "目录" },
  { key: "char", label: "人物" },
  { key: "tree", label: "关系图" },
  { key: "translate", label: "翻译" },
  { key: "notes", label: "笔记" },
];

export function SidebarTabs() {
  const { activeTab, setActiveTab } = useSidebar();

  return (
    <div className="flex border-b border-line flex-shrink-0 bg-bg">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={cn(
            "flex-1 py-[11px] text-center text-xs font-ui text-ink2 cursor-pointer border-b-2 border-transparent transition-all select-none",
            activeTab === tab.key && "text-ink border-b-ink"
          )}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
