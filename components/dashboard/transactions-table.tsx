"use client";

import { useTransition } from "react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stargazers-stella/cosmic-ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export type TransactionRow = {
  id: string;
  name: string | null;
  merchant: string | null;
  description: string | null;
  amount: number;
  currency: string | null;
  category: string | null;
  aiCategory: string | null;
  aiConfidence: number | null;
  manualCategory: string | null;
  postedAt: string;
  plaidItem?: { institutionName?: string | null } | null;
};

type TransactionsTableProps = {
  items: TransactionRow[];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onManualUpdate: (id: string, value: string) => Promise<void>;
  isLoading?: boolean;
  onRefreshAi: () => Promise<void>;
  aiRunning?: boolean;
};

export function TransactionsTable({
  items,
  page,
  pageCount,
  onPageChange,
  onManualUpdate,
  onRefreshAi,
  isLoading,
  aiRunning,
}: TransactionsTableProps) {
  const [pending, startTransition] = useTransition();

  const handleManual = (id: string, value: string) =>
    startTransition(async () => {
      await onManualUpdate(id, value);
      toast.success("Category updated");
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="text-lg font-semibold">Recent transactions</h3>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            id="ai-refresh-button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={pending || aiRunning}
            onClick={() =>
              startTransition(async () => {
                await onRefreshAi();
              })
            }
          >
            {pending || aiRunning ? "Re-analyzing..." : "Refresh AI"}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant</TableHead>
            <TableHead className="hidden sm:table-cell">Source</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden sm:table-cell">AI</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                <TableCell colSpan={6}>
                  <div className="space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          {!isLoading &&
            items.map((tx) => (
              <TableRow key={tx.id} className="align-top hover:bg-white/5">
                <TableCell>
                  <div className="font-medium">{tx.name ?? tx.merchant ?? "Purchase"}</div>
                  <div className="text-xs text-slate-400">{tx.description}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {formatDate(tx.postedAt)}
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-slate-400 sm:table-cell">
                  {tx.plaidItem?.institutionName ?? "Linked"}
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <Select
                    value={tx.manualCategory ?? tx.category ?? tx.aiCategory ?? "Other"}
                    onValueChange={(value) => handleManual(tx.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px] max-w-[360px]">
                      {["Groceries", "Transport", "Dining", "Entertainment", "Housing", "Health", "Shopping", "Travel", "Income", "Other"].map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">
                    {tx.aiCategory ?? "Pending"}
                    {tx.aiConfidence ? ` (${(tx.aiConfidence * 100).toFixed(0)}%)` : ""}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(Number(tx.amount ?? 0), tx.currency ?? "USD")}
                </TableCell>
                <TableCell className="hidden text-right text-sm text-slate-400 sm:table-cell">
                  {formatDate(tx.postedAt)}
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-sm text-slate-400">
                No transactions found for these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm">
        <span className="text-slate-400">
          Page {page} of {pageCount || 1}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
