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
    <div className="flex items-end gap-[3px] h-28">
      {daily.map((day) => {
        const height = Math.max(2, (day.minutes / maxMinutes) * 100);
        return (
          <div
            key={day.date}
            className="flex-1 min-w-[4px] group relative"
            title={`${day.date}: ${Math.round(day.minutes)} 分钟`}
          >
            <div
              className="w-full rounded-t bg-orel/60 transition-all group-hover:bg-orel"
              style={{ height: `${height}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
              <div className="rounded bg-ink px-2 py-1 text-[10px] text-bg whitespace-nowrap font-ui">
                {Math.round(day.minutes)}分钟
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
