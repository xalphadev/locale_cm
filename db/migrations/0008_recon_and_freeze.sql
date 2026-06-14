-- ============================================================================
-- Migration #1 — part 0008: S6 reconciliation + freeze (money-integrity backbone)
-- Source: docs/03 §S6, docs/02b §A2.5/§A2.7.
--   fn_reconcile_solvency — assert the canonical invariants across the WHOLE ledger and
--     record a reconciliation_runs row; pass | break_detected. The nightly job calls this and,
--     on break, sets the freeze (fail-closed).
--   fn_set_freeze / fn_clear_freeze — drive platform_freeze_state (the gate every money fn reads).
-- ============================================================================

-- ── helper: signed balance summed over all accounts of a type in a city ──
CREATE OR REPLACE FUNCTION _type_balance(p_type account_type, p_currency currency, p_city uuid)
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(CASE WHEN e.direction = a.normal_balance THEN e.amount_minor ELSE -e.amount_minor END),0)
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE a.account_type = p_type AND a.currency = p_currency AND a.city_id = p_city;
$$;

CREATE OR REPLACE FUNCTION fn_reconcile_solvency(p_city uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE liab bigint; backing bigint; outstanding bigint; offenders bigint; ok boolean; brk bigint; st text;
BEGIN
  -- (1) global double-entry integrity: txns that don't net to zero per currency
  SELECT count(*) INTO offenders FROM (
    SELECT txn_id, currency FROM ledger_entries WHERE city_id=p_city GROUP BY txn_id, currency
    HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;

  -- (2) Coin outstanding == coin_liability (ledger) ; (3) liability backed 1:1 by THB coin_backing
  liab        := _type_balance('coin_liability','COIN',p_city);
  backing     := _type_balance('coin_backing','THB',p_city);
  SELECT COALESCE(SUM(remaining_minor),0) INTO outstanding
    FROM coin_lots WHERE city_id=p_city AND state='active';

  ok  := (offenders = 0) AND (liab = outstanding) AND (liab = backing);
  brk := GREATEST(abs(liab - outstanding), abs(liab - backing));
  st  := CASE WHEN ok THEN 'pass' ELSE 'break_detected' END;

  INSERT INTO reconciliation_runs(city_id,run_date,kind,status,ledger_high_seq,anchor_lhs_minor,anchor_rhs_minor,break_minor)
    VALUES(p_city, current_date, 'daily_solvency', st,
           (SELECT COALESCE(max(seq),0) FROM ledger_entries), liab, backing, brk);

  RETURN 'status='||st||' coin_liability='||liab||' backing='||backing||' outstanding='||outstanding
       ||' offenders='||offenders||' break='||brk;
END $$;

-- ── freeze control (the gate every money fn reads via assert_not_frozen) ──
CREATE OR REPLACE FUNCTION fn_set_freeze(p_scope text, p_ops text[], p_event uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO platform_freeze_state(scope_key,frozen_ops,freeze_event_id)
    VALUES(p_scope,p_ops,p_event)
  ON CONFLICT (scope_key) DO UPDATE SET frozen_ops=p_ops, freeze_event_id=p_event, updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION fn_clear_freeze(p_scope text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE platform_freeze_state SET frozen_ops='{}', updated_at=now() WHERE scope_key=p_scope;
END $$;

GRANT INSERT, UPDATE ON platform_freeze_state TO money_writer;
GRANT INSERT ON reconciliation_runs TO money_writer;
