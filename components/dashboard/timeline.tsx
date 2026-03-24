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
    <Card className="panel border-white/10">
      <CardHeader className="space-y-2">
        <p className="muted-label">Daily motion</p>
        <CardTitle className="ui-heading text-2xl">Spend rhythm</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="panel-soft flex h-40 items-end gap-2 p-3">
          {entries.map(([date, value]) => (
            <div
              key={date}
              className="flex-1 rounded-full bg-gradient-to-t from-brand-700 via-brand-500 to-brand-300"
              style={{ height: `${(value / max) * 100}%` }}
              title={`${shortTime(date)} – ${value.toFixed(2)}`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-[color:var(--text-muted)]">
          <span>{entries[0]?.[0]}</span>
          <span>{entries[entries.length - 1]?.[0]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
