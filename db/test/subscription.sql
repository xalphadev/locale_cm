-- ============================================================================
-- Subscription revenue + VAT acceptance test (first-revenue path).
--   fn_subscribe (annual Growth, VAT-inclusive 12,840฿) → vat_output 840฿ now,
--     deferred_revenue 12,000฿ (recognized over the year)
--   fn_recognize_subscription → release 1 month (1,000฿) deferred → platform_revenue
--   fn_vat_remit → pay output VAT, nets vat_output_payable to 0
-- Run after 0001-0010. PostGIS-independent.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT gen_random_uuid() AS msub \gset
INSERT INTO merchants(id,city_id,display_name_i18n,trust_state) VALUES (:'msub',:'cid','{"en":"Sub Cafe"}','finance_verified');

-- annual Growth plan: gross 1,284,000 satang (VAT-incl) → VAT 84,000 / net deferred 1,200,000
SELECT fn_subscribe(:'msub', 'growth', 'annual', 1284000, 'sub-1') AS sub \gset
SELECT 'SUB deferred='||account_balance((SELECT id FROM accounts WHERE account_type='deferred_revenue' AND city_id=:'cid'))
  ||' vat='||account_balance((SELECT id FROM accounts WHERE account_type='vat_output_payable' AND city_id=:'cid')) AS sub_result;
-- expect deferred=1200000 vat=84000

-- recognize one month of revenue (1,200,000 / 12 = 100,000)
SELECT fn_recognize_subscription(:'sub', 100000, 'sub-rec1');
SELECT 'RECOGNIZE deferred='||account_balance((SELECT id FROM accounts WHERE account_type='deferred_revenue' AND city_id=:'cid')) AS rec_result;
-- expect deferred=1100000

-- remit output VAT (input = 0) → vat_output nets to 0 (read balance in a separate statement)
SELECT 'VAT_REMIT remitted='||fn_vat_remit(:'cid', 'vat-1') AS vat_result;          -- expect 84000
SELECT 'VAT_AFTER vat_output='||account_balance((SELECT id FROM accounts WHERE account_type='vat_output_payable' AND city_id=:'cid')) AS vat_after;  -- expect 0

SELECT 'SUB_OFFENDERS='||count(*) AS integrity FROM (
  SELECT txn_id,currency FROM ledger_entries GROUP BY txn_id,currency
  HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;
