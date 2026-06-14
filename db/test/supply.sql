-- ============================================================================
-- Supply (moat) + EARN bridge acceptance test.
--   A) agent proposes a place edit → moderator approves (SoD) → place goes LIVE (version 2)
--   B) merchant claim → identity_verified → finance_verified (separate reviewers, SoD)
--   C) check-ins across 3 steps → quest completes → EARN→GRANT bridge auto-mints the reward
-- PostGIS-independent (fn_check_in geofence is tested on Supabase; here we drive fn_advance_quest
-- directly with pre-recorded check_ins). Run after 0001-0006.
-- ============================================================================
\set ON_ERROR_STOP off
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset

SELECT gen_random_uuid() AS agent_u \gset
SELECT gen_random_uuid() AS mod_u   \gset
SELECT gen_random_uuid() AS reva    \gset
SELECT gen_random_uuid() AS revb    \gset
SELECT gen_random_uuid() AS cust    \gset
SELECT gen_random_uuid() AS m       \gset
SELECT gen_random_uuid() AS m2      \gset
SELECT gen_random_uuid() AS p0      \gset
SELECT gen_random_uuid() AS p1      \gset
SELECT gen_random_uuid() AS p2      \gset
SELECT gen_random_uuid() AS p3      \gset
SELECT gen_random_uuid() AS qid     \gset
SELECT gen_random_uuid() AS prop    \gset
SELECT gen_random_uuid() AS prop2   \gset

INSERT INTO users(id) VALUES (:'agent_u'),(:'mod_u'),(:'reva'),(:'revb'),(:'cust');
INSERT INTO merchants(id,city_id,display_name_i18n) VALUES
  (:'m', :'cid','{"en":"Funder Cafe"}'),(:'m2',:'cid','{"en":"M2"}');
INSERT INTO places(id,city_id,district_id,category,name_i18n,geo,status) VALUES
  (:'p0',:'cid',:'did','eat','{"en":"Ristr8to"}', 'SRID=4326;POINT(98.967 18.796)','draft'),
  (:'p1',:'cid',:'did','eat','{"en":"Cafe 1"}',   'SRID=4326;POINT(98.968 18.797)','published'),
  (:'p2',:'cid',:'did','eat','{"en":"Cafe 2"}',   'SRID=4326;POINT(98.969 18.798)','published'),
  (:'p3',:'cid',:'did','eat','{"en":"Cafe 3"}',   'SRID=4326;POINT(98.970 18.799)','published');

-- ── A) MOAT: agent proposes → moderator approves → live version bump ──
INSERT INTO change_proposals(id,target_type,target_id,city_id,proposed_by,proposer_role,diff,status) VALUES
  (:'prop',  'place',:'p0',:'cid',:'agent_u','field_agent',
   '{"before":{"status":"draft"},"after":{"status":"published","opening_hours":{"mon_fri":"07:30-18:00"}}}','pending'),
  (:'prop2', 'place',:'p0',:'cid',:'agent_u','field_agent','{"after":{"is_visible":false}}','pending');

SELECT 'APPLY_OK version='||fn_apply_proposal(:'prop', :'mod_u') AS apply_result;       -- expect version=2
-- SoD: same person reviews their own proposal → must be blocked
SELECT fn_apply_proposal(:'prop2', :'agent_u');                                        -- expect ERROR: SoD

SELECT 'PLACE_LIVE status='||status||' v='||version FROM places WHERE id=:'p0';        -- published / 2

-- ── B) MERCHANT VERIFY: claimed → identity → finance, separate reviewers ──
SELECT fn_claim_verify(:'m','identity',:'reva',10);
SELECT 'TRUST='||fn_claim_verify(:'m','finance',:'revb',20) AS trust_result;           -- expect finance_verified
-- SoD: finance reviewed by the identity reviewer → blocked
SELECT fn_claim_verify(:'m2','identity',:'reva',10);
SELECT fn_claim_verify(:'m2','finance',:'reva',20);                                    -- expect ERROR: SoD

-- ── C) EARN→GRANT bridge: 3 verified check-ins → quest completes → auto-mint ──
-- fund the merchant (now finance_verified) and reserve a 60-baht quest pool
SELECT fn_prefund(:'m', :'cid', 10000, 0, 'promptpay', 'sup-pf');
SELECT id AS ewid FROM escrow_wallets WHERE owner_id=:'m' AND city_id=:'cid' \gset
SELECT fn_psp_settle(:'m', :'cid', 10000, 'promptpay', 'sup-st');
INSERT INTO quests(id,city_id,district_id,title_i18n,funding_escrow_wallet_id,reward_coin_minor,min_steps_required,status)
  VALUES(:'qid',:'cid',:'did','{"en":"Nimman Cafe-Hop"}',:'ewid',6000,3,'draft');
SELECT fn_fund_quest(:'qid', 6000, 'sup-fq');
UPDATE platform_config SET value='100'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';
UPDATE platform_config SET value='100000' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';

-- quest steps (3 cafes) + the customer's progress row
INSERT INTO quest_steps(id,quest_id,place_id,city_id,step_order,required_trust_tier,bonus_spark) VALUES
  (gen_random_uuid(),:'qid',:'p1',:'cid',1,'verified_visit',2),
  (gen_random_uuid(),:'qid',:'p2',:'cid',2,'verified_visit',2),
  (gen_random_uuid(),:'qid',:'p3',:'cid',3,'verified_visit',2);
INSERT INTO quest_progress(user_id,quest_id,city_id,status) VALUES(:'cust',:'qid',:'cid','in_progress');

-- simulate 3 verified check-ins (in prod these come from fn_check_in after geofence)
INSERT INTO check_ins(user_id,place_id,city_id,quest_step_id,trust_tier,method)
  SELECT :'cust', s.place_id, :'cid', s.id, 'verified_visit','rotating_qr' FROM quest_steps s WHERE s.quest_id=:'qid';

-- drive the bridge step by step; the 3rd completes the quest → auto fn_grant_coins
SELECT 'STEP1='||fn_advance_quest(:'cust',:'qid', s.id, c.id)
  FROM quest_steps s JOIN check_ins c ON c.quest_step_id=s.id WHERE s.quest_id=:'qid' AND s.step_order=1;
SELECT 'STEP2='||fn_advance_quest(:'cust',:'qid', s.id, c.id)
  FROM quest_steps s JOIN check_ins c ON c.quest_step_id=s.id WHERE s.quest_id=:'qid' AND s.step_order=2;
SELECT 'BRIDGE status='||fn_advance_quest(:'cust',:'qid', s.id, c.id)
  FROM quest_steps s JOIN check_ins c ON c.quest_step_id=s.id WHERE s.quest_id=:'qid' AND s.step_order=3;  -- completed

-- assert: a 6000 coin lot minted to the customer; quest_progress completed; Sparks accrued
SELECT 'EARN_GRANT lot_remaining='||COALESCE((SELECT remaining_minor FROM coin_lots WHERE user_id=:'cust'),-1)
  ||' qp='||(SELECT status::text FROM quest_progress WHERE user_id=:'cust' AND quest_id=:'qid')
  ||' sparks='||COALESCE((SELECT balance FROM spark_balances WHERE user_id=:'cust'),0) AS earn_result;
