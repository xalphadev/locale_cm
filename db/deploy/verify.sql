-- Post-deploy sanity check. Run against the deployed (Supabase) DB:
--   psql "$DATABASE_URL" -f db/deploy/verify.sql
\echo '== schema objects =='
SELECT count(*) AS tables    FROM information_schema.tables WHERE table_schema='public';
SELECT count(*) AS txn_types FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='txn_type';
SELECT count(*) AS money_fns FROM pg_proc WHERE proname LIKE 'fn_%';

\echo '== base seed =='
SELECT code, name_i18n->>'en' AS city FROM cities;
SELECT slug, rollout_status FROM districts;
SELECT count(*) AS categories FROM place_categories;
SELECT count(*) AS roles FROM roles;

\echo '== fail-closed config (grants stay blocked until these are set) =='
SELECT key, value FROM platform_config
 WHERE key IN ('REWARD_PER_REDEMPTION_CAP_THB','MERCHANT_MONTHLY_COGS_CAP_THB');

\echo '== PostGIS present =='
SELECT extname, extversion FROM pg_extension WHERE extname='postgis';

\echo '== solvency reconciliation (fresh DB → trivially balanced, expect pass) =='
SELECT fn_reconcile_solvency((SELECT id FROM cities WHERE code='CNX')) AS recon;
