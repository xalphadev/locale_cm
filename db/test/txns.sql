-- ============================================================================
-- The final 5 canonical txn types acceptance test → 22/22 ledger complete.
--   MERCHANT_CLAWBACK · CHURN_SWEEP · OWNERSHIP_TRANSFER · CAMPAIGN_END · AFFILIATE
-- Run after 0001-0012. PostGIS-independent (place geo via WKT text).
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset
SELECT gen_random_uuid() AS mc1 \gset
SELECT gen_random_uuid() AS mcf \gset
SELECT gen_random_uuid() AS cs  \gset
SELECT gen_random_uuid() AS ot1 \gset
SELECT gen_random_uuid() AS ot2 \gset
SELECT gen_random_uuid() AS pot \gset
SELECT gen_random_uuid() AS sp  \gset
INSERT INTO merchants(id,city_id,display_name_i18n) VALUES
  (:'mc1',:'cid','{"en":"Clawback M"}'),(:'cs',:'cid','{"en":"Churn M"}'),
  (:'ot1',:'cid','{"en":"Old owner"}'),(:'ot2',:'cid','{"en":"New owner"}');
INSERT INTO places(id,city_id,district_id,category,name_i18n,geo,status,merchant_id)
  VALUES(:'pot',:'cid',:'did','eat','{"en":"Transfer Cafe"}','SRID=4326;POINT(98.97 18.79)','published',:'ot1');

-- 1) MERCHANT_CLAWBACK: book receivable + restore backing
SELECT fn_merchant_clawback(:'mc1', 5000, 'merchant:'||:'mcf', 'mc-1');
SELECT 'MCLAW receivable='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_receivable' AND owner_id=:'mc1'))
  ||' backing='||account_balance((SELECT id FROM accounts WHERE account_type='coin_backing' AND funder_key='merchant:'||:'mcf')) AS mc_result;
-- expect receivable=5000 backing=5000

-- 2) CHURN_SWEEP: merchant with 50฿ leftover escrow closes → swept to breakage
SELECT fn_prefund(:'cs', :'cid', 5000, 0, 'promptpay', 'cs-pf');
SELECT fn_psp_settle(:'cs', :'cid', 5000, 'promptpay', 'cs-st');
SELECT fn_churn_sweep(:'cs', 'cs-1');
SELECT 'CHURN escrow='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_escrow' AND owner_id=:'cs'))
  ||' state='||(SELECT trust_state::text FROM merchants WHERE id=:'cs') AS churn_result;
-- expect escrow=0 state=closed

-- 3) OWNERSHIP_TRANSFER: seed ot1 a 30฿ payable, transfer place pot → ot2, payable migrates
SELECT get_or_create_account('platform_revenue','platform',NULL,NULL,NULL,'THB','CR',:'cid') AS arev \gset
SELECT get_or_create_account('merchant_payable','merchant',:'ot1',NULL,NULL,'THB','CR',:'cid') AS apay1 \gset
INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id) VALUES('PAYOUT','ot-seed','hots',:'cid') RETURNING id AS stx \gset
INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
  (:'stx',:'arev','DR',3000,'THB','platform',:'cid'),
  (:'stx',:'apay1','CR',3000,'THB','platform',:'cid');
SELECT fn_ownership_transfer(:'pot', :'ot2', 'ot-1');
SELECT 'OWNER match='||((SELECT merchant_id FROM places WHERE id=:'pot') = :'ot2'::uuid)::text
  ||' oldpay='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_payable' AND owner_id=:'ot1'))
  ||' newpay='||account_balance((SELECT id FROM accounts WHERE account_type='merchant_payable' AND owner_id=:'ot2')) AS owner_result;
-- expect match=true oldpay=0 newpay=3000

-- 4) CAMPAIGN_END: seed sponsor budget 80฿, end campaign → forfeited
SELECT get_or_create_account('bank_settlement','platform',NULL,NULL,NULL,'THB','DR',:'cid') AS abank \gset
SELECT get_or_create_account('sponsor_budget','sponsor',:'sp',NULL,NULL,'THB','CR',:'cid') AS asb \gset
INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id) VALUES('PREFUND','sp-seed','hsp',:'cid') RETURNING id AS stx2 \gset
INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
  (:'stx2',:'abank','DR',8000,'THB','platform',:'cid'),
  (:'stx2',:'asb','CR',8000,'THB','platform',:'cid');
SELECT fn_campaign_end(:'sp', :'cid', 8000, 'ce-1');
SELECT 'CAMPAIGN sponsor_budget='||account_balance((SELECT id FROM accounts WHERE account_type='sponsor_budget' AND owner_id=:'sp')) AS campaign_result;
-- expect 0

-- 5) AFFILIATE: booking commission → platform_revenue
SELECT fn_affiliate(:'cid', 4000, 'af-1');
SELECT 'AFFILIATE txns='||(SELECT count(*) FROM ledger_transactions WHERE txn_type='AFFILIATE') AS affiliate_result;
-- expect txns=1

SELECT 'TX_OFFENDERS='||count(*) AS integrity FROM (
  SELECT txn_id,currency FROM ledger_entries GROUP BY txn_id,currency
  HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;
