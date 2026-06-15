-- ============================================================================
-- Interactive demo seed: a fresh customer with an IN-PROGRESS, FUNDED Nimman Cafe-Hop quest
-- (3 steps, 0 stamps), so the consumer app can check-in → collect stamps → complete → mint → redeem.
-- Idempotency keys carry the quest uuid so the seed is re-runnable. Caps are set so GRANT works.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset
SELECT gen_random_uuid() AS mf \gset
SELECT gen_random_uuid() AS mr \gset
\set du '00000000-0000-4000-8000-0000000000d0'
SELECT gen_random_uuid() AS q  \gset

INSERT INTO users(id) VALUES (:'du') ON CONFLICT DO NOTHING;
INSERT INTO merchants(id,city_id,display_name_i18n,trust_state) VALUES
  (:'mf',:'cid','{"en":"Demo Funder"}','finance_verified'),
  (:'mr',:'cid','{"th":"Graph Cafe","en":"Graph Cafe"}','finance_verified');

SELECT fn_prefund(:'mf', :'cid', 20000, 0, 'promptpay', 'idem-pf-'||:'q');
SELECT id AS ewid FROM escrow_wallets WHERE owner_id=:'mf' AND city_id=:'cid' \gset
SELECT fn_psp_settle(:'mf', :'cid', 20000, 'promptpay', 'idem-st-'||:'q');

INSERT INTO quests(id,city_id,district_id,title_i18n,description_i18n,funding_escrow_wallet_id,
                   reward_coin_minor,min_steps_required,is_featured,status)
  VALUES(:'q',:'cid',:'did','{"th":"นิมมาน คาเฟ่ฮ็อป","en":"Nimman Cafe-Hop"}',
         '{"th":"เดิน 3 คาเฟ่ในนิมมาน เก็บแสตมป์ครบรับฟรีกาแฟ"}',:'ewid',6000,3,true,'draft');
SELECT fn_fund_quest(:'q', 6000, 'idem-fq-'||:'q');
UPDATE platform_config SET value='100'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';
UPDATE platform_config SET value='100000' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';

-- 3 steps from 3 published places
INSERT INTO quest_steps(id,quest_id,place_id,city_id,step_order,required_trust_tier,bonus_spark)
  SELECT gen_random_uuid(), :'q', s.id, :'cid', s.rn, 'verified_visit', 3
  FROM (SELECT id, row_number() OVER (ORDER BY created_at) rn
        FROM places WHERE city_id=:'cid' AND status='published' LIMIT 3) s;
INSERT INTO quest_progress(user_id,quest_id,city_id,status) VALUES(:'du',:'q',:'cid','in_progress');
INSERT INTO spark_balances(user_id,city_id,balance) VALUES(:'du',:'cid',0) ON CONFLICT (user_id) DO NOTHING;

SELECT 'INTERACTIVE user='||:'du'||' quest='||:'q'||' partner='||:'mr' AS seeded;
