"use client";

import { useSidebar } from "@/components/layout/SidebarProvider";

export function Legend() {
  const { activeTab } = useSidebar();

  if (activeTab !== "char") return null;

  const items = [
    { color: "var(--orel)", label: "雷系（奥雷良诺）内敛孤僻" },
    { color: "var(--jose)", label: "霍系（霍塞·阿卡迪奥）冲动强壮" },
    { color: "var(--female)", label: "女性人物" },
    { color: "var(--outsider)", label: "外来人物" },
  ];

  return (
    <div className="mt-5 pt-3.5 border-t border-line">
      <div className="text-[10px] font-ui tracking-[0.2em] text-ink2 mb-2 opacity-60">
        颜色说明
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-[7px] text-[11px] font-ui text-ink2 mb-[5px]">
          <div
            className="w-[10px] h-[10px] rounded-sm flex-shrink-0"
            style={{ background: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}
