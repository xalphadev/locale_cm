-- ============================================================================
-- 0030_payout_requests.sql — merchant withdrawal requests (content plane).
--
-- A merchant requests to withdraw their settled earnings (the merchant_payable
-- balance). This row is INTENT only — the actual money move is the money-plane
-- fn_payout_merchant() run by money_writer via the API on staff approval (SoD:
-- creator <> approver, balance-checked, idempotent, double-entry). The web app
-- (app_content) can never post the ledger itself; it only tracks the request.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payout_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid NOT NULL REFERENCES merchants(id),
  account_id      uuid REFERENCES merchant_accounts(id),     -- portal account that requested
  city_id         uuid NOT NULL,
  amount_minor    bigint NOT NULL CHECK (amount_minor > 0),
  status          text NOT NULL DEFAULT 'requested',         -- requested | paid | rejected
  ledger_txn_id   uuid,                                      -- set on settlement (money plane)
  idempotency_key text UNIQUE,
  note            text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  resolved_by     uuid,
  resolved_at     timestamptz
);
CREATE INDEX IF NOT EXISTS ix_payout_requests_pending  ON payout_requests(status) WHERE status='requested';
CREATE INDEX IF NOT EXISTS ix_payout_requests_merchant ON payout_requests(merchant_id);
