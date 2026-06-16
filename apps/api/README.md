# @locale/api — money-plane (NestJS)

The typed RPC layer over the canonical plpgsql money functions (`db/migrations/0005`). Per the [stack decision](../../docs/05_stack_decision.md) (C2 Hybrid-TS): **money-critical logic lives in the DB functions**; this service validates input, supplies the idempotency key, calls one gate+post fn per txn, and maps DB errors to HTTP. It does **no** money arithmetic and posts **no** ledger legs itself — the DB (append-only + sum-to-zero + clearing-flat + `money_writer`) is the referee.

## Run

```bash
cd apps/api
cp .env.example .env        # set DATABASE_URL to a role that has money_writer (session-mode pool)
pnpm install                # or npm install
pnpm start                  # money-plane on :3001
```

## Endpoints (all require an `Idempotency-Key` header; replay = no-op)

| method | path | calls |
|---|---|---|
| POST | `/money/prefund`    | `fn_prefund` |
| POST | `/money/psp-settle` | `fn_psp_settle` |
| POST | `/money/fund-quest` | `fn_fund_quest` |
| POST | `/money/grant`      | `fn_grant_coins` |
| POST | `/money/redeem`     | `fn_redeem` |

Error mapping: `anti-self-redemption` → 403 · `COGS caps unset` / `frozen` / `insufficient` / `cap exceeded` → 409 · other DB raise → 422.

Example:
```bash
curl -X POST localhost:3001/money/grant \
  -H 'content-type: application/json' -H 'idempotency-key: gr-abc123' \
  -d '{"userId":"<uuid>","questId":"<uuid>"}'
```

## Next (not yet wired)

- JWT scope-in-token auth guard (RBAC: city/merchant/territory claims) at the gateway.
- A separate **worker** process (recon / payout-batch / expire / tax) — doc 05.
- `fn_expire`, `fn_payout`, `fn_merchant_clawback` (the remaining txn types).
