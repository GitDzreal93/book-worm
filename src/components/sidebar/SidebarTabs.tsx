"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";
import { cn } from "@/lib/utils";

const ALL_TABS: { key: "toc" | "char" | "tree" | "translate" | "notes"; label: string; needsLLM?: boolean }[] = [
  { key: "toc", label: "目录" },
  { key: "char", label: "人物", needsLLM: true },
  { key: "tree", label: "关系图", needsLLM: true },
  { key: "translate", label: "翻译", needsLLM: true },
  { key: "notes", label: "笔记" },
];

export function SidebarTabs() {
  const { activeTab, setActiveTab, hasLLM } = useSidebar();

  return (
    <div className="flex border-b border-line flex-shrink-0 bg-bg">
      {ALL_TABS.map((tab) => {
        const disabled = !hasLLM && !!tab.needsLLM;
        return (
          <button
            key={tab.key}
            disabled={disabled}
            title={disabled ? "请先在设置中配置 API Key" : undefined}
            className={cn(
              "flex-1 py-[11px] text-center text-xs font-ui text-ink2 border-b-2 border-transparent transition-all select-none",
              !disabled && "cursor-pointer",
              disabled && "opacity-35 cursor-not-allowed",
              activeTab === tab.key && !disabled && "text-ink border-b-ink"
            )}
            onClick={() => { if (!disabled) setActiveTab(tab.key); }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
