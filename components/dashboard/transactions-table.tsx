"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stargazers-stella/cosmic-ui";
import { formatCategoryLabel, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export type TransactionRow = {
  id: string;
  plaidId?: string | null;
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
  isRefreshing?: boolean;
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
  isRefreshing,
  aiRunning,
}: TransactionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshingAi, setRefreshingAi] = useState(false);
  const categories = useMemo(
    () => [
      "Groceries",
      "Transport",
      "Dining",
      "Entertainment",
      "Housing",
      "Health",
      "Shopping",
      "Travel",
      "Income",
      "Other",
    ],
    [],
  );

  const handleManual = async (id: string, value: string) => {
    setSavingId(id);

    try {
      await onManualUpdate(id, value);
      setEditingId(null);
      toast.success("Category updated");
    } catch {
      // parent handler surfaces the error toast
    } finally {
      setSavingId(null);
    }
  };

  const handleRefreshAiClick = async () => {
    setRefreshingAi(true);

    try {
      await onRefreshAi();
    } finally {
      setRefreshingAi(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="muted-label mb-2">Transactions</p>
          <h3 className="ui-heading text-2xl">Recent ledger entries</h3>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            {isRefreshing
              ? "Refreshing ledger in the background..."
              : "Live edits stay in place while data refreshes."}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            id="ai-refresh-button"
            variant="secondary"
            className="btn-primary w-full sm:w-auto"
            disabled={refreshingAi || aiRunning}
            onClick={handleRefreshAiClick}
          >
            {refreshingAi || aiRunning ? "Re-analyzing..." : "Refresh AI"}
          </Button>
        </div>
      </div>
      <Table className="ui-table table-tint overflow-hidden rounded-[1.5rem]">
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead className="text-[color:var(--text-muted)]">Merchant</TableHead>
            <TableHead className="hidden text-[color:var(--text-muted)] sm:table-cell">Source</TableHead>
            <TableHead className="text-[color:var(--text-muted)]">Category</TableHead>
            <TableHead className="hidden text-[color:var(--text-muted)] sm:table-cell">AI</TableHead>
            <TableHead className="text-right text-[color:var(--text-muted)]">Amount</TableHead>
            <TableHead className="hidden text-right text-[color:var(--text-muted)] sm:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`} className="border-white/5">
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
              <TableRow key={tx.id} className="align-top border-white/5 hover:bg-white/5">
                <TableCell>
                  <div className="font-medium">{tx.name ?? tx.merchant ?? "Purchase"}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">{tx.description}</div>
                  <div className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                    {formatDate(tx.postedAt)}
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-[color:var(--text-muted)] sm:table-cell">
                  {tx.plaidItem?.institutionName ?? "Linked"}
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="category-chip category-chip-active"
                      onClick={() => setEditingId((current) => (current === tx.id ? null : tx.id))}
                    >
                      {formatCategoryLabel(tx.manualCategory ?? tx.category ?? tx.aiCategory ?? "Other")}
                    </button>
                    {editingId === tx.id ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => {
                            const active =
                              (tx.manualCategory ?? tx.category ?? tx.aiCategory ?? "Other") === cat;

                            return (
                              <button
                                key={cat}
                                type="button"
                                className={`category-chip ${active ? "category-chip-active" : ""}`}
                                disabled={savingId === tx.id}
                                onClick={() => void handleManual(tx.id, cat)}
                              >
                                {savingId === tx.id && active ? "Saving..." : formatCategoryLabel(cat)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-[color:var(--text)]">
                    {tx.aiCategory ? formatCategoryLabel(tx.aiCategory) : "Pending"}
                    {tx.aiConfidence ? ` (${(tx.aiConfidence * 100).toFixed(0)}%)` : ""}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(Number(tx.amount ?? 0), tx.currency ?? "USD")}
                </TableCell>
                <TableCell className="hidden text-right text-sm text-[color:var(--text-muted)] sm:table-cell">
                  {formatDate(tx.postedAt)}
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                No transactions found for these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="panel-soft flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-[color:var(--text-muted)]">
          Page {page} of {pageCount || 1}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="btn-ghost"
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
