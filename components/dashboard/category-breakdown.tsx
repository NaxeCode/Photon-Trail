import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stargazers-stella/cosmic-ui";
import { formatCategoryLabel, formatCurrency } from "@/lib/utils";

type CategoryBreakdownProps = {
  categories: Array<{ category: string; total: number; count: number }>;
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const total = categories.reduce((acc, c) => acc + c.total, 0);

  return (
    <Card className="panel border-white/10 lg:col-span-2">
      <CardHeader className="space-y-2">
        <p className="muted-label">Category mix</p>
        <CardTitle className="ui-heading text-2xl">
          Where the money pooled
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
          {categories.map((cat) => {
            const width = total ? (cat.total / total) * 100 : 0;
            return (
              <div
                key={cat.category}
                style={{ width: `${width}%` }}
                className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500"
                title={`${formatCategoryLabel(cat.category)}: ${formatCurrency(cat.total)}`}
              />
            );
          })}
        </div>
        <Table className="ui-table table-tint overflow-hidden rounded-2xl">
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-[color:var(--text-muted)]">Category</TableHead>
              <TableHead className="text-right text-[color:var(--text-muted)]">Spend</TableHead>
              <TableHead className="text-right text-[color:var(--text-muted)]">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-[color:var(--text-muted)]">
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
            {categories.map((cat) => (
              <TableRow key={cat.category} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-medium">{formatCategoryLabel(cat.category)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(cat.total)}</TableCell>
                <TableCell className="text-right text-[color:var(--text-muted)]">{cat.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
