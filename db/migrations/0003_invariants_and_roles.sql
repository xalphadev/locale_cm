-- ============================================================================
-- Migration #1 — part 0003: Ledger invariants, append-only enforcement, money_writer
-- Source: docs/04 §2.4 + docs/02b §A2 (canonical ledger). This is the financial keystone.
-- ============================================================================

-- ── Append-only enforcement (A.8.9): no UPDATE/DELETE on the ledger; reverse instead ──
CREATE OR REPLACE FUNCTION ledger_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'append-only table: post a reversal instead of UPDATE/DELETE'; END $$;

REVOKE UPDATE, DELETE ON ledger_entries, ledger_transactions FROM PUBLIC;

CREATE TRIGGER trg_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
CREATE TRIGGER trg_ltxn_immutable    BEFORE UPDATE OR DELETE ON ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
-- Other append-only sources (audit chain, Sparks log, PDPA consent log, moderation log)
CREATE TRIGGER trg_audit_immutable      BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
CREATE TRIGGER trg_spark_immutable      BEFORE UPDATE OR DELETE ON spark_events
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
CREATE TRIGGER trg_consents_immutable   BEFORE UPDATE OR DELETE ON consents
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
CREATE TRIGGER trg_ticketev_immutable   BEFORE UPDATE OR DELETE ON ticket_events
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
CREATE TRIGGER trg_modaction_immutable  BEFORE UPDATE OR DELETE ON moderation_actions
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();

-- ── A.8.1: every txn nets to zero PER CURRENCY (deferred → fires at COMMIT) ──
CREATE OR REPLACE FUNCTION ledger_assert_txn_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bad_count bigint;
BEGIN
  SELECT count(*) INTO bad_count FROM (
    SELECT e.currency
    FROM ledger_entries e
    WHERE e.txn_id = NEW.txn_id
    GROUP BY e.currency
    HAVING SUM(CASE WHEN e.direction='DR' THEN e.amount_minor ELSE -e.amount_minor END) <> 0
  ) bad;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'A.8.1 violated: txn % not sum-to-zero per currency', NEW.txn_id;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_txn_balanced AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_assert_txn_balanced();

-- ── A.8.1b: clearing nets to zero WITHIN every txn (separate, first-class invariant) ──
-- Per-currency sum-to-zero can PASS while `clearing` is left single-sided (it nets against
-- another THB account). This branch joins entries→accounts to resolve account_type='clearing'
-- and rejects any txn that leaves clearing non-zero (e.g. a single-sided AGENT_CLAWBACK leg).
CREATE OR REPLACE FUNCTION ledger_assert_clearing_flat() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE net bigint;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN e.direction='DR' THEN e.amount_minor ELSE -e.amount_minor END),0)
    INTO net
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE e.txn_id = NEW.txn_id AND a.account_type = 'clearing';
  IF net <> 0 THEN
    RAISE EXCEPTION 'A.8.1b violated: clearing not flat-to-zero in txn % (net=%)', NEW.txn_id, net;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_clearing_flat AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_assert_clearing_flat();

-- ── currency match: ledger_entries.currency must equal accounts.currency (single-currency-per-account) ──
CREATE OR REPLACE FUNCTION ledger_assert_currency_match() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE acct_ccy currency;
BEGIN
  SELECT a.currency INTO acct_ccy FROM accounts a WHERE a.id = NEW.account_id;
  IF acct_ccy IS DISTINCT FROM NEW.currency THEN
    RAISE EXCEPTION 'leg currency % != account currency % (entry %)', NEW.currency, acct_ccy, NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_entry_currency_match BEFORE INSERT ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_assert_currency_match();

-- ── money_writer: the ONLY DB role allowed to write the money tables ──
-- The NestJS money-plane connects as (or is GRANTed) money_writer. App/RLS clients (anon,
-- authenticated) and even service_role for non-money paths must NOT INSERT here directly.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='money_writer') THEN
    CREATE ROLE money_writer NOLOGIN;
  END IF;
END $$;

REVOKE INSERT ON ledger_transactions, ledger_entries, accounts, coin_lots, coin_grants,
                 escrow_wallets, escrow_locks, redemptions, payout_batches, payout_items
       FROM PUBLIC;
GRANT  INSERT, SELECT ON ledger_transactions, ledger_entries, accounts, coin_lots, coin_grants,
                 escrow_wallets, escrow_locks, redemptions, payout_batches, payout_items
       TO money_writer;
GRANT  USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO money_writer;

-- NOTE (next migration 0005, from docs/04 §3): enable RLS + scope-in-JWT policies on
-- public-readable tables (places/quests/deals read; merchant sees own; agent sees territory;
-- customer sees own coin_lots/spark_balances). Money tables stay money_writer-only (no client write).
