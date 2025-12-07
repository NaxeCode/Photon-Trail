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
import { formatCurrency } from "@/lib/utils";

type CategoryBreakdownProps = {
  categories: Array<{ category: string; total: number; count: number }>;
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const total = categories.reduce((acc, c) => acc + c.total, 0);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Category breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
          {categories.map((cat) => {
            const width = total ? (cat.total / total) * 100 : 0;
            return (
              <div
                key={cat.category}
                style={{ width: `${width}%` }}
                className="bg-brand-500/80"
                title={`${cat.category}: ${formatCurrency(cat.total)}`}
              />
            );
          })}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-slate-400">
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
            {categories.map((cat) => (
              <TableRow key={cat.category} className="hover:bg-white/5">
                <TableCell>{cat.category}</TableCell>
                <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                <TableCell className="text-right text-slate-400">{cat.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
