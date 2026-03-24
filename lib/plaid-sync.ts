import { and, eq, inArray, sql } from "drizzle-orm";
import type { TransactionsSyncResponse } from "plaid";
import { db } from "./db";
import { decryptSecret } from "./crypto";
import { plaidClient } from "./plaid";
import { plaidItems, transactions } from "@/db/schema";

type PlaidItemRow = typeof plaidItems.$inferSelect;

type SyncSummary = {
  itemId: string;
  added: number;
  modified: number;
  removed: number;
};

/**
 * Minimal subset of the Plaid transaction object that this app consumes.
 * We define this narrower type so the mapping is explicit and easy to reason about.
 */
export type PlaidTransactionMinimal = {
  transaction_id: string;
  amount: number;
  iso_currency_code?: string | null;
  name?: string | null;
  merchant_name?: string | null;
  original_description?: string | null;
  pending?: boolean;
  date?: string | null; // YYYY-MM-DD
  authorized_date?: string | null; // YYYY-MM-DD
  datetime?: string | null; // ISO datetime when available
  category?: string[] | null;
  personal_finance_category?: { primary?: string | null; detailed?: string | null } | null;
};

function mapPlaidTransaction(
  tx: TransactionsSyncResponse["added"][number] | TransactionsSyncResponse["modified"][number] | PlaidTransactionMinimal,
  item: PlaidItemRow,
) {
  // Prefer `datetime` (preserves time-of-day). If missing, fall back to
  // `authorized_date` or `date` and treat them as midnight UTC. If no date is
  // present, use epoch (1970-01-01) to avoid inserting misleading "now" timestamps.
  let postedAt: Date;
  if (tx.datetime) {
    // `datetime` is expected to be an ISO-like string; let Date parse it.
    postedAt = new Date(tx.datetime as string);
  } else {
    const dateStr = (tx.authorized_date ?? tx.date) as string | undefined | null;
    if (dateStr) {
      postedAt = new Date(`${dateStr}T00:00:00Z`);
    } else {
      postedAt = new Date(0);
    }
  }

  const category =
    tx.personal_finance_category?.primary ??
    tx.category?.[0] ??
    tx.personal_finance_category?.detailed ??
    null;

  return {
    plaidId: tx.transaction_id,
    plaidItemId: item.id,
    userId: item.userId,
    amount: tx.amount,
    currency: tx.iso_currency_code ?? "USD",
    name: tx.name ?? tx.merchant_name ?? "Transaction",
    merchant: tx.merchant_name,
    description: tx.original_description ?? tx.name,
    status: tx.pending ? "pending" : "posted",
    category,
    postedAt,
    pending: Boolean(tx.pending),
    updatedAt: new Date(),
  };
}

async function upsertTransactions(
  item: PlaidItemRow,
  payloads: TransactionsSyncResponse["added"] | TransactionsSyncResponse["modified"],
) {
  if (!payloads.length) return 0;

  const rows = payloads.map((tx) => mapPlaidTransaction(tx, item));

  await db
    .insert(transactions)
    .values(rows)
    .onConflictDoUpdate({
      target: transactions.plaidId,
      set: {
        amount: sql`excluded.amount`,
        currency: sql`excluded.currency`,
        name: sql`excluded.name`,
        merchant: sql`excluded.merchant`,
        description: sql`excluded.description`,
        status: sql`excluded.status`,
        category: sql`excluded.category`,
        postedAt: sql`excluded."postedAt"`,
        pending: sql`excluded.pending`,
        plaidItemId: sql`excluded."plaidItemId"`,
        updatedAt: new Date(),
      },
    });

  return rows.length;
}

export async function syncPlaidItem(item: PlaidItemRow): Promise<SyncSummary> {
  const accessToken = decryptSecret(item.accessTokenEncrypted);

  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 100,
    });

    cursor = response.data.next_cursor;
    hasMore = response.data.has_more;

    added += await upsertTransactions(item, response.data.added);
    modified += await upsertTransactions(item, response.data.modified);

    if (response.data.removed?.length) {
      const ids = response.data.removed.map((tx) => tx.transaction_id);
      await db
        .update(transactions)
        .set({ status: "removed", updatedAt: new Date() })
        .where(inArray(transactions.plaidId, ids));
      removed += ids.length;
    }
  }

  await db
    .update(plaidItems)
    .set({
      cursor: cursor ?? null,
      lastSyncedAt: new Date(),
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(plaidItems.id, item.id));

  return { itemId: item.id, added, modified, removed };
}

export async function syncPlaidForUser(userId: string, itemIds?: string[]) {
  const items = await db
    .select()
    .from(plaidItems)
    .where(
      and(
        eq(plaidItems.userId, userId),
        itemIds?.length ? inArray(plaidItems.id, itemIds) : undefined,
      ),
    );

  let summary = { items: items.length, added: 0, modified: 0, removed: 0 };

  for (const item of items) {
    const result = await syncPlaidItem(item);
    summary = {
      items: summary.items,
      added: summary.added + result.added,
      modified: summary.modified + result.modified,
      removed: summary.removed + result.removed,
    };
  }

  return summary;
}

export async function syncPlaidItemById(itemId: string) {
  const [item] = await db.select().from(plaidItems).where(eq(plaidItems.id, itemId));
  if (!item) {
    throw new Error("Plaid item not found");
  }

  return syncPlaidItem(item);
}
