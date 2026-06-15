# Database — migration #1 (foundation) + money functions

PostgreSQL 15+ with PostGIS (Supabase has both). Source of truth: [`../docs/04_mvp_scope_and_data_model.md`](../docs/04_mvp_scope_and_data_model.md) §2 and the canonical ledger [`../docs/02_canonical_ledger_pricing_legal.md`](../docs/02_canonical_ledger_pricing_legal.md) / [`../docs/02b_canonical_ledger_v1_1.md`](../docs/02b_canonical_ledger_v1_1.md).

## Files (apply in order)

| file | what |
|---|---|
| `migrations/0001_extensions_and_enums.sql` | postgis/pgcrypto + 40+ enums (25 `account_type`, 22 `txn_type`) |
| `migrations/0002_tables.sql` | 53 tables (Domains A–H + subsystems S1/S2/S4/S5/S6); forward-ref FKs as trailing `ALTER` |
| `migrations/0003_invariants_and_roles.sql` | append-only triggers · **A.8.1 sum-to-zero** · **A.8.1b clearing-flat** · currency-match · `money_writer` role |
| `migrations/0004_seed.sql` | 12 roles · place categories · CNX + Nimman · fail-closed config flags (COGS caps = null) |
| `migrations/0005_money_functions.sql` | `fn_prefund` · `fn_psp_settle` · `fn_fund_quest` · `fn_grant_coins` · `fn_redeem` (gate+post) |
| `migrations/0006_supply_and_earn.sql` | `fn_apply_proposal` · `fn_claim_verify` · `fn_advance_quest` (EARN→GRANT) · `fn_check_in` |
| `migrations/0007_money_lifecycle.sql` | `fn_expire` · `fn_payout_merchant` · `fn_refund` |
| `migrations/0008_recon_and_freeze.sql` | `fn_reconcile_solvency` · `fn_set_freeze` / `fn_clear_freeze` |
| `migrations/0009_agent_payout_tax.sql` | `fn_agent_payout` (3% WHT) · `fn_agent_clawback` · `fn_wht_remit` |
| `migrations/0010_subscription_vat.sql` | `fn_subscribe` · `fn_recognize_subscription` · `fn_vat_remit` |
| `migrations/0011_chargeback_recovery.sql` | `fn_chargeback` · `fn_recovery` · `fn_write_off` |

| `migrations/0012_remaining_txns.sql` | `fn_merchant_clawback` · `fn_churn_sweep` · `fn_ownership_transfer` · `fn_campaign_end` · `fn_affiliate` |

**ALL 22 canonical txn types implemented + verified** (`bash db/test/run-local.sh` → **49/49**).

## Run the app against real data (local dev)

```bash
bash db/test/setup-dev-db.sh      # persistent Postgres on :54400 + demo data → prints DATABASE_URL
cd apps/web && npm install && npm run dev   # admin at http://localhost:3002 (dashboard / places / money)
bash db/test/stop-dev-db.sh       # when done
```
(PostGIS is stubbed locally; on Supabase the migrations run unchanged.)

```bash
for f in db/migrations/0*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

## The ledger in one paragraph

Append-only **double-entry** in **satang/coin-minor (BIGINT)**, `1 COIN = 1 THB = 100 minor`. Every business event is one `ledger_transactions` row + ≥2 `ledger_entries` (each `amount_minor > 0`, sign carried by `direction` DR/CR). Two deferred constraint triggers fire at COMMIT: **A.8.1** (every txn nets to zero per currency) and **A.8.1b** (the `clearing` account nets to zero within every txn — catches single-sided legs that A.8.1 would miss). The ledger is immutable (UPDATE/DELETE blocked; reverse via `reverses_txn_id`). `money_writer` is the **only** role that may INSERT money rows. `coin_lots` is the FIFO burn anchor (`SELECT ... FOR UPDATE`). Coins mint only against **settled** escrow and only when the **COGS caps are set** (fail-closed). Redemption is blocked when funder == redeemer (**anti-self-redemption**, the BoT e-money boundary).

## Money loop (functions in 0005)

`fn_prefund` (merchant tops up escrow) → `fn_psp_settle` (cash lands, becomes mintable) → `fn_fund_quest` (reserve a quest pool) → `fn_grant_coins` (gate: COGS cap → fraud → solvency, then mint Coin backed 1:1) → `fn_redeem` (merchant-initiated FIFO burn, settle to the redeeming merchant minus take-rate).

## Tests

```bash
bash db/test/run-local.sh        # throwaway Postgres cluster; PostGIS stubbed locally
```
- `test/smoke.sql` — ledger invariants (balanced commit, A.8.1, A.8.1b, append-only, amount>0).
- `test/loop.sql` — full money loop + asserts mint balances, solvency (`coin_liability == coin_backing`), anti-self-redemption block, COGS fail-closed, take-rate split, global ledger integrity.

> Local note: PostGIS isn't required to validate the money keystone (it touches no geography). `run-local.sh` stubs `geography → text` for the local cluster only; the committed migration keeps PostGIS for Supabase.
