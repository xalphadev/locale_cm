-- ============================================================================
-- Ledger acceptance smoke test (the financial keystone).
-- PostGIS-independent: touches only accounts / ledger_transactions / ledger_entries.
-- Run after migrations 0001-0004. Expects: T1 commits; T2 rejected (A.8.1);
-- T3 rejected (A.8.1b clearing-flat); T4 append-only UPDATE blocked; T5 amount>0 CHECK.
-- ============================================================================
\set ON_ERROR_STOP off

SELECT id AS cid FROM cities WHERE code='CNX' \gset

INSERT INTO accounts(account_type,owner_type,currency,normal_balance,city_id) VALUES
  ('bank_settlement','platform','THB','DR',:'cid'),
  ('merchant_escrow','merchant','THB','CR',:'cid'),
  ('clearing','platform','THB','DR',:'cid'),
  ('platform_expense','platform','THB','DR',:'cid');

SELECT id AS a_bank  FROM accounts WHERE account_type='bank_settlement' LIMIT 1 \gset
SELECT id AS a_esc   FROM accounts WHERE account_type='merchant_escrow' LIMIT 1 \gset
SELECT id AS a_clear FROM accounts WHERE account_type='clearing'        LIMIT 1 \gset
SELECT id AS a_exp   FROM accounts WHERE account_type='platform_expense' LIMIT 1 \gset

-- ── T1: balanced THB txn → must COMMIT ──
BEGIN;
INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id)
  VALUES('PREFUND','idem-T1','h1',:'cid') RETURNING id AS t1 \gset
INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
  (:'t1',:'a_bank','DR',10000,'THB','platform',:'cid'),
  (:'t1',:'a_esc','CR',10000,'THB','platform',:'cid');
COMMIT;
SELECT '>>> T1 committed (balanced)' AS result;

-- ── T2: unbalanced per currency → must ROLLBACK (A.8.1) ──
BEGIN;
INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id)
  VALUES('PREFUND','idem-T2','h2',:'cid') RETURNING id AS t2 \gset
INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
  (:'t2',:'a_bank','DR',10000,'THB','platform',:'cid'),
  (:'t2',:'a_esc','CR', 9000,'THB','platform',:'cid');
COMMIT;  -- expect: ERROR A.8.1 violated

-- ── T3: clearing single-sided (per-currency balanced but clearing net != 0) → ROLLBACK (A.8.1b) ──
BEGIN;
INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id)
  VALUES('AGENT_CLAWBACK','idem-T3','h3',:'cid') RETURNING id AS t3 \gset
INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
  (:'t3',:'a_clear','DR',5000,'THB','platform',:'cid'),
  (:'t3',:'a_exp','CR',  5000,'THB','platform',:'cid');
COMMIT;  -- expect: ERROR A.8.1b violated (clearing net=5000)

-- ── T4: append-only — UPDATE on a committed ledger entry → blocked ──
UPDATE ledger_entries SET amount_minor = 1 WHERE txn_id = :'t1';  -- expect: ERROR append-only

-- ── T5: amount_minor > 0 CHECK ──
BEGIN;
INSERT INTO ledger_transactions(txn_type,idempotency_key,request_hash,city_id)
  VALUES('PREFUND','idem-T5','h5',:'cid') RETURNING id AS t5 \gset
INSERT INTO ledger_entries(txn_id,account_id,direction,amount_minor,currency,funded_by,city_id) VALUES
  (:'t5',:'a_bank','DR',0,'THB','platform',:'cid');  -- expect: ERROR check amount_minor>0
COMMIT;

-- ── Final assertion: only T1's 2 entries should persist (T2/T3/T5 rolled back) ──
SELECT count(*) AS persisted_entries FROM ledger_entries;  -- expect 2
