import { Card, CardContent, CardHeader, CardTitle } from "@stargazers-stella/cosmic-ui";
import { shortTime } from "@/lib/utils";

type TimelineProps = {
  timeline: Record<string, number>;
};

export function Timeline({ timeline }: TimelineProps) {
  const entries = Object.entries(timeline).sort(([a], [b]) =>
    a > b ? 1 : -1,
  );
  const max = Math.max(...entries.map(([, val]) => val), 0.01);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-1">
          {entries.map(([date, value]) => (
            <div
              key={date}
              className="flex-1 rounded-md bg-brand-400/70"
              style={{ height: `${(value / max) * 100}%` }}
              title={`${shortTime(date)} – ${value.toFixed(2)}`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>{entries[0]?.[0]}</span>
          <span>{entries[entries.length - 1]?.[0]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
