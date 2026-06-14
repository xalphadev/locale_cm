-- ============================================================================
-- Migration #1 — part 0011: Chargeback / Recovery / Write-off (bad-debt lifecycle)
-- Source: docs/02b §A2.3 + §A2.6 (CHARGEBACK / RECOVERY / WRITE_OFF).
-- When a PSP chargeback reverses a merchant's prefund AFTER some escrow was already spent
-- (minted into outstanding Coin), the platform absorbs the shortfall as merchant_receivable
-- (a bad-debt exposure that S6 watches), freezes the merchant's payout, then either recovers
-- the cash (RECOVERY) or gives up (WRITE_OFF → bad_debt_expense).
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_chargeback(p_merchant uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_esc uuid; a_rcv uuid; a_bank uuid;
        esc_bal bigint; from_esc bigint; shortfall bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  IF v_city IS NULL THEN RAISE EXCEPTION 'chargeback: merchant not found'; END IF;

  a_esc  := get_or_create_account('merchant_escrow','merchant',p_merchant,NULL,NULL,'THB','CR',v_city);
  esc_bal := account_balance(a_esc);
  from_esc  := LEAST(GREATEST(esc_bal,0), p_amount);   -- reverse from remaining escrow first
  shortfall := p_amount - from_esc;                    -- the part already spent → we are owed it
  a_rcv  := get_or_create_account('merchant_receivable','merchant',p_merchant,NULL,NULL,'THB','DR',v_city);
  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',v_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('CHARGEBACK',p_idem,md5(p_idem),v_city,'merchant:'||p_merchant,'recovery') RETURNING id INTO t;
  IF from_esc > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_esc,'DR',from_esc,'THB','merchant:'||p_merchant,v_city);
  END IF;
  IF shortfall > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_rcv,'DR',shortfall,'THB','merchant:'||p_merchant,v_city);
  END IF;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
    VALUES(t,a_bank,'CR',p_amount,'THB','merchant:'||p_merchant,v_city);   -- cash clawed back by the bank

  UPDATE escrow_wallets SET total_cached=total_cached-from_esc, settled_total_cached=settled_total_cached-from_esc,
         available_cached=available_cached-from_esc, settled_available_cached=settled_available_cached-from_esc, updated_at=now()
   WHERE owner_type='merchant' AND owner_id=p_merchant AND city_id=v_city;
  UPDATE merchants SET payout_frozen=true, trust_state='payout_frozen' WHERE id=p_merchant;
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_recovery(p_merchant uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_rcv uuid; a_bank uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  a_rcv  := get_or_create_account('merchant_receivable','merchant',p_merchant,NULL,NULL,'THB','DR',v_city);
  IF account_balance(a_rcv) < p_amount THEN
    RAISE EXCEPTION 'recovery: amount % exceeds receivable %', p_amount, account_balance(a_rcv); END IF;
  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',v_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('RECOVERY',p_idem,md5(p_idem),v_city,'merchant:'||p_merchant,'recovery') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_bank,'DR',p_amount,'THB','merchant:'||p_merchant,v_city),    -- merchant pays it back
    (t,a_rcv, 'CR',p_amount,'THB','merchant:'||p_merchant,v_city);    -- receivable reduced
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION fn_write_off(p_merchant uuid, p_amount bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_rcv uuid; a_bad uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  a_rcv := get_or_create_account('merchant_receivable','merchant',p_merchant,NULL,NULL,'THB','DR',v_city);
  IF account_balance(a_rcv) < p_amount THEN
    RAISE EXCEPTION 'write_off: amount % exceeds receivable %', p_amount, account_balance(a_rcv); END IF;
  a_bad := get_or_create_account('bad_debt_expense','platform',NULL,NULL,NULL,'THB','DR',v_city);
  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('WRITE_OFF',p_idem,md5(p_idem),v_city,'platform','write_off') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_bad,'DR',p_amount,'THB','platform',v_city),     -- recognize the loss
    (t,a_rcv,'CR',p_amount,'THB','platform',v_city);     -- give up the receivable
  RETURN t;
END $$;
