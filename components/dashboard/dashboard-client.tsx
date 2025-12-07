"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { SummaryCards } from "./summary-cards";
import { CategoryBreakdown } from "./category-breakdown";
import { Timeline } from "./timeline";
import { Filters, type FilterState } from "./filters";
import { TransactionsTable, type TransactionRow } from "./transactions-table";
import { PlaidLinkButton } from "../plaid-link-button";
import { EmptyState } from "./empty-state";
import { Button, Card, CardContent } from "@stargazers-stella/cosmic-ui";

type DashboardClientProps = {
  initialDashboard: {
    recent: TransactionRow[];
    categories: Array<{ category: string; total: number; count: number }>;
    totalSpend: number;
    timeline: Record<string, number>;
  };
  initialTransactions: {
    items: TransactionRow[];
    page: number;
    pageCount: number;
    total: number;
  };
  defaultFilters: FilterState;
};

export function DashboardClient({
  initialDashboard,
  initialTransactions,
  defaultFilters,
}: DashboardClientProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(initialTransactions.page);
  const [lastAiRun, setLastAiRun] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.minAmount) params.set("minAmount", filters.minAmount);
    if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);
    params.set("page", String(page));
    params.set("limit", "10");
    return params.toString();
  }, [filters, page]);

  const {
    data: dashboardData,
    mutate: mutateDashboard,
    error: dashboardError,
  } = useSWR(`/api/dashboard?${query}`, undefined, {
    fallbackData: initialDashboard,
  });

  const {
    data: transactionsData,
    mutate: mutateTransactions,
    isValidating: transactionsLoading,
    error: transactionsError,
  } = useSWR(`/api/transactions?${query}`, undefined, {
    fallbackData: initialTransactions,
  });

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          (dashboardData?.categories ?? [])
            .map((c) => c.category)
            .filter((c): c is string => Boolean(c)),
        ),
      ),
    [dashboardData?.categories],
  );

  const showEmptyState =
    !transactionsLoading &&
    (transactionsData?.items?.length ?? 0) === 0 &&
    initialTransactions.items.length === 0;

  useEffect(() => {
    if ((dashboardError || transactionsError) && !hasShownError) {
      toast.error("Live data could not refresh. Showing last known values.");
      setHasShownError(true);
    }
  }, [dashboardError, hasShownError, transactionsError]);

  const handleManualUpdate = async (id: string, manualCategory: string) => {
    try {
      await fetch("/api/transactions/update-category", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id, manualCategory }),
      });
      await mutateTransactions();
      await mutateDashboard();
    } catch (error) {
      console.error(error);
      toast.error("Could not update category");
    }
  };

  const handleRefreshAi = async () => {
    const now = Date.now();
    if (aiRunning) return;
    if (now - lastAiRun < 8000) {
      toast.info("AI is cooling down-try again in a few seconds.");
      return;
    }

    const payload =
      transactionsData?.items.map((tx) => ({
        id: tx.id,
        description: tx.description ?? tx.name ?? "Transaction",
        merchant: tx.merchant,
        amount: Number(tx.amount ?? 0),
        category: tx.category,
        postedAt: tx.postedAt,
      })) ?? [];

    if (!payload.length) {
      toast.info("No transactions to analyze yet.");
      return;
    }

    setAiRunning(true);

    try {
      const res = await fetch("/api/transactions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: payload }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          res.status === 429 ? data?.error ?? "AI is cooling down" : "AI categorization failed";
        toast.error(message);
        return;
      }

      toast.success("AI categories refreshed");
      await mutateTransactions();
      await mutateDashboard();
      setLastAiRun(Date.now());
    } catch (error) {
      console.error(error);
      toast.error("AI categorization failed");
    } finally {
      setAiRunning(false);
    }
  };

  const handleSyncPlaid = async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error ?? "Failed to sync Plaid");
        return;
      }

      const added = data?.added ?? 0;
      const modified = data?.modified ?? 0;
      toast.success(`Synced ${added} new and ${modified} updated`);
      await mutateTransactions();
      await mutateDashboard();
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync Plaid");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Photon Trail
          </p>
          <h1 className="text-3xl font-semibold">Cosmic spending overview</h1>
          <p className="text-sm text-slate-400">
            AI-enhanced categories with Plaid-backed transactions.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <PlaidLinkButton />
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleSyncPlaid}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Plaid"}
          </Button>
        </div>
      </div>

      <SummaryCards
        totalSpend={dashboardData?.totalSpend ?? 0}
        timeframe="last period"
        categories={dashboardData?.categories ?? []}
      />

      <Filters
        categories={categories}
        initialState={filters}
        onReset={() => {
          setFilters(defaultFilters);
          setPage(1);
        }}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryBreakdown categories={dashboardData?.categories ?? []} />
        <Timeline timeline={dashboardData?.timeline ?? {}} />
      </div>

      {showEmptyState ? (
        <EmptyState onSync={handleSyncPlaid} onAi={handleRefreshAi} />
      ) : (
        <Card className="glass">
          <CardContent className="p-4 sm:p-6">
            <TransactionsTable
              items={transactionsData?.items ?? []}
              page={transactionsData?.page ?? 1}
              pageCount={transactionsData?.pageCount ?? 1}
              onPageChange={setPage}
              onManualUpdate={handleManualUpdate}
              isLoading={transactionsLoading}
              onRefreshAi={handleRefreshAi}
              aiRunning={aiRunning}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
