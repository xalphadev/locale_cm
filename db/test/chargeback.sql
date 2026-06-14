-- ============================================================================
-- Chargeback → Recovery → Write-off acceptance test (bad-debt lifecycle).
-- Realistic setup: a merchant prefunds 1,000฿, funds + grants a 600฿ reward (so 600฿ of escrow
-- is now spent as outstanding Coin, leaving 400฿). Then the card is charged back for the full
-- 1,000฿ → 400฿ reversed from escrow + 600฿ booked as merchant_receivable (the platform's loss
-- exposure), payout frozen. Then 400฿ recovered + 200฿ written off (+ 200฿ remaining recovered).
-- Run after 0001-0011. PostGIS-independent.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset
SELECT gen_random_uuid() AS mf \gset
SELECT gen_random_uuid() AS u  \gset
SELECT gen_random_uuid() AS qid \gset
INSERT INTO users(id) VALUES (:'u');
INSERT INTO merchants(id,city_id,display_name_i18n,trust_state) VALUES (:'mf',:'cid','{"en":"CB Cafe"}','finance_verified');

SELECT fn_prefund(:'mf', :'cid', 10000, 0, 'promptpay', 'cb-pf');
SELECT id AS ewid FROM escrow_wallets WHERE owner_id=:'mf' AND city_id=:'cid' \gset
SELECT fn_psp_settle(:'mf', :'cid', 10000, 'promptpay', 'cb-st');
INSERT INTO quests(id,city_id,district_id,title_i18n,funding_escrow_wallet_id,reward_coin_minor,min_steps_required,status)
  VALUES(:'qid',:'cid',:'did','{"en":"CB quest"}',:'ewid',6000,1,'draft');
SELECT fn_fund_quest(:'qid', 6000, 'cb-fq');
UPDATE platform_config SET value='100'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';
UPDATE platform_config SET value='100000' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';
INSERT INTO quest_progress(user_id,quest_id,city_id,status) VALUES(:'u',:'qid',:'cid','in_progress');
SELECT fn_grant_coins(:'u', :'qid', 'cb-gr');     -- spends 600฿ of escrow → escrow now 400฿

-- chargeback the full 1,000฿: 400 reversed from escrow + 600 shortfall → receivable
SELECT fn_chargeback(:'mf', 10000, 'cb-1');
SELECT 'CHARGEBACK escrow='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_escrow' AND owner_id=:'mf'))
  ||' receivable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_receivable' AND owner_id=:'mf'))
  ||' frozen='||(SELECT payout_frozen::text FROM merchants WHERE id=:'mf') AS cb_result;
-- expect escrow=0 receivable=6000 frozen=true

-- recover 40฿ of the receivable
SELECT fn_recovery(:'mf', 4000, 'cb-rec');
SELECT 'RECOVERY receivable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_receivable' AND owner_id=:'mf')) AS rec_result;
-- expect receivable=2000

-- write off the remaining 20฿
SELECT fn_write_off(:'mf', 2000, 'cb-wo');
SELECT 'WRITEOFF receivable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_receivable' AND owner_id=:'mf'))
  ||' baddebt='||account_balance((SELECT id FROM accounts WHERE account_type='bad_debt_expense' AND city_id=:'cid')) AS wo_result;
-- expect receivable=0 baddebt=20000

SELECT 'CB_OFFENDERS='||count(*) AS integrity FROM (
  SELECT txn_id,currency FROM ledger_entries GROUP BY txn_id,currency
  HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;
