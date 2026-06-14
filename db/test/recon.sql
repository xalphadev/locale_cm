-- ============================================================================
-- S6 reconciliation + freeze acceptance test.
--   1) solvency reconciles clean after the full lifecycle (status=pass)
--   2) the freeze gate actually blocks a money op (fail-closed), then clears
--   3) an injected cache drift is DETECTED (status=break_detected)
-- Run last (after 0001-0008 + the other tests). PostGIS-independent.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset

-- 1) clean solvency after everything that ran before
SELECT 'RECON1 '||fn_reconcile_solvency(:'cid') AS recon1;     -- expect status=pass

-- 2) freeze gate: freeze PREFUND globally → fn_prefund must reject; then clear → works
SELECT gen_random_uuid() AS mz \gset
INSERT INTO merchants(id,city_id,display_name_i18n) VALUES(:'mz',:'cid','{"en":"Freeze test"}');
SELECT fn_set_freeze('global', ARRAY['PREFUND','GRANT']);
SELECT fn_prefund(:'mz', :'cid', 1000, 0, 'promptpay', 'rc-frozen');   -- expect ERROR: frozen
SELECT fn_clear_freeze('global');
SELECT fn_prefund(:'mz', :'cid', 1000, 0, 'promptpay', 'rc-ok');       -- now succeeds
SELECT 'FREEZE_CLEARED ok' AS freeze_result;

-- 3) inject a cache drift (active lot remaining no longer matches the ledger) → must be detected
UPDATE coin_lots SET remaining_minor = remaining_minor + 100
  WHERE id = (SELECT id FROM coin_lots WHERE state='active' AND city_id=:'cid' LIMIT 1);
SELECT 'RECON2 '||fn_reconcile_solvency(:'cid') AS recon2;     -- expect status=break_detected
