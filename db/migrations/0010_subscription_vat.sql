-- ============================================================================
-- Migration #1 — part 0010: Subscription revenue + VAT (first-revenue path)
-- Source: docs/02b §A2.3 (SUBSCRIPTION / SUBSCRIPTION_RECOGNIZE / VAT_REMIT), docs/02 §C (VAT 7%).
--   fn_subscribe              — merchant buys a plan. VAT-inclusive 7% → vat_output_payable now;
--                               annual revenue is DEFERRED (deferred_revenue) and recognized monthly;
--                               monthly revenue is recognized immediately.
--   fn_recognize_subscription — move a slice deferred_revenue → platform_revenue.
--   fn_vat_remit              — remit output VAT (net of input VAT; carryforward if input>output).
-- Exercises the ratified accounts: deferred_revenue, vat_output_payable, vat_input_claimable, vat_carryforward.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_subscribe(
  p_merchant uuid, p_plan sub_plan, p_cycle billing_cycle, p_gross bigint, p_idem text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; sub uuid; v_city uuid; vat bigint; net bigint;
        a_bank uuid; a_vat uuid; a_def uuid; a_rev uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT ref_id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  IF v_city IS NULL THEN RAISE EXCEPTION 'subscribe: merchant not found'; END IF;
  IF p_gross <= 0 THEN RAISE EXCEPTION 'subscribe: gross must be > 0'; END IF;

  vat := round(p_gross * 7.0/107.0)::bigint;       -- VAT-inclusive 7% (default posture, docs §C)
  net := p_gross - vat;

  INSERT INTO subscriptions(merchant_id,city_id,plan,billing_cycle,status,current_period_end)
    VALUES(p_merchant,v_city,p_plan,p_cycle,'active',
           now() + CASE WHEN p_cycle='annual' THEN interval '1 year' ELSE interval '1 month' END)
    RETURNING id INTO sub;

  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',v_city);
  a_vat  := get_or_create_account('vat_output_payable','platform',NULL,NULL,NULL,'THB','CR',v_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,ref_id)
    VALUES('SUBSCRIPTION',p_idem,md5(p_idem),v_city,'merchant:'||p_merchant,'subscription',sub) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_bank,'DR',p_gross,'THB','merchant:'||p_merchant,v_city),
    (t,a_vat, 'CR',vat,    'THB','merchant:'||p_merchant,v_city);
  IF p_cycle='annual' THEN
    a_def := get_or_create_account('deferred_revenue','platform',NULL,NULL,NULL,'THB','CR',v_city);
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_def,'CR',net,'THB','merchant:'||p_merchant,v_city);   -- recognize over the term
  ELSE
    a_rev := get_or_create_account('platform_revenue','platform',NULL,NULL,NULL,'THB','CR',v_city);
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_rev,'CR',net,'THB','merchant:'||p_merchant,v_city);   -- monthly → immediate
  END IF;
  RETURN sub;
END $$;

CREATE OR REPLACE FUNCTION fn_recognize_subscription(p_subscription uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_def uuid; a_rev uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM subscriptions WHERE id=p_subscription;
  IF v_city IS NULL THEN RAISE EXCEPTION 'recognize: subscription not found'; END IF;
  a_def := get_or_create_account('deferred_revenue','platform',NULL,NULL,NULL,'THB','CR',v_city);
  IF account_balance(a_def) < p_amount THEN
    RAISE EXCEPTION 'recognize: deferred balance % < %', account_balance(a_def), p_amount;
  END IF;
  a_rev := get_or_create_account('platform_revenue','platform',NULL,NULL,NULL,'THB','CR',v_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,ref_id)
    VALUES('SUBSCRIPTION_RECOGNIZE',p_idem,md5(p_idem),v_city,'platform','subscription',p_subscription) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_def,'DR',p_amount,'THB','platform',v_city),     -- release deferred
    (t,a_rev,'CR',p_amount,'THB','platform',v_city);     -- recognize revenue
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_vat_remit(p_city uuid, p_idem text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE t uuid; a_out uuid; a_in uuid; a_bank uuid; a_cf uuid; out_bal bigint; in_bal bigint; remit bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN RETURN 0; END IF;
  a_out  := get_or_create_account('vat_output_payable','platform',NULL,NULL,NULL,'THB','CR',p_city);
  a_in   := get_or_create_account('vat_input_claimable','platform',NULL,NULL,NULL,'THB','DR',p_city);
  out_bal := account_balance(a_out);
  in_bal  := account_balance(a_in);
  IF out_bal = 0 AND in_bal = 0 THEN RETURN 0; END IF;
  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',p_city);
  remit  := out_bal - in_bal;

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('VAT_REMIT',p_idem,md5(p_idem),p_city,'platform','vat_remit') RETURNING id INTO t;
  -- clear output + input; the difference is paid to (remit>0) or carried forward from (remit<0) the Revenue Dept
  IF out_bal > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_out,'DR',out_bal,'THB','platform',p_city);
  END IF;
  IF in_bal > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_in,'CR',in_bal,'THB','platform',p_city);
  END IF;
  IF remit > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_bank,'CR',remit,'THB','platform',p_city);            -- pay net VAT
  ELSIF remit < 0 THEN
    a_cf := get_or_create_account('vat_carryforward','platform',NULL,NULL,NULL,'THB','DR',p_city);
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_cf,'DR',-remit,'THB','platform',p_city);            -- carry the input credit forward
  END IF;
  RETURN remit;
END $$;

GRANT INSERT, UPDATE ON subscriptions TO money_writer;
