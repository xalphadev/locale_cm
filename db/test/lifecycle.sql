-- ============================================================================
-- Money lifecycle acceptance test (closing the ledger).
--   EXPIRE : unredeemed lot past expiry → burned + backing returned to funder escrow
--   PAYOUT : accrued merchant_payable settled to bank via clearing; SoD (creator!=approver)
--   REFUND : settled redeem reversed → user re-credited, settlement pulled back; double-refund blocked
-- Run after 0001-0007. PostGIS-independent.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset
SELECT gen_random_uuid() AS mf \gset
SELECT gen_random_uuid() AS mp \gset
SELECT gen_random_uuid() AS mr \gset
SELECT gen_random_uuid() AS ue \gset
SELECT gen_random_uuid() AS up \gset
SELECT gen_random_uuid() AS ur \gset
SELECT gen_random_uuid() AS cr \gset
SELECT gen_random_uuid() AS ap \gset
SELECT gen_random_uuid() AS q  \gset

INSERT INTO users(id) VALUES (:'ue'),(:'up'),(:'ur');
INSERT INTO merchants(id,city_id,display_name_i18n,trust_state) VALUES
  (:'mf',:'cid','{"en":"Funder"}','finance_verified'),
  (:'mp',:'cid','{"en":"Payout redeemer"}','finance_verified'),
  (:'mr',:'cid','{"en":"Refund redeemer"}','finance_verified');

-- fund the funder, reserve a pool big enough for 3 grants (3 x 60฿)
SELECT fn_prefund(:'mf', :'cid', 50000, 0, 'promptpay', 'lc-pf');
SELECT id AS ewid FROM escrow_wallets WHERE owner_id=:'mf' AND city_id=:'cid' \gset
SELECT fn_psp_settle(:'mf', :'cid', 50000, 'promptpay', 'lc-st');
INSERT INTO quests(id,city_id,district_id,title_i18n,funding_escrow_wallet_id,reward_coin_minor,min_steps_required,status)
  VALUES(:'q',:'cid',:'did','{"en":"LC quest"}',:'ewid',6000,1,'draft');
SELECT fn_fund_quest(:'q', 18000, 'lc-fq');
UPDATE platform_config SET value='100'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';
UPDATE platform_config SET value='100000' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';
INSERT INTO quest_progress(user_id,quest_id,city_id,status) VALUES
  (:'ue',:'q',:'cid','in_progress'),(:'up',:'q',:'cid','in_progress'),(:'ur',:'q',:'cid','in_progress');

-- mint a 60฿ lot to each of the 3 users
SELECT fn_grant_coins(:'ue', :'q', 'lc-gr-e');
SELECT fn_grant_coins(:'up', :'q', 'lc-gr-p');
SELECT fn_grant_coins(:'ur', :'q', 'lc-gr-r');

-- ── EXPIRE: force uE's lot past expiry, then expire it ──
SELECT id AS lote FROM coin_lots WHERE user_id=:'ue' \gset
UPDATE coin_lots SET expires_at = now() - interval '1 day' WHERE id = :'lote';
SELECT fn_expire(:'lote', 'lc-exp');
SELECT 'EXPIRE userE='||account_balance((SELECT user_account_id FROM coin_lots WHERE id=:'lote'))
  ||' lot='||(SELECT state::text FROM coin_lots WHERE id=:'lote') AS expire_result;   -- expect userE=0 lot=expired

-- ── PAYOUT: uP redeems → MP payable 5400; settle it to bank; SoD check ──
SELECT fn_redeem(:'up', :'mp', 6000, 'lc-rd-p');
SELECT fn_payout_merchant(:'mp', 5400, :'cr', :'ap', 'lc-po');
SELECT 'PAYOUT MP_payable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_payable' AND owner_id=:'mp')) AS payout_result;  -- expect 0
SELECT fn_payout_merchant(:'mp', 1, :'cr', :'cr', 'lc-po-sod');   -- expect ERROR: payout SoD

-- ── REFUND: uR redeems → reverse it; user re-credited, settlement pulled back; double-refund blocked ──
SELECT fn_redeem(:'ur', :'mr', 6000, 'lc-rd-r') AS ridr \gset
SELECT fn_refund(:'ridr', 'lc-rf');
SELECT 'REFUND userR='||account_balance((SELECT id FROM accounts WHERE account_type='user_coin' AND owner_id=:'ur'))
  ||' MR_payable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_payable' AND owner_id=:'mr'))
  ||' status='||(SELECT status::text FROM redemptions WHERE id=:'ridr') AS refund_result;  -- expect userR=6000 MR_payable=0 status=reversed
SELECT fn_refund(:'ridr', 'lc-rf2');   -- expect ERROR: one_reversal_per_target (double-refund blocked)

-- ── global ledger integrity after the whole lifecycle ──
SELECT 'LC_OFFENDERS='||count(*) AS integrity FROM (
  SELECT txn_id,currency FROM ledger_entries GROUP BY txn_id,currency
  HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;
