-- grants_app_roles.sql — provision the two NON-money app DB roles the Locale web apps connect as.
--
-- Context: the loyalty/auth server actions in apps/consumer + apps/web write to the DB DIRECTLY
-- (not through the money-plane API), and the loyalty plpgsql functions are NOT SECURITY DEFINER —
-- so they run with the CALLER's privileges. A role therefore needs INSERT/UPDATE on every table a
-- function it calls touches. This file grants those, on an ALLOWLIST basis:
--   • app_consumer  → apps/consumer  (check-in, stamp/spark, signup, saves/likes/comments)
--   • app_content   → apps/web       (merchant portal content + loyalty config + counter redeem)
-- Both get SELECT on everything (dashboards/wallet read broadly) and EXECUTE on all functions —
-- which is safe BECAUSE the functions are caller-rights: the table-level grants below are the real
-- gate, so neither role can ever write the ledger/money tables (those stay money_writer-only, the
-- canonical sole-ledger-writer invariant). A missing grant surfaces as a loud permission error in
-- testing (fail-safe), never a silent escalation.
--
-- Run AFTER db/deploy/apply-all.sh (tables/functions must exist). deploy.sh then sets LOGIN+password
-- on each role from .env.prod (passwords are intentionally NOT in this file).
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/deploy/grants_app_roles.sql

\set ON_ERROR_STOP on

-- 1) Roles (NOLOGIN until deploy.sh grants LOGIN+password) ------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_consumer') THEN CREATE ROLE app_consumer NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_content')  THEN CREATE ROLE app_content  NOLOGIN; END IF;
END $$;

-- 2) Baseline: read everything, use the schema, use any sequence, execute any function ---------
GRANT USAGE ON SCHEMA public TO app_consumer, app_content;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_consumer, app_content;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_consumer, app_content;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_consumer, app_content;
-- future objects (re-running migrations / new tables) inherit the same read/exec baseline
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_consumer, app_content;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_consumer, app_content;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO app_consumer, app_content;

-- 3) app_consumer writes (consumer-side, non-money) -------------------------------------------
--    direct writes: saves/likes/comments, signup identity, the pending stamp redemption row
--    function-reached writes (fn_shop_checkin, spend_sparks, award_shop_points): check-in ledger,
--    stamp + spark balances/events, cosmetics, platform_rewards.claimed_count
GRANT INSERT, UPDATE, DELETE ON
  saved_places, post_likes, post_comments, reviews,
  users, profiles, user_credentials, user_identities,
  shop_redemptions, check_ins, checkin_daily_caps,
  stamp_events, stamp_balances,
  spark_events, spark_balances, spark_redemptions,
  user_cosmetics,
  content_reports                               -- consumers report reviews/photos (moderation)
  TO app_consumer;
GRANT UPDATE ON platform_rewards TO app_consumer;   -- spend_sparks bumps claimed_count

-- 4) app_content writes (merchant portal + back-office content, non-money) ---------------------
--    merchant self-service: account/brand/branch/products/posts/rooms + loyalty program config.
--    counter redeem (fn_redeem_stamps) + manual award (award_shop_points) reach stamp_* tables.
GRANT INSERT, UPDATE, DELETE ON
  merchant_accounts, brands, places, shop_products, feed_posts, stay_units,
  stamp_programs, stamp_rewards, stamp_promotions,
  shop_redemptions, stamp_events, stamp_balances,
  place_claims,                                 -- 0027: ownership-claim verification (OTP + staff review)
  deals,                                        -- merchant self-serve promotions
  notif_outbox,                                 -- enqueue notifications (deal → savers)
  reviews, content_reports, fraud_cases,        -- back-office moderation + fraud handling
  payout_requests                               -- 0030: merchant withdrawal requests (intent only; ledger via money_writer)
  TO app_content;

-- 5) Report what was provisioned --------------------------------------------------------------
\echo '── app role grants applied ──'
SELECT rolname,
       (SELECT count(*) FROM information_schema.role_table_grants g
          WHERE g.grantee = r.rolname AND g.privilege_type IN ('INSERT','UPDATE','DELETE')) AS writable_table_grants
FROM pg_roles r WHERE rolname IN ('app_consumer','app_content') ORDER BY rolname;
