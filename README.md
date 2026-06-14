# Soi Hop — Chiang Mai hyperlocal cross-merchant loyalty app

Monorepo. Build follows the design in [`docs/`](docs/README.md) (12 docs). Stack decision: **C2 Hybrid-TS** — Flutter (mobile) · Next.js+Refine (web) · **NestJS money-plane** (TS) · **PostgreSQL** (Supabase) with plpgsql gate functions + DB invariants. See [docs/05_stack_decision.md](docs/05_stack_decision.md).

## Status — build in progress (Step 1: DB foundation)

| layer | dir | status |
|---|---|---|
| **Database (migration #1)** | [`db/migrations/`](db/migrations/) | ✅ 53 tables + ledger invariants + seed |
| **Money functions** (gate+post) | [`db/migrations/0005...`](db/migrations/) | ✅ prefund/settle/fund_quest/grant/redeem |
| **Supply + EARN functions** | [`db/migrations/0006...`](db/migrations/) | ✅ apply_proposal (moat writer+SoD) · claim_verify (trust state) · advance_quest (EARN→GRANT bridge) · check_in (geofence) |
| **Money lifecycle** | [`db/migrations/0007...`](db/migrations/) | ✅ expire (breakage→funder) · payout_merchant (SoD, clearing-flat) · refund (reverse REDEEM) |
| **S6 recon + freeze** | [`db/migrations/0008...`](db/migrations/) | ✅ reconcile_solvency (invariants + drift detect) · set/clear_freeze (fail-closed gate) |
| **Agent payout + tax** | [`db/migrations/0009...`](db/migrations/) | ✅ agent_payout (3% WHT + 30% reserve, SoD) · agent_clawback · wht_remit |
| **Subscription + VAT** | [`db/migrations/0010...`](db/migrations/) | ✅ subscribe (annual→deferred + 7% VAT) · recognize_subscription · vat_remit |
| **Acceptance tests** | [`db/test/`](db/test/) | ✅ **14 txn types + supply + recon verified** (`bash db/test/run-local.sh` → **39/39**) |
| **API** (NestJS money-plane) | [`apps/api/`](apps/api/) | ✅ scaffolded — typed RPC + 5 endpoints (needs `pnpm install` + live DB to run) |
| **Web** (Next.js admin) | [`apps/web/`](apps/web/) | ✅ scaffolded — read-only back-office: dashboard (solvency/escrow/revenue), places, money & recon |
| Mobile (Flutter) | `apps/mobile/` | ⏳ next |

## The non-negotiables (from the design)

1. **All money flows through the append-only double-entry ledger** — unit = satang (BIGINT), `1 COIN = 1 THB`. No mutable points integer anywhere. See `db/migrations/0003_invariants_and_roles.sql`.
2. **Mint Coins only against settled escrow cash** + per-redemption / per-merchant-monthly **COGS caps** (fail-closed until set).
3. **`money_writer` is the only DB role that may INSERT into the ledger** — app/RLS clients cannot write money tables directly.
4. **Anti-self-redemption** (funder ≠ redeemer, device/payment/kyc hash arms) = the BoT e-money compliance boundary.
5. `merchant_id` + `city_id` on every business table from migration #1 (multi-tenant + multi-city).

## Getting started (DB)

```bash
# requires Docker + Supabase CLI (or any Postgres 15+ with PostGIS)
# apply migration #1 (see db/README.md for details)
psql "$DATABASE_URL" -f db/migrations/0001_extensions_and_enums.sql
psql "$DATABASE_URL" -f db/migrations/0002_tables.sql
psql "$DATABASE_URL" -f db/migrations/0003_invariants_and_roles.sql
psql "$DATABASE_URL" -f db/migrations/0004_seed.sql
```

See [`db/README.md`](db/README.md) for the schema map, the ledger model, and the acceptance tests.

## Before going live (from docs/OPEN_DECISIONS.md)

- Set COGS caps `REWARD_PER_REDEMPTION_CAP_THB` / `MERCHANT_MONTHLY_COGS_CAP_THB` (real GRANT is fail-closed until set).
- Thai legal sign-off: e-money / escrow / gambling / agent-classification / PDPA / VAT.
- See the full tracker: [docs/OPEN_DECISIONS.md](docs/OPEN_DECISIONS.md) and the build plan: [docs/09_build_roadmap.md](docs/09_build_roadmap.md).
