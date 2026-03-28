"use client";

interface DailyStat {
  date: string;
  minutes: number;
  sessions: number;
}

interface Props {
  daily: DailyStat[];
}

export function ReadingChart({ daily }: Props) {
  if (daily.length === 0) return null;

  const maxMinutes = Math.max(...daily.map((d) => d.minutes), 1);

  return (
    <div className="flex items-end gap-[3px]" style={{ height: "140px" }}>
      {daily.map((day) => {
        const height = day.minutes > 0 ? Math.max(4, (day.minutes / maxMinutes) * 100) : 2;
        return (
          <div
            key={day.date}
            className="group relative flex-1 min-w-[4px]"
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="rounded-lg border border-line bg-tip-bg px-2.5 py-1.5 text-[11px] text-ink whitespace-nowrap font-ui shadow-lg">
                {Math.round(day.minutes)} 分钟
                {day.sessions > 1 && (
                  <span className="ml-1 text-ink2/50">· {day.sessions}次</span>
                )}
              </div>
            </div>
            <div
              className={`w-full rounded-t-sm transition-colors duration-150 ${
                day.minutes > 0
                  ? "bg-accent/40 group-hover:bg-accent"
                  : "bg-line"
              }`}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
