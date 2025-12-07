import { cache } from "react";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  aiCategorySuggestions,
  plaidItems,
  transactions,
} from "@/db/schema";

export type TransactionFilters = {
  search?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
};

function buildWhere(userId: string, filters: TransactionFilters) {
  return and(
    eq(transactions.userId, userId),
    filters.from ? gte(transactions.postedAt, filters.from) : undefined,
    filters.to ? lte(transactions.postedAt, filters.to) : undefined,
    filters.minAmount !== undefined
      ? gte(transactions.amount, String(filters.minAmount))
      : undefined,
    filters.maxAmount !== undefined
      ? lte(transactions.amount, String(filters.maxAmount))
      : undefined,
    filters.category ? eq(transactions.category, filters.category) : undefined,
    filters.search
      ? or(
          ilike(transactions.name, `%${filters.search}%`),
          ilike(transactions.merchant, `%${filters.search}%`),
          ilike(transactions.description, `%${filters.search}%`),
        )
      : undefined,
  );
}

export const getDashboardData = cache(
  async (userId: string, filters: TransactionFilters = {}) => {
    const where = buildWhere(userId, filters);

    const [txs, grouped] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(where)
        .orderBy(desc(transactions.postedAt))
        .limit(50),
      db
        .select({
          category: transactions.category,
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(where)
        .groupBy(transactions.category),
    ]);

    const timeline = txs.reduce<Record<string, number>>((acc, tx) => {
      const key = tx.postedAt.toISOString().slice(0, 10);
      acc[key] = (acc[key] ?? 0) + Number(tx.amount);
      return acc;
    }, {});

    return {
      recent: txs.slice(0, 10).map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
        postedAt: tx.postedAt.toISOString(),
      })),
      categories: grouped.map((g) => ({
        category: g.category ?? "Uncategorized",
        total: Number(g.total ?? 0),
        count: Number(g.count ?? 0),
      })),
      totalSpend: txs.reduce((acc, tx) => acc + Number(tx.amount), 0),
      timeline,
    };
  },
);

export async function getPaginatedTransactions(
  userId: string,
  filters: TransactionFilters,
) {
  const page = filters.page ?? 1;
  const take = filters.limit ?? 20;
  const where = buildWhere(userId, filters);

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        plaidItemId: transactions.plaidItemId,
        amount: transactions.amount,
        currency: transactions.currency,
        name: transactions.name,
        merchant: transactions.merchant,
        description: transactions.description,
        status: transactions.status,
        category: transactions.category,
        aiCategory: transactions.aiCategory,
        aiConfidence: transactions.aiConfidence,
        manualCategory: transactions.manualCategory,
        postedAt: transactions.postedAt,
        pending: transactions.pending,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        plaidInstitution: plaidItems.institutionName,
      })
      .from(transactions)
      .leftJoin(plaidItems, eq(transactions.plaidItemId, plaidItems.id))
      .where(where)
      .orderBy(desc(transactions.postedAt))
      .limit(take)
      .offset((page - 1) * take),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  const safeItems = items.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
    postedAt: tx.postedAt.toISOString(),
    plaidItem: tx.plaidInstitution ? { institutionName: tx.plaidInstitution } : null,
  }));

  return {
    items: safeItems,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / take)),
  };
}

export async function updateManualCategory(
  userId: string,
  transactionId: string,
  manualCategory: string,
) {
  const [updated] = await db
    .update(transactions)
    .set({ manualCategory, category: manualCategory, updatedAt: new Date() })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Transaction not found");
  }

  return updated;
}

export async function upsertAiSuggestions(
  userId: string,
  suggestions: Array<{
    id: string;
    category: string;
    confidence: number;
    rationale?: string;
  }>,
) {
  const ids = suggestions.map((s) => s.id);
  if (!ids.length) return [];

  const valid = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));

  const validIds = new Set(valid.map((v) => v.id));
  const filtered = suggestions.filter((s) => validIds.has(s.id));
  if (!filtered.length) return [];

  for (const suggestion of filtered) {
    await db
      .update(transactions)
      .set({
        aiCategory: suggestion.category,
        aiConfidence: suggestion.confidence,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, suggestion.id));

    await db.insert(aiCategorySuggestions).values({
      transactionId: suggestion.id,
      category: suggestion.category,
      confidence: suggestion.confidence,
      rationale: suggestion.rationale,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      raw: suggestion,
    });
  }

  return filtered;
}
