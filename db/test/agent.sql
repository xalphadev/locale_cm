-- ============================================================================
-- Agent payout + withholding-tax acceptance test.
--   AGENT_PAYOUT : gross 1,000฿ → expense 1,000 / WHT 30 (3%) / reserve 300 (30%) / net 670 to bank
--   SoD          : creator == approver blocked
--   AGENT_CLAWBACK: pull 100฿ from reserve (NO single-sided clearing — must commit, A.8.1b ok)
--   WHT_REMIT    : remit accrued wht_payable → nets to 0
-- Run after 0001-0009. PostGIS-independent.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT gen_random_uuid() AS agu \gset
SELECT gen_random_uuid() AS ag  \gset
SELECT gen_random_uuid() AS cr  \gset
SELECT gen_random_uuid() AS ap  \gset
INSERT INTO users(id) VALUES (:'agu');
INSERT INTO agents(id,user_id,city_id,affiliation) VALUES (:'ag',:'agu',:'cid','cmu');

-- pay the agent 1,000 baht (100000 satang)
SELECT fn_agent_payout(:'ag', 100000, :'cr', :'ap', 'ag-pay');
SELECT 'AGENT_PAY exp='||account_balance((SELECT id FROM accounts WHERE account_type='platform_expense' AND city_id=:'cid'))
  ||' wht='||account_balance((SELECT id FROM accounts WHERE account_type='wht_payable' AND city_id=:'cid'))
  ||' reserve='||account_balance((SELECT id FROM accounts WHERE account_type='agent_reserve' AND owner_id=:'ag')) AS pay_result;
-- expect exp=100000 wht=3000 reserve=30000   (net 67000 went to bank)

-- SoD: creator == approver → blocked
SELECT fn_agent_payout(:'ag', 1, :'cr', :'cr', 'ag-pay-sod');   -- expect ERROR: agent payout SoD

-- clawback 100 baht from the held reserve (no clearing leg → must commit cleanly)
SELECT fn_agent_clawback(:'ag', 10000, 'ag-claw');
SELECT 'CLAWBACK exp='||account_balance((SELECT id FROM accounts WHERE account_type='platform_expense' AND city_id=:'cid'))
  ||' reserve='||account_balance((SELECT id FROM accounts WHERE account_type='agent_reserve' AND owner_id=:'ag')) AS claw_result;
-- expect exp=90000 reserve=20000

-- remit the withheld tax → wht_payable nets to 0 (read balance in a SEPARATE statement so it
-- sees the function's committed inserts, not the calling statement's snapshot)
SELECT 'WHT_REMIT remitted='||fn_wht_remit(:'cid', 'ag-remit') AS remit_result;          -- expect remitted=3000
SELECT 'WHT_AFTER wht_payable='||account_balance((SELECT id FROM accounts WHERE account_type='wht_payable' AND city_id=:'cid')) AS remit_after;  -- expect 0

-- ledger integrity after agent payout + clawback + remit
SELECT 'AG_OFFENDERS='||count(*) AS integrity FROM (
  SELECT txn_id,currency FROM ledger_entries GROUP BY txn_id,currency
  HAVING SUM(CASE WHEN direction='DR' THEN amount_minor ELSE -amount_minor END) <> 0) x;
