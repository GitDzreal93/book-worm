"use client";

import { useState, useRef, useCallback } from "react";

type ImportState = "idle" | "uploading" | "parsing" | "success" | "error";
type ErrorCode = "format" | "size" | "parse" | "network";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  format: "不支持的文件格式，请上传 epub 文件",
  size: "文件过大，epub 文件不能超过 50MB",
  parse: "文件解析失败，请确认是有效的 epub 文件",
  network: "网络错误，请重试",
};

/** 书籍导入对话框，支持拖放和文件选择 */
export function ImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ImportState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState("idle");
    setProgress(0);
    setErrorCode(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetState();
  }, [resetState]);

  const uploadFile = useCallback(async (file: File) => {
    // 验证文件格式
    if (!file.name.toLowerCase().endsWith(".epub")) {
      setState("error");
      setErrorCode("format");
      return;
    }

    // 验证文件大小 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setState("error");
      setErrorCode("size");
      return;
    }

    setState("uploading");
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setState("parsing");
      setProgress(60);

      const response = await fetch("/api/books/import", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 400) {
          setState("error");
          setErrorCode(data?.error?.includes("格式") ? "format" : "parse");
        } else {
          setState("error");
          setErrorCode("network");
        }
        return;
      }

      setProgress(100);
      setState("success");

      // 1.5秒后关闭并刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setState("error");
      setErrorCode("network");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (state !== "idle") return;
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [state, uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (state === "idle") setDragOver(true);
  }, [state]);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // 重置 input 以允许重复选择相同文件
      e.target.value = "";
    },
    [uploadFile]
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm text-bg transition-colors hover:bg-ink2 font-ui"
      >
        导入书籍
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* 对话框 */}
      <div className="relative w-full max-w-md rounded-xl bg-tip-bg p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-ink font-ui">
          导入电子书
        </h2>

        {state === "success" ? (
          <div className="flex flex-col items-center py-8">
            <div className="mb-3 text-2xl">&#10003;</div>
            <p className="text-ink">导入成功！</p>
            <p className="mt-1 text-sm text-ink2">页面即将刷新...</p>
          </div>
        ) : (
          <>
            {/* 拖放区域 */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => state === "idle" && fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
                dragOver
                  ? "border-orel bg-orel/5"
                  : state === "error"
                    ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                    : "border-line hover:border-ink2"
              } ${state !== "idle" ? "cursor-default" : ""}`}
            >
              {state === "idle" && (
                <>
                  <div className="mb-3 text-3xl text-ink2">&#128194;</div>
                  <p className="text-sm text-ink">
                    拖放 epub 文件到此处
                  </p>
                  <p className="mt-1 text-xs text-ink2">或点击选择文件</p>
                </>
              )}

              {(state === "uploading" || state === "parsing") && (
                <>
                  <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orel border-t-transparent" />
                  <p className="text-sm text-ink">
                    {state === "uploading" ? "上传中..." : "解析中..."}
                  </p>
                  <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-orel transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}

              {state === "error" && errorCode && (
                <>
                  <div className="mb-3 text-2xl">&#10007;</div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {ERROR_MESSAGES[errorCode]}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                    className="mt-3 rounded border border-line px-3 py-1 text-xs text-ink2 transition-colors hover:bg-line font-ui"
                  >
                    重试
                  </button>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}

        {/* 关闭按钮 */}
        {state !== "uploading" && state !== "parsing" && state !== "success" && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-ink2 hover:text-ink"
          >
            &#10005;
          </button>
        )}
      </div>
    </div>
  );
}
