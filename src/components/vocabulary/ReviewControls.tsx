"use client";

interface Props {
  onSubmit: (quality: number) => void;
}

const BUTTONS = [
  { value: 0, label: "不认识", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  { value: 1, label: "模糊", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { value: 3, label: "熟悉", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  { value: 4, label: "掌握", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: 5, label: "完美", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
];

export function ReviewControls({ onSubmit }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {BUTTONS.map((btn) => (
        <button
          key={btn.value}
          onClick={() => onSubmit(btn.value)}
          className={`rounded-lg border px-3 py-2 text-xs font-ui transition-colors hover:opacity-80 ${btn.color}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
