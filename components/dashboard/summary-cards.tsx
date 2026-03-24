import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@stargazers-stella/cosmic-ui";
import { formatCategoryLabel, formatCurrency } from "@/lib/utils";

type SummaryCardsProps = {
  totalSpend: number;
  timeframe: string;
  categories: Array<{ category: string; total: number; count: number }>;
};

export function SummaryCards({ totalSpend, timeframe, categories }: SummaryCardsProps) {
  const topCategory = categories
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)[0];
  const avg = categories.length ? totalSpend / categories.length : 0;
  const cards = [
    {
      label: "Spend",
      value: formatCurrency(totalSpend),
      note: `Spent in ${timeframe}. Taxes and transfers excluded.`,
      badge: "Outflow",
      badgeClass: "bg-brand-500/15 text-brand-100",
    },
    {
      label: "Top category",
      value: topCategory ? formatCategoryLabel(topCategory.category) : "No data yet",
      note: topCategory ? formatCurrency(topCategory.total) : "Connect an account to begin",
      badge: "Largest",
      badgeClass: "bg-white/8 text-[color:var(--text)]",
    },
    {
      label: "Avg per bucket",
      value: formatCurrency(avg || 0),
      note: `Based on ${categories.length || "0"} categories in view`,
      badge: "Blend",
      badgeClass: "bg-emerald-500/15 text-emerald-200",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="panel overflow-hidden border-white/10">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="muted-label mb-2">{card.label}</p>
                <CardTitle className="ui-heading text-3xl">
                  {card.value}
                </CardTitle>
              </div>
              <Badge variant="outline" className={`w-fit border-0 ${card.badgeClass}`}>
                {card.badge}
              </Badge>
            </div>
            <CardDescription className="text-sm leading-6 text-[color:var(--text-muted)]">
              {card.note}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
