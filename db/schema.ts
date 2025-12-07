import {
  boolean,
  doublePrecision,
  integer,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
},
  (table) => ({
    providerAccountKey: uniqueIndex("accounts_provider_providerAccountId_key").on(
      table.provider,
      table.providerAccountId,
    ),
  }));

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
    tokenKey: uniqueIndex("verificationTokens_token_key").on(table.token),
  }),
);

export const plaidItems = pgTable("plaidItems", {
  id: text("id").primaryKey(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  institutionId: text("institutionId"),
  institutionName: text("institutionName"),
  accessTokenEncrypted: text("accessTokenEncrypted").notNull(),
  status: text("status").default("active").notNull(),
  mask: text("mask"),
  cursor: text("cursor"),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  userIdx: index("plaidItems_user_idx").on(table.userId),
}));

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  plaidItemId: text("plaidItemId").references(() => plaidItems.id, {
    onDelete: "set null",
  }),
  plaidId: text("plaidId"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  name: text("name"),
  merchant: text("merchant"),
  description: text("description"),
  status: text("status").default("posted").notNull(),
  category: text("category"),
  aiCategory: text("aiCategory"),
  aiConfidence: doublePrecision("aiConfidence"),
  manualCategory: text("manualCategory"),
  postedAt: timestamp("postedAt", { withTimezone: true }).notNull(),
  pending: boolean("pending").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  plaidIdKey: uniqueIndex("transactions_plaidId_key").on(table.plaidId),
  userPostedIdx: index("transactions_user_posted_idx").on(table.userId, table.postedAt),
  userCategoryIdx: index("transactions_user_category_idx").on(table.userId, table.category),
}));

export const aiCategorySuggestions = pgTable("aiCategorySuggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transactionId")
    .references(() => transactions.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  rationale: text("rationale"),
  model: text("model"),
  raw: jsonb("raw"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  plaidItems: many(plaidItems),
  transactions: many(transactions),
}));

export const plaidItemRelations = relations(plaidItems, ({ one, many }) => ({
  user: one(users, { fields: [plaidItems.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  plaidItem: one(plaidItems, {
    fields: [transactions.plaidItemId],
    references: [plaidItems.id],
  }),
  suggestions: many(aiCategorySuggestions),
}));

export const suggestionRelations = relations(aiCategorySuggestions, ({ one }) => ({
  transaction: one(transactions, {
    fields: [aiCategorySuggestions.transactionId],
    references: [transactions.id],
  }),
}));
