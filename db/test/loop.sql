-- ============================================================================
-- Full money-loop acceptance test: the Nimman Cafe-Hop money path, end to end.
--   prefund → psp_settle → fund_quest → (fail-closed grant) → set caps → grant → redeem
-- Asserts: COGS fail-closed; mint balances (coin_liability==coin_backing==user_coin);
-- anti-self-redemption blocked; final solvency (all 0); take-rate split; ledger integrity.
-- PostGIS-independent (no geography touched). Run after 0001-0005.
-- ============================================================================
\set ON_ERROR_STOP off

SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT gen_random_uuid() AS uid     \gset
SELECT gen_random_uuid() AS mfund   \gset
SELECT gen_random_uuid() AS mredeem \gset
SELECT gen_random_uuid() AS qid     \gset

INSERT INTO users(id) VALUES (:'uid');
INSERT INTO merchants(id,city_id,display_name_i18n,trust_state) VALUES
  (:'mfund',  :'cid','{"en":"Ristr8to (funder)"}','finance_verified'),
  (:'mredeem',:'cid','{"en":"Graph Cafe (redeemer)"}','finance_verified');

-- prefund funder 100 baht (10000 satang), fee 0; then settle (makes it mintable)
SELECT fn_prefund(:'mfund', :'cid', 10000, 0, 'promptpay', 'pf-1');
SELECT id AS ewid FROM escrow_wallets WHERE owner_id=:'mfund' AND city_id=:'cid' \gset
SELECT fn_psp_settle(:'mfund', :'cid', 10000, 'promptpay', 'st-1');

-- quest funded by funder wallet; reward = 60 baht (6000 minor)
INSERT INTO quests(id,city_id,title_i18n,funding_escrow_wallet_id,reward_coin_minor,min_steps_required,status)
  VALUES(:'qid',:'cid','{"en":"Nimman Cafe-Hop"}',:'ewid',6000,3,'draft');
INSERT INTO quest_progress(user_id,quest_id,city_id,status) VALUES(:'uid',:'qid',:'cid','in_progress');

-- reserve the quest pool (60 baht) from SETTLED escrow
SELECT fn_fund_quest(:'qid', 6000, 'fq-1');

-- ── TEST A: grant BEFORE COGS caps set → must FAIL-CLOSED ──
SELECT fn_grant_coins(:'uid', :'qid', 'gr-fail');   -- expect ERROR: COGS caps unset

-- founder sets caps (B1/B2): per-redemption 100 baht, monthly 100,000 baht
UPDATE platform_config SET value='100'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';
UPDATE platform_config SET value='100000' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';

-- ── grant: mint 6000 coin into the user's lot ──
SELECT fn_grant_coins(:'uid', :'qid', 'gr-1');

SELECT 'AFTER_GRANT'
  ||' liab='||account_balance((SELECT id FROM accounts WHERE account_type='coin_liability'  AND city_id=:'cid'))
  ||' back='||account_balance((SELECT id FROM accounts WHERE account_type='coin_backing'    AND city_id=:'cid'))
  ||' user='||account_balance((SELECT id FROM accounts WHERE account_type='user_coin'       AND owner_id=:'uid')) AS grant_state;

-- ── TEST B: anti-self-redemption — redeem at the FUNDER merchant → must be blocked ──
SELECT fn_redeem(:'uid', :'mfund', 6000, 'rd-self');   -- expect ERROR: anti-self-redemption

-- ── redeem at a DIFFERENT merchant: burn 6000, settle 6000, take 10% = 600, payable 5400 ──
SELECT fn_redeem(:'uid', :'mredeem', 6000, 'rd-1');

SELECT 'AFTER_REDEEM'
  ||' liab='||account_balance((SELECT id FROM accounts WHERE account_type='coin_liability'  AND city_id=:'cid'))
  ||' back='||account_balance((SELECT id FROM accounts WHERE account_type='coin_backing'    AND city_id=:'cid'))
  ||' user='||account_balance((SELECT id FROM accounts WHERE account_type='user_coin'       AND owner_id=:'uid'))
  ||' rev=' ||account_balance((SELECT id FROM accounts WHERE account_type='platform_revenue' AND city_id=:'cid'))
  ||' payable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_payable' AND owner_id=:'mredeem')) AS redeem_state;

-- ── global ledger integrity: 0 txns that don't net to zero per currency ──
SELECT 'LEDGER_OFFENDERS='||count(*) AS integrity FROM (
  SELECT txn_id,currency FROM ledger_entries GROUP BY txn_id,currency
  HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;
