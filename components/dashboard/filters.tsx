"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@stargazers-stella/cosmic-ui";
import { formatCategoryLabel } from "@/lib/utils";

export type FilterState = {
  search?: string;
  category?: string;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
};

type FiltersProps = {
  categories: string[];
  onChange: (next: FilterState) => void;
  onReset: () => void;
  initialState?: FilterState;
};

export function Filters({ categories, onChange, onReset, initialState }: FiltersProps) {
  const [state, setState] = useState<FilterState>(
    initialState ?? {
      from: "",
      to: "",
    },
  );

  useEffect(() => {
    if (initialState) {
      setState(initialState);
    }
  }, [initialState]);

  const debouncedState = useMemo(() => state, [state]);

  useEffect(() => {
    const handle = setTimeout(() => onChange(debouncedState), 250);
    return () => clearTimeout(handle);
  }, [debouncedState, onChange]);

  const categoryOptions = useMemo(
    () => ["", ...categories.filter(Boolean)],
    [categories],
  );

  return (
    <div className="panel border-white/10 p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="muted-label mb-2">Filters</p>
          <h2 className="ui-heading text-2xl">Slice the ledger</h2>
        </div>
        <p className="text-sm text-[color:var(--text-muted)]">
          Search, narrow by amount, and focus the reporting window.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search merchant or memo"
          className="ui-field w-full"
          value={state.search ?? ""}
          onChange={(e) => setState((prev) => ({ ...prev, search: e.target.value }))}
        />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:col-span-2 lg:col-span-1">
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((cat) => {
              const active = (state.category ?? "") === cat;

              return (
                <button
                  key={cat || "all"}
                  type="button"
                  className={`filter-chip ${active ? "filter-chip-active" : ""}`}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      category: cat || "",
                    }))
                  }
                >
                  {cat ? formatCategoryLabel(cat) : "All categories"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Min $"
            className="ui-field"
            value={state.minAmount ?? ""}
            onChange={(e) => setState((prev) => ({ ...prev, minAmount: e.target.value }))}
          />
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Max $"
            className="ui-field"
            value={state.maxAmount ?? ""}
            onChange={(e) => setState((prev) => ({ ...prev, maxAmount: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="ui-field w-full"
            value={state.from ?? ""}
            onChange={(e) => setState((prev) => ({ ...prev, from: e.target.value }))}
          />
          <Input
            type="date"
            className="ui-field w-full"
            value={state.to ?? ""}
            onChange={(e) => setState((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2 sm:justify-end">
        <Button
          className="btn-secondary w-full sm:w-auto"
          variant="secondary"
          onClick={() => {
            setState(initialState ?? { from: "", to: "" });
            onReset();
          }}
        >
          Reset
        </Button>
        <Button
          className="btn-primary w-full sm:w-auto"
          onClick={() => onChange(state)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
