"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stargazers-stella/cosmic-ui";

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

  return (
    <div className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        placeholder="Search merchant or memo"
        className="w-full"
        value={state.search ?? ""}
        onChange={(e) => setState((prev) => ({ ...prev, search: e.target.value }))}
      />

      <Select
        value={state.category ?? ""}
        onValueChange={(value) =>
          setState((prev) => ({ ...prev, category: value === "all" ? "" : value }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Min $"
          value={state.minAmount ?? ""}
          onChange={(e) => setState((prev) => ({ ...prev, minAmount: e.target.value }))}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Max $"
          value={state.maxAmount ?? ""}
          onChange={(e) => setState((prev) => ({ ...prev, maxAmount: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          className="w-full"
          value={state.from ?? ""}
          onChange={(e) => setState((prev) => ({ ...prev, from: e.target.value }))}
        />
        <Input
          type="date"
          className="w-full"
          value={state.to ?? ""}
          onChange={(e) => setState((prev) => ({ ...prev, to: e.target.value }))}
        />
      </div>

      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <Button
          className="w-full sm:w-auto"
          variant="secondary"
          onClick={() => {
            setState(initialState ?? { from: "", to: "" });
            onReset();
          }}
        >
          Reset
        </Button>
        <Button
          className="w-full sm:w-auto"
          onClick={() => onChange(state)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
