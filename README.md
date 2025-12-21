# Photon Trail

**WIP:** Photon Trail is actively under development. The core architecture is in place (auth, Plaid ingestion, DB, AI categorization), but features and polish are still evolving.

An AI-assisted personal finance dashboard: connect accounts with Plaid, store transactions in Neon/Postgres, and use OpenAI to suggest clean, human-friendly categories with confidence scores.

## Screenshots
Add your images to `docs/screenshots/` and replace these placeholders.

![Dashboard overview](docs/screenshots/dashboard.png)
![Transactions table + filters](docs/screenshots/transactions.png)
![AI categorization](docs/screenshots/ai-categorization.png)
![Plaid link flow](docs/screenshots/plaid-link.png)

## Key Features
- Plaid Link connection flow (no access tokens sent to the client).
- Postgres-backed persistence (Neon) with Drizzle ORM + migrations.
- Google OAuth sign-in (NextAuth) with DB sessions.
- AI categorization endpoint that validates responses with Zod before writing suggestions.
- Mobile-first dashboard UX with filters and inline category overrides.

## Tech Stack
- Framework: Next.js 14 App Router (React 18, TypeScript)
- UI: Tailwind CSS + `@stargazers-stella/cosmic-ui` + `sonner`
- Data: Neon Postgres + Drizzle ORM + `drizzle-kit`
- Auth: NextAuth (Google) + Drizzle adapter
- Integrations: Plaid (`react-plaid-link` + server routes)
- AI: OpenAI SDK (`openai`)
- Fetching: SWR
- Testing: Vitest

## How It Works
1. User signs in with Google (NextAuth + DB sessions).
2. Plaid Link creates a link token; the client completes linking and returns a public token.
3. Server exchanges the public token and stores an encrypted access token at rest.
4. A sync route pulls transactions incrementally using Plaid cursors.
5. An AI route batches transactions, requests category suggestions, validates JSON via Zod, and upserts suggestions.

## Quickstart (Local)
**Prereqs:** Node 20+ recommended, a Postgres database (Neon or local), Plaid sandbox keys.

```bash
cd Photon-Trail
npm install
cp .env.example .env.local
```

Run migrations + seed:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Start dev server:
```bash
npm run dev
```
Open `http://localhost:3000`.

## Configuration
Core env vars (see `.env.example`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string (`sslmode=require` for Neon) |
| `NEXTAUTH_URL` | Yes | App base URL |
| `NEXTAUTH_SECRET` | Yes | Session encryption/signing |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth |
| `PLAID_CLIENT_ID` | Optional | Plaid API |
| `PLAID_SECRET` | Optional | Plaid API |
| `PLAID_ENV` | Optional | `sandbox`/`development`/`production` |
| `PLAID_ENCRYPTION_KEY` | Yes (for Plaid) | Encrypt Plaid access tokens at rest (32+ chars) |
| `OPENAI_API_KEY` | Optional | Enable AI categorization |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4o-mini` |
| `AI_RATE_LIMIT_PER_MINUTE` | Optional | Simple throttling |

## Project Structure
- App & routes: `app/`
- Auth: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- DB: `lib/db.ts`, schema `db/schema.ts`, migrations `drizzle/`
- Plaid: `lib/plaid.ts`, API routes under `app/api/plaid/*`
- AI: `lib/ai.ts`, `app/api/transactions/ai/route.ts`
- UI: `components/dashboard/*`, `components/plaid-link-button.tsx`

## Security Notes
- Never store Plaid access tokens in the client; this project encrypts them at rest server-side.
- Never commit `.env.local`; use Vercel/hosted secrets in production.

## Deployment Notes (Vercel + Neon)
- Generate migrations locally (`npm run db:generate`) and commit `drizzle/`.
- Run migrations against production (`npm run db:migrate`) before `next build`.
- Set Plaid + OpenAI keys in Vercel, and ensure webhook URLs match your deployment domain.
