-- ============================================================================
-- Migration #1 — part 0012: The final 5 canonical txn types → 22/22 complete
-- Source: docs/02b §A2 (MERCHANT_CLAWBACK / CHURN_SWEEP / OWNERSHIP_TRANSFER / CAMPAIGN_END / AFFILIATE).
--   fn_merchant_clawback — book an already-paid settlement back as merchant_receivable and
--                          restore the coin_backing (used by refund-after-payout).
--   fn_churn_sweep       — merchant closes with leftover escrow → sweep to platform_breakage.
--   fn_ownership_transfer— a place changes owner; migrate its merchant_payable old→new.
--   fn_campaign_end      — a sponsor campaign ends; forfeit leftover sponsor_budget.
--   fn_affiliate         — booking commission (Klook/TakeMeTour) → platform_revenue.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_merchant_clawback(p_merchant uuid, p_amount bigint, p_funder_key text, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_rcv uuid; a_back uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  IF v_city IS NULL THEN RAISE EXCEPTION 'merchant_clawback: merchant not found'; END IF;
  a_rcv  := get_or_create_account('merchant_receivable','merchant',p_merchant,NULL,NULL,'THB','DR',v_city);
  a_back := get_or_create_account('coin_backing','platform',NULL,p_funder_key,NULL,'THB','CR',v_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('MERCHANT_CLAWBACK',p_idem,md5(p_idem),v_city,p_funder_key,'merchant_clawback') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_rcv, 'DR',p_amount,'THB',p_funder_key,v_city),   -- merchant now owes us back
    (t,a_back,'CR',p_amount,'THB',p_funder_key,v_city);   -- backing restored (refund can re-credit)
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_churn_sweep(p_merchant uuid, p_idem text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_esc uuid; a_brk uuid; bal bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN RETURN 0; END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  a_esc := get_or_create_account('merchant_escrow','merchant',p_merchant,NULL,NULL,'THB','CR',v_city);
  bal := account_balance(a_esc);
  IF bal > 0 THEN
    a_brk := get_or_create_account('platform_breakage','platform',NULL,NULL,NULL,'THB','CR',v_city);
    INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
      VALUES('CHURN_SWEEP',p_idem,md5(p_idem),v_city,'merchant:'||p_merchant,'escheatment') RETURNING id INTO t;
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
      (t,a_esc,'DR',bal,'THB','merchant:'||p_merchant,v_city),
      (t,a_brk,'CR',bal,'THB','merchant:'||p_merchant,v_city);   -- leftover forfeited (legal: return-vs-keep)
    UPDATE escrow_wallets SET total_cached=0, settled_total_cached=0, available_cached=0,
           settled_available_cached=0, status='depleted', updated_at=now()
     WHERE owner_type='merchant' AND owner_id=p_merchant AND city_id=v_city;
  END IF;
  UPDATE merchants SET trust_state='closed', status='closed' WHERE id=p_merchant;
  RETURN bal;
END $$;

CREATE OR REPLACE FUNCTION fn_ownership_transfer(p_place uuid, p_new_merchant uuid, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; old_m uuid; a_old uuid; a_new uuid; bal bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT merchant_id, city_id INTO old_m, v_city FROM places WHERE id=p_place;
  IF v_city IS NULL THEN RAISE EXCEPTION 'ownership_transfer: place not found'; END IF;
  UPDATE places SET merchant_id=p_new_merchant, updated_at=now() WHERE id=p_place;
  IF old_m IS NULL THEN RETURN NULL; END IF;
  a_old := get_or_create_account('merchant_payable','merchant',old_m,NULL,NULL,'THB','CR',v_city);
  bal := account_balance(a_old);
  IF bal <= 0 THEN RETURN NULL; END IF;     -- nothing financial to migrate
  a_new := get_or_create_account('merchant_payable','merchant',p_new_merchant,NULL,NULL,'THB','CR',v_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,ref_id)
    VALUES('OWNERSHIP_TRANSFER',p_idem,md5(p_idem),v_city,'platform','ownership_transfer',p_place) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_old,'DR',bal,'THB','platform',v_city),     -- clear old owner's payable
    (t,a_new,'CR',bal,'THB','platform',v_city);     -- move it to the new owner
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_campaign_end(p_sponsor uuid, p_city uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; a_sb uuid; a_brk uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  a_sb := get_or_create_account('sponsor_budget','sponsor',p_sponsor,NULL,NULL,'THB','CR',p_city);
  IF account_balance(a_sb) < p_amount THEN
    RAISE EXCEPTION 'campaign_end: leftover % exceeds sponsor budget %', p_amount, account_balance(a_sb); END IF;
  a_brk := get_or_create_account('platform_breakage','platform',NULL,NULL,NULL,'THB','CR',p_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('CAMPAIGN_END',p_idem,md5(p_idem),p_city,'sponsor:'||p_sponsor,'escheatment') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_sb, 'DR',p_amount,'THB','sponsor:'||p_sponsor,p_city),
    (t,a_brk,'CR',p_amount,'THB','sponsor:'||p_sponsor,p_city);   -- forfeit leftover campaign budget
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_affiliate(p_city uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; a_bank uuid; a_rev uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',p_city);
  a_rev  := get_or_create_account('platform_revenue','platform',NULL,NULL,NULL,'THB','CR',p_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('AFFILIATE',p_idem,md5(p_idem),p_city,'platform','affiliate') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_bank,'DR',p_amount,'THB','platform',p_city),   -- commission received
    (t,a_rev, 'CR',p_amount,'THB','platform',p_city);   -- platform revenue
  RETURN t;
END $$;
