import "dotenv/config";
import { db } from "../lib/db";
import {
  aiCategorySuggestions,
  plaidItems,
  transactions,
  users,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret } from "../lib/crypto";

async function main() {
  if (!process.env.PLAID_ENCRYPTION_KEY) {
    process.env.PLAID_ENCRYPTION_KEY = "local-dev-key";
    console.warn("PLAID_ENCRYPTION_KEY not set; using insecure local-dev-key for seeding.");
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "demo@photontrail.app"));

  const userId =
    existingUser?.id ??
    (
      await db
        .insert(users)
        .values({
          email: "demo@photontrail.app",
          name: "Demo User",
          image: "https://avatars.githubusercontent.com/u/000?v=4",
        })
        .returning()
    )[0].id;

  const [existingItem] = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.id, "demo-item"));

  const itemId =
    existingItem?.id ??
    (
      await db
        .insert(plaidItems)
        .values({
          id: "demo-item",
          userId,
          institutionId: "ins_123",
          institutionName: "Demo Bank",
          accessTokenEncrypted: encryptSecret("access-sandbox-demo-token"),
          status: "active",
        })
        .returning()
    )[0].id;

  const now = new Date();
  const txPayload = [
    {
      name: "Blue Bottle Coffee",
      merchant: "Blue Bottle",
      description: "Flat white",
      amount: 6.5,
      category: "Coffee Shops",
      aiCategory: "Cafe",
      aiConfidence: 0.94,
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      name: "Whole Foods Market",
      merchant: "Whole Foods",
      description: "Groceries",
      amount: 82.73,
      category: "Groceries",
      aiCategory: "Groceries",
      aiConfidence: 0.91,
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6),
    },
    {
      name: "Lyft Ride",
      merchant: "Lyft",
      description: "Downtown to office",
      amount: 18.25,
      category: "Transport",
      aiCategory: "Rideshare",
      aiConfidence: 0.87,
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10),
    },
    {
      name: "Netflix",
      merchant: "Netflix",
      description: "Monthly subscription",
      amount: 15.99,
      category: "Entertainment",
      aiCategory: "Streaming",
      aiConfidence: 0.92,
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 28),
    },
  ];

  for (const tx of txPayload) {
    const [inserted] = await db
      .insert(transactions)
      .values({
        userId,
        plaidItemId: itemId,
        plaidId: `seed-${tx.name?.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
        amount: tx.amount,
        currency: "USD",
        name: tx.name,
        merchant: tx.merchant,
        description: tx.description,
        status: "posted",
        category: tx.category,
        aiCategory: tx.aiCategory,
        aiConfidence: tx.aiConfidence,
        postedAt: tx.postedAt,
        pending: false,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      await db.insert(aiCategorySuggestions).values({
        transactionId: inserted.id,
        category: tx.aiCategory ?? tx.category ?? "Uncategorized",
        confidence: tx.aiConfidence ?? 0.8,
        rationale: "Seeded sample",
        model: "seed",
        raw: tx,
      });
    }
  }

  console.log("Seed complete for user demo@photontrail.app");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
