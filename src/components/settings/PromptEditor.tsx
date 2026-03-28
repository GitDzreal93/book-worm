"use client";

interface PromptEditorProps {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onRestore: () => void;
}

export function PromptEditor({
  label,
  value,
  defaultValue,
  onChange,
  onRestore,
}: PromptEditorProps) {
  const isModified = value !== defaultValue;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-ink">{label}</label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink2">{value.length} 字符</span>
          {isModified && (
            <button
              type="button"
              onClick={onRestore}
              className="text-xs text-ink2 hover:text-ink transition-colors"
            >
              恢复默认
            </button>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full text-sm border border-line rounded-md px-3 py-2 bg-bg text-ink placeholder:text-ink2 focus:outline-none focus:border-ink resize-y"
      />
    </div>
  );
}
