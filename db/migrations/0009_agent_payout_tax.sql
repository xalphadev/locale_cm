-- ============================================================================
-- Migration #1 — part 0009: Agent payout + withholding tax
-- Source: docs/02b §A2.3.1 (AGENT_PAYOUT / AGENT_CLAWBACK / WHT_REMIT).
--   fn_agent_payout    — pay a Field Agent: expense gross, hold 3% WHT + 30% reserve, net via clearing.
--                        SoD: created_by != approved_by. Accrues monthly WHT (50-ทวิ / ภงด.3).
--   fn_agent_clawback  — recover a bounty from the held reserve. NO single-sided clearing leg
--                        (the v1.1 fix: Dr agent_reserve / Cr platform_expense).
--   fn_wht_remit       — remit accumulated wht_payable to the Revenue Dept (nets wht_payable to 0).
-- Exercises the ratified tax accounts: platform_expense, wht_payable, agent_reserve.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_agent_payout(
  p_agent uuid, p_gross bigint, p_created_by uuid, p_approved_by uuid, p_idem text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; wht bigint; reserve bigint; net bigint;
        a_exp uuid; a_wht uuid; a_res uuid; a_clear uuid; a_bank uuid; period text;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  IF p_created_by = p_approved_by THEN RAISE EXCEPTION 'agent payout SoD: creator == approver (SEAM-3)'; END IF;
  SELECT city_id INTO v_city FROM agents WHERE id=p_agent;
  IF v_city IS NULL THEN RAISE EXCEPTION 'agent payout: agent not found'; END IF;
  PERFORM assert_not_frozen('PAYOUT', v_city);
  IF p_gross <= 0 THEN RAISE EXCEPTION 'agent payout: gross must be > 0'; END IF;

  wht     := round(p_gross * 0.03)::bigint;   -- 3% withholding (freelance, PND.3)
  reserve := round(p_gross * 0.30)::bigint;   -- 30% reserve-hold (released after clean window)
  net     := p_gross - wht - reserve;
  IF net <= 0 THEN RAISE EXCEPTION 'agent payout: net not positive'; END IF;

  a_exp   := get_or_create_account('platform_expense','platform',NULL,NULL,NULL,'THB','DR',v_city);
  a_wht   := get_or_create_account('wht_payable','platform',NULL,NULL,NULL,'THB','CR',v_city);
  a_res   := get_or_create_account('agent_reserve','agent',p_agent,NULL,NULL,'THB','CR',v_city);
  a_clear := get_or_create_account('clearing','platform',NULL,NULL,NULL,'THB','DR',v_city);
  a_bank  := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',v_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,created_by)
    VALUES('AGENT_PAYOUT',p_idem,md5(p_idem),v_city,'platform','agent_payout',p_created_by) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_exp,  'DR',p_gross,'THB','platform',v_city),
    (t,a_wht,  'CR',wht,    'THB','platform',v_city),
    (t,a_res,  'CR',reserve,'THB','platform',v_city),
    (t,a_clear,'CR',net,    'THB','platform',v_city),
    (t,a_clear,'DR',net,    'THB','platform',v_city),   -- clearing nets to zero (A.8.1b)
    (t,a_bank, 'CR',net,    'THB','platform',v_city);

  period := to_char(now(),'YYYY-MM');
  INSERT INTO agent_wht_ledger(agent_id,tax_period,gross_minor,wht_base_minor,wht_minor)
    VALUES(p_agent,period,p_gross,p_gross,wht)
  ON CONFLICT (agent_id,tax_period) DO UPDATE
    SET gross_minor = agent_wht_ledger.gross_minor + p_gross,
        wht_base_minor = agent_wht_ledger.wht_base_minor + p_gross,
        wht_minor = agent_wht_ledger.wht_minor + wht;
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_agent_clawback(p_agent uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_res uuid; a_exp uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM agents WHERE id=p_agent;
  a_res := get_or_create_account('agent_reserve','agent',p_agent,NULL,NULL,'THB','CR',v_city);
  IF account_balance(a_res) < p_amount THEN
    RAISE EXCEPTION 'agent clawback: insufficient reserve (have %, want %)', account_balance(a_res), p_amount;
  END IF;
  a_exp := get_or_create_account('platform_expense','platform',NULL,NULL,NULL,'THB','DR',v_city);
  -- NO clearing leg (v1.1 fix): a single-sided clearing here would trip A.8.1b → global FROZEN
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('AGENT_CLAWBACK',p_idem,md5(p_idem),v_city,'platform','reversal') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_res,'DR',p_amount,'THB','platform',v_city),
    (t,a_exp,'CR',p_amount,'THB','platform',v_city);
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_wht_remit(p_city uuid, p_idem text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE t uuid; a_wht uuid; a_bank uuid; bal bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN RETURN 0; END IF;
  a_wht  := get_or_create_account('wht_payable','platform',NULL,NULL,NULL,'THB','CR',p_city);
  bal := account_balance(a_wht);
  IF bal <= 0 THEN RETURN 0; END IF;
  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',p_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('WHT_REMIT',p_idem,md5(p_idem),p_city,'platform','wht_remit') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_wht, 'DR',bal,'THB','platform',p_city),     -- clear what we owe Revenue Dept
    (t,a_bank,'CR',bal,'THB','platform',p_city);     -- cash out
  UPDATE agent_wht_ledger SET state='remitted' WHERE state='accrued' AND tax_period=to_char(now(),'YYYY-MM');
  RETURN bal;
END $$;

GRANT INSERT, UPDATE ON agent_wht_ledger TO money_writer;
