# AGENTS.md

Photon Trail is a Next.js 14 (App Router) personal-finance app. It uses NextAuth (Google, database sessions via the Drizzle adapter), Plaid Link with cursor-based `/transactions/sync`, Drizzle ORM on Neon Postgres, and OpenAI category suggestions validated with Zod. API routes are in `app/api/**`, and domain logic is in `lib/` (`plaid-sync.ts`, `crypto.ts`, `ai.ts`, `data.ts`, `rate-limit.ts`, `validators.ts`).

Setup: `npm install`, `cp .env.example .env.local`, `npm run db:migrate`, `npm run dev`. Checks: `npm test` (Vitest), `npm run lint`, `npm run build`. Run `npm run db:generate` after any `db/schema.ts` change.

## Code Review Rules

This app handles bank credentials and financial data. Prioritize token safety, per-user isolation, and sync correctness. Formatting and lint are left to CI.

### Always flag (P0/P1)

- **Plaid access token exposure.** Access tokens must be encrypted with `encryptSecret` (AES-256-GCM, random 12-byte IV) before insert and decrypted only server-side in `lib/plaid-sync.ts`. Flag plaintext storage, logging, or a token in any API response or client component. Flag selecting `plaidItems.accessTokenEncrypted` into data returned to the browser.
- **Weakened crypto.** In `lib/crypto.ts`, flag IV reuse or a fixed IV, a dropped auth tag check, or a non-GCM mode. Flag a changed scrypt salt or key derivation without a re-encryption migration, because existing tokens would become undecryptable.
- **Cross-user data access.** Every read or write of `transactions`, `plaidItems`, or `aiCategorySuggestions` from a user route must be scoped by `session.user.id` (see `buildWhere`, `updateManualCategory`, and `syncPlaidForUser` in `lib/`). Flag queries on a client-supplied id without an `eq(..., userId)` condition. Also flag AI suggestions applied to ids the user doesn't own.
- **Item takeover on exchange.** In `app/api/plaid/exchange/route.ts`, the `onConflictDoUpdate` on `plaidItems.id` must not rebind or overwrite an item that belongs to a different user.
- **Unauthenticated webhook sync.** `app/api/plaid/webhook/route.ts` currently trusts a `?secret=` query param, and only when `PLAID_WEBHOOK_SECRET` is set. Flag changes that make it weaker. Flag any new code that trusts webhook body fields (such as `item_id`) for anything beyond triggering a sync of that item. The safe path is Plaid's signed JWT webhook verification (`Plaid-Verification` header) or a required secret compared in constant time.
- **Cursor sync correctness** (`syncPlaidItem`):
  - The cursor may be saved only after every page up to `has_more === false` has been applied. Flag checkpointing mid-loop without the page's writes, or saving the cursor when a page failed.
  - Upserts must stay idempotent on the unique `plaidId`.
  - Removed transactions stay soft-deleted (`status = 'removed'`), not hard-deleted.
  - Handle `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` by restarting from the original cursor, not by saving a partial one.
- **Money precision.** Flag amount math on JS floats that is written back to the DB, or sign-convention changes. In Plaid, a positive amount is an outflow.

### Flag when relevant

- New `app/api/**` routes that don't check `getServerSession(authOptions)` and return 401 first.
- OpenAI output written without Zod validation (`lib/validators.ts`), unbounded batch sizes sent to the model, or removed retry/backoff limits in `lib/ai.ts`. Transaction descriptions are untrusted input to the prompt.
- AI routes that bypass `lib/rate-limit.ts` or drop the `Retry-After` header on 429.
- `db/schema.ts` changes without a generated migration in `drizzle/`, and edits to already-applied migration SQL or `drizzle/meta` snapshots.
- A `manualCategory` override overwritten by AI suggestions. A manual choice must win.
- Secrets under `NEXT_PUBLIC_*`, or `.env.local` committed.

### Don't flag

- The in-memory, per-instance rate limiter, and sync running inline in the request or webhook handler. Both are documented limitations.
- `scripts/seed.*` using fake data.
- Style, formatting, or component structure.
