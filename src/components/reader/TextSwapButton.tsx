"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";

export function TextSwapButton() {
  const { isShortNameMain, toggleTextSwap } = useSidebar();

  return (
    <button
      className="fixed bottom-[30px] left-[30px] z-[300] h-[38px] px-4 bg-tip-bg border border-tip-bd rounded-full cursor-pointer text-[13px] flex items-center justify-center text-ink2 hover:text-ink hover:bg-side-bg hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-all font-ui select-none shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
      onClick={toggleTextSwap}
      title="切换正文与注释显示"
    >
      ⇌ {isShortNameMain ? "原名主文本" : "简称主文本"}
    </button>
  );
}
