import { pageWrites } from "./reconciliation/page";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { TransactionsSyncResponse } from "plaid";
import { getDb } from "./db";
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

function mapPlaidTransaction(
  tx: TransactionsSyncResponse["added"][number] | TransactionsSyncResponse["modified"][number],
  item: PlaidItemRow,
) {
  const postedDate = tx.authorized_date ?? tx.date ?? tx.datetime ?? null;
  const postedAt = postedDate ? new Date(`${postedDate}T00:00:00Z`) : new Date();
  const category =
    tx.personal_finance_category?.primary ??
    tx.category?.[0] ??
    tx.personal_finance_category?.detailed ??
    null;

  return {
    plaidId: tx.transaction_id,
    plaidItemId: item.id,
    userId: item.userId,
    amount: String(tx.amount),
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

  await getDb()
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

    for (const write of pageWrites(response.data)) {
      if (write.kind === "removed") {
        if (!write.ids.length) continue;
        await getDb().update(transactions)
          .set({ status: "removed", updatedAt: new Date() })
          .where(and(eq(transactions.plaidItemId, item.id), inArray(transactions.plaidId, write.ids)));
        removed += write.ids.length;
      } else {
        const count = await upsertTransactions(item, write.rows);
        if (write.kind === "added") added += count;
        else modified += count;
      }
    }
  }

  await getDb()
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
  const items = await getDb()
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
  const [item] = await getDb().select().from(plaidItems).where(eq(plaidItems.id, itemId));
  if (!item) {
    throw new Error("Plaid item not found");
  }

  return syncPlaidItem(item);
}
