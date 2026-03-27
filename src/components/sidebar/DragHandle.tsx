"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSidebar } from "@/components/layout/SidebarProvider";
import { cn } from "@/lib/utils";

export function DragHandle() {
  const { width, setWidth, isOpen } = useSidebar();
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startXRef.current = e.clientX;
      startWRef.current = width;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [width]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newW = Math.max(200, Math.min(520, startWRef.current + (startXRef.current - e.clientX)));
      setWidth(newW);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, setWidth]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "w-[5px] flex-shrink-0 cursor-col-resize bg-transparent transition-colors z-10",
        dragging && "bg-tip-bd"
      )}
      onMouseDown={handleMouseDown}
    />
  );
}
