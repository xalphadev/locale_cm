# Deploy — Soi Hop (Chiang Mai pilot)

Goes live on **Supabase** (Postgres + PostGIS, the canonical money store) + a host for the
NestJS **money-plane** + Vercel/Netlify for the two Next.js web apps. The Flutter mobile app
is the production consumer target (docs/05); the Next.js consumer here is the runnable web demo.

```
                ┌──────────────────────────────────────────────┐
  consumer web  │            Supabase Postgres + PostGIS         │
  admin  web ──►│  53 tables · ledger · 22 txns · supply · events│◄── money-plane API
  (SELECT-only) │  money writes ONLY via money_writer role       │    (money_writer)
                └──────────────────────────────────────────────┘
   reads: app_readonly                       writes: NestJS /money,/actions,/supply
```

## 1. Database (Supabase)

1. Create a Supabase project (region: Singapore — closest to TH).
2. Enable PostGIS: Dashboard → Database → Extensions → enable `postgis` (or let migration 0001
   run `CREATE EXTENSION IF NOT EXISTS postgis`). `pgcrypto` is enabled by default.
3. Grab the **direct** connection string (Settings → Database → Connection string → URI,
   port **5432**, NOT the 6543 transaction pooler — the money fns use `SELECT … FOR UPDATE`).
4. Apply the full schema + base seed + provision app roles:

   ```bash
   DATABASE_URL='postgres://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres' \
   MONEY_WRITER_PASSWORD='<pick-a-strong-one>' \
   READONLY_PASSWORD='<pick-another>' \
     bash db/deploy/apply-all.sh
   ```

   This applies migrations `0001…0015` verbatim (real PostGIS), gives `money_writer` a LOGIN
   for the API, and creates a SELECT-only `app_readonly` for the web apps. Seed includes the
   12 roles, place categories, Chiang Mai city + Nimman district, and **fail-closed config**
   (COGS caps are NULL → grants are blocked until you set them — see below). No demo/test data.

5. **Set the COGS caps before any reward can mint** (they are intentionally fail-closed):

   ```sql
   UPDATE platform_config SET value='100'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';
   UPDATE platform_config SET value='100000' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';
   ```
   (Values per docs/02 + OPEN_DECISIONS B1/B2 — tune to your incrementality model.)

## 2. Money-plane API (NestJS)

Host: Render / Railway / Fly.io (a long-running Node service; not serverless — it holds a pg pool).

```
DATABASE_URL=postgres://money_writer:<MONEY_WRITER_PASSWORD>@db.<ref>.supabase.co:5432/postgres
PORT=3001
NODE_ENV=production
```
Build & run: `npm ci && npm run build && node dist/main` (in `apps/api`). Expose HTTPS; note the URL.

## 3. Web apps (Vercel / Netlify)

Two Next.js apps (`apps/web` = admin/agent/counter back-office, `apps/consumer` = customer).
Both are server-rendered and read the DB as `app_readonly`; all writes go to the API.

```
DATABASE_URL=postgres://app_readonly:<READONLY_PASSWORD>@db.<ref>.supabase.co:5432/postgres
MONEY_API=https://<your-money-plane-host>
```
On Vercel set these as Environment Variables; `serverExternalPackages:['pg']` is already configured.

## 4. Verify the deploy

```bash
DATABASE_URL='postgres://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres' \
  psql "$DATABASE_URL" -f db/deploy/verify.sql
```
Expect: solvency recon = `pass`, 15 migrations' objects present, seed city `CNX`, 22 txn types.

## 5. Still TODO before public launch (not code-blocking, but real)

- **Auth** — wire Supabase Auth (LINE/Apple/Google/WeChat) + map JWT claims to `app_role`;
  replace the fixed demo identities (`apps/*/lib/db.ts` `DEMO_*`). Needs the cloud project.
- **RLS review** — confirm Row-Level Security policies for `anon`/`authenticated` before
  exposing the DB to the apps with real user JWTs (docs/04 §3).
- **Legal sign-offs** (docs/OPEN_DECISIONS §C): Coins-not-e-money, escrow-not-deposit,
  field-agent employment classification, ม.8 gambling check on any chance-based mechanic.
- **PSP** (PromptPay/Omise/2C2P) live keys for real escrow prefund/settlement.

## Local dev (no cloud)
`bash db/test/setup-dev-db.sh` spins a local Postgres on :54400 with the PostGIS-stubbed
migrations + demo data, then run each app with its `.env`. See README.md.
