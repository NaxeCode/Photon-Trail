import { authOptions } from "@/lib/auth";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getPaginatedTransactions, updateManualCategory } from "@/lib/data";
import { syncPlaidItem } from "@/lib/plaid-sync";
import { opening, packet, type BankEntry } from "@/lib/reconciliation/fixture";

const pg = new PGlite();
const database = drizzle(pg, { schema });
const { requestPage } = vi.hoisted(() => ({ requestPage: vi.fn() }));
// Vitest runs outside the React Server Components request cache.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/db", () => ({ getDb: () => database }));
vi.mock("@/lib/plaid", () => ({ plaidClient: { transactionsSync: requestPage } }));
vi.mock("@/lib/crypto", () => ({ decryptSecret: () => "fictional-token" }));

const providerRow = (row: BankEntry) => ({
  transaction_id: row.id,
  amount: row.cents / 100,
  category: [row.category],
  date: row.day,
  name: row.merchant,
  merchant_name: row.merchant,
  pending: false,
});
beforeAll(async () => {
  await pg.exec(await readFile("drizzle/0000_tearful_redwing.sql", "utf8"));
}, 20000);
afterAll(() => pg.close());

it("replays a failed paginated sync through the real SQL upserts, category query and checkpoint", async () => {
  const [user] = await database.insert(schema.users).values({ name: "Fixture operator" }).returning();
  const [item] = await database
    .insert(schema.plaidItems)
    .values({
      id: "fictional-item",
      userId: user.id,
      accessTokenEncrypted: "fixture",
      cursor: "opening",
    })
    .returning();
  const firstPage = {
    data: {
      added: opening.map(providerRow),
      modified: [],
      removed: [],
      next_cursor: "partial",
      has_more: true,
    },
  };
  const lastPage = {
    data: {
      added: packet.added.map(providerRow),
      modified: packet.modified.map(providerRow),
      removed: packet.removed,
      next_cursor: "closed",
      has_more: false,
    },
  };
  const savedItem = async () =>
    (await database.select().from(schema.plaidItems).where(eq(schema.plaidItems.id, item.id)))[0];
  requestPage.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(new Error("fixture interruption"));
  await expect(syncPlaidItem(item)).rejects.toThrow("fixture interruption");
  expect((await savedItem()).cursor).toBe("opening");
  const afterFailure = await database.select().from(schema.transactions);
  expect(afterFailure).toHaveLength(5);
  const proof = afterFailure.find((row) => row.plaidId === "NL-103")!;
  await updateManualCategory(user.id, proof.id, "Print production");

  for (let replay = 0; replay < 2; replay++) {
    requestPage.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(lastPage);
    // Re-deliver the same provider pages from the old checkpoint.
    await syncPlaidItem(item);
    expect((await savedItem()).cursor).toBe("closed");
    const rows = await database.select().from(schema.transactions);
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((row) => row.plaidId)).size).toBe(6);
    expect(rows.find((row) => row.id === proof.id)).toMatchObject({
      amount: "54.70",
      category: "Shopping",
      manualCategory: "Print production",
    });
    expect(rows.find((row) => row.plaidId === "NL-105")?.status).toBe("removed");
    const visible = await getPaginatedTransactions(user.id, {});
    expect(visible.total).toBe(5);
    const filtered = await getPaginatedTransactions(user.id, { category: "Print production" });
    expect(filtered.items.map((row) => row.id)).toEqual([proof.id]);
  }
  expect(requestPage.mock.calls.map(([input]) => input.cursor)).toEqual([
    "opening",
    "partial",
    "opening",
    "partial",
    "opening",
    "partial",
  ]);
}, 20000);

it("reads a database session from the migrated table via the configured auth adapter", async () => {
  const [user] = await database
    .insert(schema.users)
    .values({ email: "operator@example.invalid" })
    .returning();
  const adapter = authOptions.adapter!;
  const session = {
    userId: user.id,
    sessionToken: "fictional-test-session",
    expires: new Date("2030-01-01"),
  };
  await adapter.createSession!(session);
  const loaded = await adapter.getSessionAndUser!(session.sessionToken);
  expect(loaded?.session.userId).toBe(user.id);
  expect(loaded?.user.email).toBe("operator@example.invalid");
  await adapter.deleteSession!(session.sessionToken);
  expect(await adapter.getSessionAndUser!(session.sessionToken)).toBeNull();
});
