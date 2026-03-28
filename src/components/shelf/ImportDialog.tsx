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
    if (!file.name.toLowerCase().endsWith(".epub")) {
      setState("error");
      setErrorCode("format");
      return;
    }

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
    [state, uploadFile],
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
      e.target.value = "";
    },
    [uploadFile],
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        导入书籍
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-line bg-tip-bg p-6 shadow-2xl">
        {/* Close button */}
        {state !== "uploading" && state !== "parsing" && state !== "success" && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-md text-ink2 transition-colors hover:bg-ink/5 hover:text-ink cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <h2 className="mb-5 text-base font-semibold text-ink font-ui">
          导入电子书
        </h2>

        {state === "success" ? (
          <div className="flex flex-col items-center py-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <svg className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-ui font-medium text-ink">导入成功</p>
            <p className="mt-1 text-sm text-ink2">页面即将刷新...</p>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => state === "idle" && fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-200 ${
                dragOver
                  ? "border-accent bg-accent/5"
                  : state === "error"
                    ? "border-danger/40 bg-danger/5"
                    : "border-line hover:border-ink2/30 hover:bg-ink/[0.02]"
              } ${state !== "idle" ? "cursor-default" : ""}`}
            >
              {state === "idle" && (
                <>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5">
                    <svg className="h-5 w-5 text-ink2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-ui font-medium text-ink">
                    拖放 epub 文件到此处
                  </p>
                  <p className="mt-1 text-xs text-ink2">或点击选择文件</p>
                </>
              )}

              {(state === "uploading" || state === "parsing") && (
                <>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                  <p className="text-sm font-ui font-medium text-ink">
                    {state === "uploading" ? "上传中..." : "解析中..."}
                  </p>
                  <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}

              {state === "error" && errorCode && (
                <>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
                    <svg className="h-5 w-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-ui text-danger">
                    {ERROR_MESSAGES[errorCode]}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                    className="btn-secondary mt-3"
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
      </div>
    </div>
  );
}
