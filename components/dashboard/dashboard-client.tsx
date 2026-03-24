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
  const applyOptimisticCategory = (
    current:
      | {
          items: TransactionRow[];
          page: number;
          pageCount: number;
          total: number;
        }
      | undefined,
    transactionId: string,
    category: string,
  ) => {
    if (!current) return current;

    return {
      ...current,
      items: current.items.map((tx) =>
        tx.id === transactionId
          ? {
              ...tx,
              manualCategory: category,
              category,
            }
          : tx,
      ),
    };
  };

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
    isValidating: dashboardValidating,
  } = useSWR(`/api/dashboard?${query}`, undefined, {
    fallbackData: initialDashboard,
    keepPreviousData: true,
  });

  const {
    data: transactionsData,
    mutate: mutateTransactions,
    isValidating: transactionsLoading,
    error: transactionsError,
  } = useSWR(`/api/transactions?${query}`, undefined, {
    fallbackData: initialTransactions,
    keepPreviousData: true,
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
      let updatedCategory = manualCategory;

      await mutateTransactions(
        async (current) => {
          const response = await fetch("/api/transactions/update-category", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: id, manualCategory }),
          });

          if (!response.ok) {
            throw new Error("Could not update category");
          }

          const updated = await response.json();
          updatedCategory = updated.manualCategory ?? updated.category ?? manualCategory;

          return applyOptimisticCategory(current, id, updatedCategory);
        },
        {
          optimisticData: (current) => applyOptimisticCategory(current, id, manualCategory),
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        },
      );
      void mutateTransactions();
      void mutateDashboard();
      return updatedCategory;
    } catch (error) {
      console.error(error);
      toast.error("Could not update category");
      throw error;
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

      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];

      await mutateTransactions(
        (current) => {
          if (!current || suggestions.length === 0) return current;

          return {
            ...current,
            items: current.items.map((tx) => {
              const suggestion = suggestions.find(
                (item: { transactionId: string }) => item.transactionId === tx.id,
              );

              if (!suggestion) return tx;

              return {
                ...tx,
                aiCategory: suggestion.label ?? tx.aiCategory,
                aiConfidence:
                  typeof suggestion.confidence === "number" ? suggestion.confidence : tx.aiConfidence,
              };
            }),
          };
        },
        { populateCache: true, revalidate: false },
      );

      toast.success("AI categories refreshed");
      void mutateTransactions();
      void mutateDashboard();
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
      void mutateTransactions();
      void mutateDashboard();
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync Plaid");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <section className="section-shell">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="eyebrow">Photon Trail</p>
            <div className="space-y-3">
              <h1 className="ui-heading text-4xl sm:text-5xl">
                Spending, framed like an editorial report.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)] sm:text-base">
                Review movement, pressure-test AI categories, and sync fresh activity without
                losing the signal in a generic finance UI.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[color:var(--text-muted)]">
                {transactionsData?.total ?? initialTransactions.total} transactions in view
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[color:var(--text-muted)]">
                AI ready for manual review
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PlaidLinkButton />
            <Button
              variant="secondary"
              className="btn-primary w-full sm:w-auto"
              onClick={handleSyncPlaid}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync Plaid"}
            </Button>
          </div>
        </div>
      </section>

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

      <div className="dashboard-grid">
        <CategoryBreakdown categories={dashboardData?.categories ?? []} />
        <Timeline timeline={dashboardData?.timeline ?? {}} />
      </div>

      {showEmptyState ? (
        <EmptyState onSync={handleSyncPlaid} onAi={handleRefreshAi} />
      ) : (
        <Card className="panel overflow-hidden border-white/10">
          <CardContent className="p-4 sm:p-6">
            <TransactionsTable
              items={transactionsData?.items ?? []}
              page={transactionsData?.page ?? 1}
              pageCount={transactionsData?.pageCount ?? 1}
              onPageChange={setPage}
              onManualUpdate={handleManualUpdate}
              isLoading={!transactionsData && transactionsLoading}
              isRefreshing={transactionsLoading || dashboardValidating}
              onRefreshAi={handleRefreshAi}
              aiRunning={aiRunning}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
