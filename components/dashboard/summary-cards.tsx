import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@stargazers-stella/cosmic-ui";
import { formatCurrency } from "@/lib/utils";

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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Card className="glass">
        <CardHeader className="space-y-2">
          <Badge variant="glow" className="w-fit bg-brand-500/10 text-brand-100">
            Spend
          </Badge>
          <CardTitle className="text-2xl font-semibold">
            {formatCurrency(totalSpend)}
          </CardTitle>
          <CardDescription className="text-sm text-slate-300">
            Spent in {timeframe}. Taxes and transfers excluded.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className="glass">
        <CardHeader className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            Top category
          </Badge>
          <CardTitle className="text-xl">
            {topCategory ? topCategory.category : "No data yet"}
          </CardTitle>
          <CardDescription className="text-sm text-slate-300">
            {topCategory ? formatCurrency(topCategory.total) : "Connect an account to begin"}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className="glass">
        <CardHeader className="space-y-2">
          <Badge variant="outline" className="w-fit">
            Avg per bucket
          </Badge>
          <CardTitle className="text-xl">{formatCurrency(avg || 0)}</CardTitle>
          <CardDescription className="text-sm text-slate-300">
            Based on {categories.length || "0"} categories in view
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
