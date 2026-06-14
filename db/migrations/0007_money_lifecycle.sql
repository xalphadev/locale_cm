-- ============================================================================
-- Migration #1 — part 0007: Money lifecycle (closing the ledger)
-- Source: docs/02 §A.6, docs/02b §A2.3 (EXPIRE / PAYOUT / REFUND postings).
--   fn_expire          — unredeemed Coin lot expires → burn + return THB backing to the funder
--                        (default policy = return-to-funder, lowest legal risk; A.10/C4)
--   fn_payout_merchant — settle accrued merchant_payable to bank via clearing (clearing nets to 0);
--                        SoD: created_by != approved_by (SEAM-3)
--   fn_refund          — reverse a settled REDEEM (dispute won by customer); one-reversal guard
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- fn_expire: a lot past expiry with Coin still unredeemed → burn it and return the THB
--   backing to the FUNDER's escrow (so they can reuse it). Breakage = return-to-funder.
--   COIN: Dr coin_liability / Cr user_coin   (burn the unredeemed remainder)
--   THB : Dr coin_backing  / Cr merchant_escrow  (return backing to funder)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_expire(p_lot uuid, p_idem text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE lot coin_lots%ROWTYPE; t uuid; rem bigint; v_city uuid; funder uuid;
        a_liab uuid; a_back uuid; a_esc uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN RETURN 0; END IF;
  SELECT * INTO lot FROM coin_lots WHERE id=p_lot FOR UPDATE;
  IF lot.id IS NULL THEN RAISE EXCEPTION 'expire: lot not found'; END IF;
  IF lot.state <> 'active' OR lot.remaining_minor = 0 THEN RETURN 0; END IF;     -- nothing to expire
  IF lot.expires_at > now() THEN RAISE EXCEPTION 'expire: lot not yet expired (grace not elapsed)'; END IF;

  rem := lot.remaining_minor; v_city := lot.city_id;
  funder := substring(lot.funder_key from 'merchant:(.*)')::uuid;               -- MVP: merchant-funded
  a_liab := get_or_create_account('coin_liability','platform',NULL,NULL,NULL,'COIN','CR',v_city);
  a_back := get_or_create_account('coin_backing','platform',NULL,lot.funder_key,NULL,'THB','CR',v_city);
  a_esc  := get_or_create_account('merchant_escrow','merchant',funder,NULL,NULL,'THB','CR',v_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,ref_id)
    VALUES('EXPIRE',p_idem,md5(p_idem),v_city,lot.funder_key,'expiry',p_lot) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,lot_id,expires_at,city_id) VALUES
    (t,a_liab,'DR',rem,'COIN',lot.funder_key,lot.id,lot.expires_at,v_city),
    (t,lot.user_account_id,'CR',rem,'COIN',lot.funder_key,lot.id,lot.expires_at,v_city);
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_back,'DR',rem,'THB',lot.funder_key,v_city),
    (t,a_esc, 'CR',rem,'THB',lot.funder_key,v_city);

  UPDATE coin_lots SET remaining_minor=0, state='expired' WHERE id=p_lot;
  UPDATE escrow_wallets SET total_cached=total_cached+rem, settled_total_cached=settled_total_cached+rem,
         available_cached=available_cached+rem, settled_available_cached=settled_available_cached+rem, updated_at=now()
   WHERE owner_type='merchant' AND owner_id=funder AND city_id=v_city;
  RETURN rem;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- fn_payout_merchant: pay accrued merchant_payable out to the bank. Routes through clearing,
--   which must net to zero within the txn (A.8.1b). SoD: creator != approver (SEAM-3).
--   Dr merchant_payable / Cr clearing ; Dr clearing / Cr bank_settlement
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_payout_merchant(
  p_merchant uuid, p_amount bigint, p_created_by uuid, p_approved_by uuid, p_idem text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; v_city uuid; a_pay uuid; a_clear uuid; a_bank uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  IF p_created_by = p_approved_by THEN RAISE EXCEPTION 'payout SoD: creator == approver (SEAM-3)'; END IF;
  SELECT city_id INTO v_city FROM merchants WHERE id=p_merchant;
  IF v_city IS NULL THEN RAISE EXCEPTION 'payout: merchant not found'; END IF;
  PERFORM assert_not_frozen('PAYOUT', v_city);

  a_pay   := get_or_create_account('merchant_payable','merchant',p_merchant,NULL,NULL,'THB','CR',v_city);
  IF account_balance(a_pay) < p_amount THEN
    RAISE EXCEPTION 'payout: insufficient payable (have %, want %)', account_balance(a_pay), p_amount;
  END IF;
  a_clear := get_or_create_account('clearing','platform',NULL,NULL,NULL,'THB','DR',v_city);
  a_bank  := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',v_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,created_by)
    VALUES('PAYOUT',p_idem,md5(p_idem),v_city,'platform','payout',p_created_by) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_pay,  'DR',p_amount,'THB','platform',v_city),
    (t,a_clear,'CR',p_amount,'THB','platform',v_city),
    (t,a_clear,'DR',p_amount,'THB','platform',v_city),   -- clearing nets to zero (A.8.1b)
    (t,a_bank, 'CR',p_amount,'THB','platform',v_city);
  RETURN t;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- fn_refund: reverse a settled REDEEM (customer won the dispute). Re-credits the user with a
--   fresh graced lot, pulls the settlement back from the redeeming merchant + reverses revenue,
--   restores the backing. one_reversal_per_target prevents double-refund. MVP: only refundable
--   while the merchant settlement has NOT yet been paid out (else needs clawback, later).
--   COIN: Cr coin_liability / Dr user_coin (new lot)
--   THB : Dr merchant_payable (s-take) + Dr platform_revenue (take) / Cr coin_backing (s)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_refund(p_redemption uuid, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE r redemptions%ROWTYPE; t uuid; newlot uuid; v_city uuid; fkey text; redeem_txn uuid;
        amt bigint; settle bigint; take bigint; grace timestamptz;
        a_liab uuid; a_user uuid; a_back uuid; a_pay uuid; a_rev uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  SELECT * INTO r FROM redemptions WHERE id=p_redemption FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'settled' THEN RAISE EXCEPTION 'refund: redemption not settled'; END IF;
  v_city := r.city_id; amt := r.coin_amount_burned; settle := r.thb_settlement; take := r.take_rate_minor;
  redeem_txn := r.ledger_txn_id;
  SELECT funded_by INTO fkey FROM ledger_transactions WHERE id=redeem_txn;

  a_pay  := get_or_create_account('merchant_payable','merchant',r.merchant_id,NULL,NULL,'THB','CR',v_city);
  IF account_balance(a_pay) < settle - take THEN
    RAISE EXCEPTION 'refund: merchant settlement already paid out — needs clawback (not in MVP slice)';
  END IF;
  a_liab := get_or_create_account('coin_liability','platform',NULL,NULL,NULL,'COIN','CR',v_city);
  a_user := get_or_create_account('user_coin','user',r.user_id,NULL,NULL,'COIN','DR',v_city);
  a_back := get_or_create_account('coin_backing','platform',NULL,fkey,NULL,'THB','CR',v_city);
  a_rev  := get_or_create_account('platform_revenue','platform',NULL,NULL,NULL,'THB','CR',v_city);
  grace  := now() + (COALESCE(cfg_num('REFUND_GRACE_DAYS'),30) || ' days')::interval;

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,ref_id,reverses_txn_id)
    VALUES('REFUND',p_idem,md5(p_idem),v_city,fkey,'reversal',p_redemption,redeem_txn) RETURNING id INTO t;
  INSERT INTO coin_lots(user_account_id,user_id,grant_txn_id,funder_key,granted_minor,remaining_minor,expires_at,city_id)
    VALUES(a_user,r.user_id,t,fkey,amt,amt,grace,v_city) RETURNING id INTO newlot;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,lot_id,expires_at,city_id) VALUES
    (t,a_liab,'CR',amt,'COIN',fkey,newlot,grace,v_city),
    (t,a_user,'DR',amt,'COIN',fkey,newlot,grace,v_city);
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_pay, 'DR',settle - take,'THB',fkey,v_city),
    (t,a_back,'CR',settle,       'THB',fkey,v_city);
  IF take > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_rev,'DR',take,'THB',fkey,v_city);
  END IF;

  UPDATE redemptions SET status='reversed' WHERE id=p_redemption;
  RETURN newlot;
END $$;

GRANT UPDATE ON redemptions TO money_writer;
