# @locale/web — admin / merchant back-office (Next.js)

Read-only back-office over the **verified ledger** (App Router, server components query Postgres directly). It connects as a **read-only** role (NOT `money_writer`) — all money mutations go through the [NestJS money-plane](../api/), never this client. Design: [docs/07_admin_console_and_missing_screens.md](../../docs/07_admin_console_and_missing_screens.md).

## Run

```bash
cd apps/web
cp .env.example .env        # DATABASE_URL → a SELECT-only role on the locale DB
pnpm install                # or npm install
pnpm dev                    # http://localhost:3002
```

To see live data, apply `db/migrations/` to a Postgres (PostGIS) and run the loop (e.g. the money-plane endpoints, or `db/test/*` against that DB).

## Pages (MVP)

| route | shows |
|---|---|
| `/`        | **System health** — solvency reconciliation status, outstanding Coin liability, escrow settled-available, platform revenue, place/quest counts, merchants by trust state |
| `/places`  | Places list (name, category, district, status, version, freshness, verified date) |
| `/money`   | Reconciliation runs (solvency anchor LHS/RHS/break), escrow wallets, recent ledger txns |

## Next (not yet built)

- Refine + auth (JWT scope-in-token, RBAC role-gated nav per doc 07).
- The moderation queue (change-proposal review), merchant verify console, payout/freeze controls — these **mutate**, so they call the money-plane API, not the DB directly.
