-- ============================================================================
-- Migration #1 — part 0005: Money-plane functions (the gate+post core)
-- Source: docs/02 §A, docs/02b §A2, docs/04 §3 (edge-fn contracts C3-C6).
-- Per the C2 stack decision, money-critical logic lives in plpgsql functions
-- (one per txn_type, server-authoritative, FOR UPDATE locks, idempotent). The NestJS
-- money-plane calls these as `money_writer`. Every posting nets to zero per currency;
-- clearing stays flat; the append-only + balance triggers from 0003 are the referee.
-- Amounts are satang/coin-minor (BIGINT). 1 COIN = 1 THB = 100 minor.
-- ============================================================================

-- ── helper: natural account balance (positive = in the account's normal direction) ──
CREATE OR REPLACE FUNCTION account_balance(p_account uuid) RETURNS bigint
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(
    CASE WHEN e.direction = a.normal_balance THEN e.amount_minor ELSE -e.amount_minor END
  ),0)
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE e.account_id = p_account;
$$;

-- ── helper: get-or-create a canonical account (NULLS NOT DISTINCT identity) ──
CREATE OR REPLACE FUNCTION get_or_create_account(
  p_type account_type, p_owner_type acct_owner, p_owner_id uuid,
  p_funder_key text, p_psp_key text, p_currency currency,
  p_normal ledger_dir, p_city uuid
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  SELECT id INTO v FROM accounts
   WHERE account_type = p_type
     AND owner_id   IS NOT DISTINCT FROM p_owner_id
     AND funder_key IS NOT DISTINCT FROM p_funder_key
     AND psp_key    IS NOT DISTINCT FROM p_psp_key
     AND currency = p_currency AND city_id = p_city;
  IF v IS NULL THEN
    INSERT INTO accounts(account_type,owner_type,owner_id,funder_key,psp_key,currency,normal_balance,city_id)
    VALUES (p_type,p_owner_type,p_owner_id,p_funder_key,p_psp_key,p_currency,p_normal,p_city)
    RETURNING id INTO v;
  END IF;
  RETURN v;
END $$;

-- ── helper: freeze gate (SEAM-2 fail-closed) — raise if op frozen for global/city ──
CREATE OR REPLACE FUNCTION assert_not_frozen(p_op text, p_city uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE city_code text;
BEGIN
  SELECT code INTO city_code FROM cities WHERE id = p_city;
  IF EXISTS (SELECT 1 FROM platform_freeze_state
             WHERE scope_key IN ('global','city:'||COALESCE(city_code,'?'))
               AND p_op = ANY(frozen_ops)) THEN
    RAISE EXCEPTION 'frozen: op % is paused (SEAM-2)', p_op;
  END IF;
END $$;

-- ── helper: config getters ──
CREATE OR REPLACE FUNCTION cfg_num(p_key text) RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT NULLIF(value::text,'null')::numeric FROM platform_config WHERE key=p_key AND city_id IS NULL;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- PREFUND: merchant tops up escrow via PSP. Gross-credit policy (platform absorbs fee).
--   Dr psp_suspense (net) + Dr psp_fee_expense (fee) / Cr merchant_escrow (gross)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_prefund(
  p_merchant uuid, p_city uuid, p_gross_minor bigint, p_fee_minor bigint,
  p_psp text, p_idem text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; a_susp uuid; a_fee uuid; a_esc uuid; ew uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem);
  END IF;
  PERFORM assert_not_frozen('PREFUND', p_city);
  IF p_gross_minor <= 0 OR p_fee_minor < 0 OR p_fee_minor >= p_gross_minor THEN
    RAISE EXCEPTION 'prefund: bad amounts';
  END IF;

  a_susp := get_or_create_account('psp_suspense','platform',NULL,NULL,p_psp,'THB','DR',p_city);
  a_fee  := get_or_create_account('psp_fee_expense','platform',NULL,NULL,p_psp,'THB','DR',p_city);
  a_esc  := get_or_create_account('merchant_escrow','merchant',p_merchant,NULL,NULL,'THB','CR',p_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,created_by)
    VALUES('PREFUND',p_idem,md5(p_idem),p_city,'merchant:'||p_merchant,'escrow_topup',NULL) RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_susp,'DR',p_gross_minor - p_fee_minor,'THB','merchant:'||p_merchant,p_city),
    (t,a_esc, 'CR',p_gross_minor,             'THB','merchant:'||p_merchant,p_city);
  IF p_fee_minor > 0 THEN   -- amount_minor>0 CHECK: only post the fee leg when there is a fee
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_fee,'DR',p_fee_minor,'THB','merchant:'||p_merchant,p_city);
  END IF;

  -- escrow read-model cache: total goes up; NOT yet settled (mint-gated on settle)
  INSERT INTO escrow_wallets(owner_type,owner_id,account_id,city_id,total_cached,available_cached)
    VALUES('merchant',p_merchant,a_esc,p_city,p_gross_minor,p_gross_minor)
  ON CONFLICT (owner_type,owner_id,city_id) DO UPDATE
    SET total_cached = escrow_wallets.total_cached + p_gross_minor,
        available_cached = escrow_wallets.available_cached + p_gross_minor,
        updated_at = now()
  RETURNING id INTO ew;
  RETURN t;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- PSP_SETTLE: PSP confirms cash landed → move suspense to settled bank; makes escrow mintable.
--   Dr bank_settlement / Cr psp_suspense
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_psp_settle(
  p_merchant uuid, p_city uuid, p_amount_minor bigint, p_psp text, p_idem text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; a_bank uuid; a_susp uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem); END IF;
  a_bank := get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',p_city);
  a_susp := get_or_create_account('psp_suspense','platform',NULL,NULL,p_psp,'THB','DR',p_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('PSP_SETTLE',p_idem,md5(p_idem),p_city,'merchant:'||p_merchant,'psp_settle') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_bank,'DR',p_amount_minor,'THB','merchant:'||p_merchant,p_city),
    (t,a_susp,'CR',p_amount_minor,'THB','merchant:'||p_merchant,p_city);

  UPDATE escrow_wallets
     SET settled_total_cached = settled_total_cached + p_amount_minor,
         settled_available_cached = settled_available_cached + p_amount_minor,
         updated_at = now()
   WHERE owner_type='merchant' AND owner_id=p_merchant AND city_id=p_city;
  RETURN t;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- FUND_QUEST: reserve settled escrow into a quest pool (no ledger move yet — backing moves at GRANT).
--   Reservation only: escrow_locks(quest_pool) + cache locked/available shift. A.8.7 settled check.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_fund_quest(p_quest uuid, p_pool_minor bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE w escrow_wallets%ROWTYPE; ewid uuid; v_city uuid;
BEGIN
  SELECT funding_escrow_wallet_id, city_id INTO ewid, v_city FROM quests WHERE id=p_quest;
  IF ewid IS NULL THEN RAISE EXCEPTION 'fund_quest: quest % has no funding escrow', p_quest; END IF;
  PERFORM assert_not_frozen('PREFUND', v_city);
  -- lock the funder wallet row (serialization point), assert settled availability (A.8.7/A.8.11)
  SELECT * INTO w FROM escrow_wallets WHERE id=ewid FOR UPDATE;
  IF w.settled_available_cached < p_pool_minor THEN
    RAISE EXCEPTION 'fund_quest: insufficient SETTLED escrow (have %, need %)', w.settled_available_cached, p_pool_minor;
  END IF;
  INSERT INTO escrow_locks(escrow_wallet_id,amount_minor,lock_reason,ref_id,city_id)
    VALUES(ewid,p_pool_minor,'quest_pool',p_quest,w.city_id);
  UPDATE escrow_wallets
     SET available_cached = available_cached - p_pool_minor,
         settled_available_cached = settled_available_cached - p_pool_minor,
         locked_cached = locked_cached + p_pool_minor, updated_at=now()
   WHERE id=ewid;
  UPDATE quests SET status='active' WHERE id=p_quest AND status<>'active';
  RETURN ewid;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- GRANT: user completed quest → mint Coins. Gate order (SEAM-1): COGS cap → fraud → solvency.
--   COIN: Cr coin_liability / Dr user_coin   (mint X into user's lot)
--   THB : Dr merchant_escrow / Cr coin_backing  (move X backing, per funder)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_grant_coins(p_user uuid, p_quest uuid, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; lot uuid; v_grant uuid; v_city uuid; reward bigint; ewid uuid; funder uuid; fkey text;
        cap_baht numeric; mcap_baht numeric; month_sum bigint;
        a_liab uuid; a_user uuid; a_esc uuid; a_back uuid; exp timestamptz; w escrow_wallets%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT lot_id FROM coin_grants g JOIN ledger_transactions lt ON lt.id=g.ledger_txn_id
            WHERE lt.idempotency_key=p_idem); END IF;

  SELECT reward_coin_minor, city_id, funding_escrow_wallet_id INTO reward, v_city, ewid
    FROM quests WHERE id=p_quest;
  IF reward IS NULL OR reward <= 0 THEN RAISE EXCEPTION 'grant: quest has no reward'; END IF;
  PERFORM assert_not_frozen('GRANT', v_city);

  -- GATE 1: reward-COGS caps — FAIL-CLOSED if unset (cogs_cap_unset flag / null caps)
  cap_baht  := cfg_num('REWARD_PER_REDEMPTION_CAP_THB');
  mcap_baht := cfg_num('MERCHANT_MONTHLY_COGS_CAP_THB');
  IF cap_baht IS NULL OR mcap_baht IS NULL THEN
    RAISE EXCEPTION 'grant: COGS caps unset — fail-closed (set REWARD_PER_REDEMPTION_CAP_THB / MERCHANT_MONTHLY_COGS_CAP_THB)';
  END IF;
  IF reward > cap_baht*100 THEN
    RAISE EXCEPTION 'grant: reward % exceeds per-redemption cap % satang', reward, cap_baht*100;
  END IF;

  SELECT * INTO w FROM escrow_wallets WHERE id=ewid FOR UPDATE;   -- serialization point
  funder := w.owner_id; fkey := 'merchant:'||funder;

  SELECT COALESCE(SUM(coin_amount_minor),0) INTO month_sum FROM coin_grants
   WHERE funding_escrow_wallet_id=ewid AND created_at >= date_trunc('month', now());
  IF month_sum + reward > mcap_baht*100 THEN
    RAISE EXCEPTION 'grant: per-merchant monthly COGS cap exceeded (% + % > %)', month_sum, reward, mcap_baht*100;
  END IF;

  -- GATE 3: solvency — the quest pool reservation must cover the reward
  IF w.locked_cached < reward THEN
    RAISE EXCEPTION 'grant: quest pool reservation insufficient (locked %, need %)', w.locked_cached, reward;
  END IF;

  -- accounts
  a_liab := get_or_create_account('coin_liability','platform',NULL,NULL,NULL,'COIN','CR',v_city);
  a_user := get_or_create_account('user_coin','user',p_user,NULL,NULL,'COIN','DR',v_city);
  a_esc  := w.account_id;
  a_back := get_or_create_account('coin_backing','platform',NULL,fkey,NULL,'THB','CR',v_city);
  exp    := now() + (COALESCE(cfg_num('COIN_EXPIRY_DAYS'),90) || ' days')::interval;

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type,ref_id)
    VALUES('GRANT',p_idem,md5(p_idem),v_city,fkey,'coin_grant',p_quest) RETURNING id INTO t;
  INSERT INTO coin_lots(user_account_id,user_id,grant_txn_id,funder_key,granted_minor,remaining_minor,expires_at,city_id)
    VALUES(a_user,p_user,t,fkey,reward,reward,exp,v_city) RETURNING id INTO lot;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,lot_id,expires_at,city_id) VALUES
    (t,a_liab,'CR',reward,'COIN',fkey,lot,exp,v_city),
    (t,a_user,'DR',reward,'COIN',fkey,lot,exp,v_city);
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_esc, 'DR',reward,'THB',fkey,v_city),
    (t,a_back,'CR',reward,'THB',fkey,v_city);

  -- caches: backing left escrow; release the reservation
  UPDATE escrow_wallets
     SET total_cached = total_cached - reward, settled_total_cached = settled_total_cached - reward,
         locked_cached = locked_cached - reward, updated_at=now()
   WHERE id=ewid;
  INSERT INTO coin_grants(user_id,source_type,source_id,funding_escrow_wallet_id,lot_id,coin_amount_minor,expires_at,ledger_txn_id,city_id)
    VALUES(p_user,'quest_completion',p_quest,ewid,lot,reward,exp,t,v_city) RETURNING id INTO v_grant;
  UPDATE quest_progress SET status='completed', completed_at=now(), reward_grant_id=v_grant
    WHERE user_id=p_user AND quest_id=p_quest;   -- FK → coin_grants(id), not the lot
  RETURN lot;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- REDEEM: merchant-initiated burn (FIFO unexpired lot). Anti-self-redemption boundary.
--   COIN: Dr coin_liability / Cr user_coin   (burn X)
--   THB : Dr coin_backing / Cr merchant_payable (X-take) + Cr platform_revenue (take)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_redeem(p_user uuid, p_redeem_merchant uuid, p_coin_minor bigint, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE t uuid; lot coin_lots%ROWTYPE; v_city uuid; take bigint; settlement bigint; pct numeric; micro numeric;
        a_liab uuid; a_user uuid; a_back uuid; a_pay uuid; a_rev uuid; rid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE idempotency_key=p_idem) THEN
    RETURN (SELECT id FROM redemptions WHERE ledger_txn_id=
            (SELECT id FROM ledger_transactions WHERE idempotency_key=p_idem)); END IF;

  -- FIFO unexpired lot, locked (the burn anchor)
  SELECT * INTO lot FROM coin_lots
    WHERE user_id=p_user AND state='active' AND expires_at > now() AND remaining_minor >= p_coin_minor
    ORDER BY expires_at ASC LIMIT 1 FOR UPDATE;
  IF lot.id IS NULL THEN RAISE EXCEPTION 'redeem: no unexpired lot with sufficient balance'; END IF;
  v_city := lot.city_id;
  PERFORM assert_not_frozen('REDEEM', v_city);

  -- ANTI-SELF-REDEMPTION (the BoT e-money boundary): funder must not be the redeeming merchant
  IF lot.funder_key = 'merchant:'||p_redeem_merchant THEN
    RAISE EXCEPTION 'redeem: anti-self-redemption — funder == redeemer (A.8.12)';
  END IF;

  settlement := p_coin_minor;                              -- 1 COIN = 1 THB
  pct   := COALESCE(cfg_num('TAKE_RATE_PCT'),10);
  micro := COALESCE(cfg_num('MICRO_REDEMPTION_FREE_BELOW_THB'),30) * 100;  -- to satang
  IF settlement < micro THEN take := 0;
  ELSE take := floor(settlement * GREATEST(pct,6) / 100);   -- 6% effective floor (pricing B.2)
  END IF;

  a_liab := get_or_create_account('coin_liability','platform',NULL,NULL,NULL,'COIN','CR',v_city);
  a_user := lot.user_account_id;
  a_back := get_or_create_account('coin_backing','platform',NULL,lot.funder_key,NULL,'THB','CR',v_city);
  a_pay  := get_or_create_account('merchant_payable','merchant',p_redeem_merchant,NULL,NULL,'THB','CR',v_city);
  a_rev  := get_or_create_account('platform_revenue','platform',NULL,NULL,NULL,'THB','CR',v_city);

  INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id,funded_by,ref_type)
    VALUES('REDEEM',p_idem,md5(p_idem),v_city,lot.funder_key,'redemption') RETURNING id INTO t;
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,lot_id,expires_at,city_id) VALUES
    (t,a_liab,'DR',p_coin_minor,'COIN',lot.funder_key,lot.id,lot.expires_at,v_city),
    (t,a_user,'CR',p_coin_minor,'COIN',lot.funder_key,lot.id,lot.expires_at,v_city);
  INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
    (t,a_back,'DR',settlement,         'THB',lot.funder_key,v_city),
    (t,a_pay, 'CR',settlement - take,  'THB',lot.funder_key,v_city);
  IF take > 0 THEN
    INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id)
      VALUES(t,a_rev,'CR',take,'THB',lot.funder_key,v_city);
  END IF;

  UPDATE coin_lots SET remaining_minor = remaining_minor - p_coin_minor,
         state = CASE WHEN remaining_minor - p_coin_minor = 0 THEN 'exhausted' ELSE state END
   WHERE id = lot.id;

  INSERT INTO redemptions(user_id,place_id,merchant_id,city_id,coin_amount_burned,thb_settlement,
                          take_rate_pct,take_rate_minor,initiation,ledger_txn_id,status)
    VALUES(p_user,NULL,p_redeem_merchant,v_city,p_coin_minor,settlement,
           GREATEST(pct,6),take,'merchant_qr',t,'settled') RETURNING id INTO rid;
  RETURN rid;
END $$;

-- money_writer needs UPDATE on the mutable read-model caches it maintains
GRANT UPDATE ON escrow_wallets, coin_lots, quests, quest_progress TO money_writer;
GRANT INSERT ON escrow_locks, coin_grants, redemptions TO money_writer;
