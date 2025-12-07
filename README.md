# Photon Trail (Next.js + Plaid + Neon + AI)

Vercel-ready app router project using Next.js, TypeScript, Tailwind, Cosmic UI, NextAuth (Google), **Drizzle** (Neon/Postgres), Plaid Link, and OpenAI-backed categorization.

## Quickstart
- Install deps: `npm install`
- Copy envs: `cp .env.example .env.local` and fill values (Neon, Google OAuth, Plaid, OpenAI).
- Generate SQL + migrate: `npm run db:generate` then `npm run db:migrate` (uses drizzle-kit with Neon)
- Seed sample data: `npm run db:seed`
- Dev server: `npm run dev` (http://localhost:3000)

## Environment variables
- `DATABASE_URL` - Neon/Postgres connection string with `sslmode=require`
- `NEXTAUTH_URL` - e.g., `http://localhost:3000`
- `NEXTAUTH_SECRET` - random string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - from Google OAuth credentials
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (`sandbox`|`development`|`production`), `PLAID_REDIRECT_URI`
- `PLAID_WEBHOOK_URL` (e.g., `https://your-app.vercel.app/api/plaid/webhook`), `PLAID_WEBHOOK_SECRET` (append to webhook as `?secret=...`)
- `PLAID_ENCRYPTION_KEY` - 32+ char secret used to encrypt Plaid access tokens at rest
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `AI_RATE_LIMIT_PER_MINUTE` (optional, defaults to 6)

## Auth
- NextAuth with Google provider + Drizzle adapter; sessions persisted in DB (`session.strategy = database`).
- Sign-in page at `/signin`. `pages.signIn` configured in `lib/auth.ts`.

## Database (Drizzle + Neon)
- Schema in `db/schema.ts` (users, NextAuth tables, Plaid items with encrypted tokens + cursors, transactions with Plaid IDs, AI suggestions).
- Config `drizzle.config.ts` with `DATABASE_URL`; migrations output to `drizzle/`.
- Seed script `scripts/seed.ts` (run via `npm run db:seed`) creates a demo user, Plaid item stub, and sample transactions.
- For Neon: provision a database, enable pooled connection string, set `DATABASE_URL`, then run `npm run db:migrate` in Vercel (or `drizzle-kit migrate`).

## Plaid
- Client: `components/plaid-link-button.tsx` uses Plaid Link (react-plaid-link). No access tokens ever sent to the client.
- Server: `/api/plaid/create-link-token` (POST) and `/api/plaid/exchange` (POST) securely exchange the public token and store only server-side (encrypted with `PLAID_ENCRYPTION_KEY`).
- Sync: `/api/plaid/sync` polls Plaid's `/transactions/sync` using stored cursors; `/api/plaid/webhook` can be set as your webhook target (`PLAID_WEBHOOK_URL`).
- Add your redirect URI in Plaid dashboard if using OAuth flows.

## AI categorization
- Route `/api/transactions/ai` calls `lib/ai.ts` (OpenAI chat completion with few-shot prompt, low temperature). Responses validated with Zod before upserting into `AiCategorySuggestion` and updating transactions.
- Triggered from the dashboard (“Refresh AI” button) or command palette (Cmd/Ctrl+K).

## Dashboard UX
- Mobile-first (tested at 390px). Uses Cosmic UI + Tailwind.
- Features: summary cards, filters (search, category, date, amount), category breakdown, timeline, paginated table with inline category overrides, AI confidence badge, Plaid link button.
- Command palette (Cmd/Ctrl+K), max-width dialogs on mobile, list max-heights to prevent overflow.

## Vercel deploy notes
- Add env vars above (including `DATABASE_URL` pointing to Neon).
- Ensure `OPENAI_API_KEY` and Plaid keys are set in Vercel dashboard.
- Run migrations in CI/CD with `npm run db:migrate` (drizzle-kit) before `next build`.

## Where things live
- App shell & routes: `app/layout.tsx`, `app/page.tsx`
- Auth config: `lib/auth.ts`, API: `app/api/auth/[...nextauth]/route.ts`
- DB client: `lib/db.ts`, schema `db/schema.ts`, data helpers `lib/data.ts`
- Plaid: `lib/plaid.ts`, routes `/api/plaid/*`
- AI: `lib/ai.ts`, `/api/transactions/ai`
- UI: `components/dashboard/*`, `components/command-palette.tsx`, `components/plaid-link-button.tsx`
- Styles: `app/globals.css`, Tailwind config `tailwind.config.ts` (includes Cosmic UI path)

## Deployment (Vercel + Neon)
1. Set all env vars in Vercel, including `DATABASE_URL`, Plaid keys, `PLAID_ENCRYPTION_KEY` (32+ chars), `PLAID_WEBHOOK_URL`, and OpenAI keys.
2. Generate migrations locally: `npm run db:generate` (commits `drizzle/`).
3. Apply migrations against Neon: `DATABASE_URL=... npm run db:migrate`.
4. Deploy to Vercel; ensure `PLAID_WEBHOOK_URL` matches your deployed domain and includes `?secret=PLAID_WEBHOOK_SECRET`.
5. Run `npm test` for validators/API route checks before shipping.
