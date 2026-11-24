export type TransactionPage<T> = {
  added: T[];
  modified: T[];
  removed: { transaction_id: string }[];
};

type Write<T> = { kind: "added" | "modified"; rows: T[] } | { kind: "removed"; ids: string[] };

// Additions and modifications are both upserts. A removal for the same ID wins last.
export function pageWrites<T>(page: TransactionPage<T>): Write<T>[] {
  return [
    { kind: "added", rows: page.added },
    { kind: "modified", rows: page.modified },
    { kind: "removed", ids: page.removed.map((row) => row.transaction_id) },
  ];
}

export function effectiveCategory(row: {
  manualCategory: string | null;
  category: string | null;
  aiCategory: string | null;
}) {
  return row.manualCategory ?? row.category ?? row.aiCategory ?? "Uncategorized";
}
