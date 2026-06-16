-- 0023_dual_points.sql — DUAL NON-MONEY LOYALTY: Stamps (per-shop) + Sparks (platform).
--
-- The everyday loyalty layer. TWO non-money, NON-CASHABLE, non-transferable point currencies that
-- NEVER touch the ledger/accounts/coin_lots and NEVER extend the `currency` enum — so they sit
-- outside Thai BoT e-money scope (no stored monetary value, no float, no settlement, in-kind only):
--
--   STAMPS ("แต้มร้าน") — a per-BRAND digital punch card the shop fully controls and funds IN KIND
--     (a free coffee, a discount, a privilege). Grain = (user_id, brand_id) so a regular collects
--     across all branches/สาขา of the same ร้าน (the 0022 model); every event also stamps place_id
--     for per-branch analytics. Mutable counter (stamp_balances, floored >=0) + append-only log
--     (stamp_events). Redeemable ONLY for that brand's own goods. No escrow, no KYC, no take-rate.
--
--   SPARKS ("✦ แต้มแอป") — the EXISTING platform XP currency (spark_balances/spark_events, non-money
--     per A.3), finally given (a) a balance>=0 floor it lacked, and (b) a redemption SINK it never
--     had (cosmetics / streak-freeze / sponsor perks — see platform_rewards + spend_sparks).
--
-- Strict separation: different tables, different screens, NO conversion in any direction, never a
-- ฿ figure on either. The ONLY interplay is that ONE geofenced check-in fans out TWO independent
-- awards (a brand Stamp + a variable Spark) — a shared trigger, not a shared balance.
--
-- Coins/escrow (0001-0012) are UNTOUCHED and stay dormant for everyday use (additive migration,
-- ZERO money-plane writes — same invariant as 0022). Functions referencing PostGIS (fn_shop_checkin)
-- are created with the dev stub's check_function_bodies=off, mirroring fn_check_in (0006).

-- ════════ A. STAMP PROGRAM CONFIG (per-brand; portal plane) ════════
CREATE TABLE IF NOT EXISTS stamp_programs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      uuid NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,  -- one program per BRAND
  city_id       uuid REFERENCES cities(id),
  points_name_i18n      jsonb NOT NULL DEFAULT '{"th":"แต้ม"}'::jsonb,   -- the shop's own word (ดาว/แต้ม/ดวงตรา)
  base_stamps_per_visit int  NOT NULL DEFAULT 1,
  tier_multipliers      jsonb NOT NULL DEFAULT '{"gps_dwell":0,"verified_visit":1,"proven_purchase":1}'::jsonb, -- dwell earns 0 (anti-farm)
  per_user_daily_cap    int  NOT NULL DEFAULT 1,
  earn_cooldown_minutes int  NOT NULL DEFAULT 0,
  expiry_days           int,                                  -- NULL = never (V1 default)
  boost_multiplier      numeric, boost_starts_at timestamptz, boost_ends_at timestamptz,  -- Growth+ promo window
  status        text NOT NULL DEFAULT 'active',               -- active | paused
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stamp_programs_brand ON stamp_programs(brand_id) WHERE status='active';

-- ════════ B. STAMP BALANCE (per user per brand; mutable counter, NOT money) ════════
CREATE TABLE IF NOT EXISTS stamp_balances (
  user_id         uuid NOT NULL REFERENCES users(id),
  brand_id        uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  city_id         uuid REFERENCES cities(id),
  balance         int  NOT NULL DEFAULT 0 CHECK (balance >= 0),  -- HARD FLOOR
  lifetime_earned int  NOT NULL DEFAULT 0,                       -- for tiers/CRM; never decremented
  first_visit_at  timestamptz,                                   -- new-vs-returning (P1/P2) primitive
  last_earned_at  timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);
CREATE INDEX IF NOT EXISTS idx_stamp_bal_brand ON stamp_balances(brand_id);

-- ════════ C. STAMP EVENTS (append-only; mirror spark_events) ════════
CREATE TABLE IF NOT EXISTS stamp_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id),
  brand_id    uuid NOT NULL REFERENCES brands(id),
  place_id    uuid REFERENCES places(id),          -- which BRANCH (per-branch analytics)
  delta       int  NOT NULL,                        -- + earn / - redeem
  reason      text NOT NULL,                        -- earn_checkin | earn_promo | redeem | adjust | expiry
  ref_id      uuid,                                 -- check_in_id | shop_redemption_id
  city_id     uuid REFERENCES cities(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stamp_evt_user_brand   ON stamp_events(user_id, brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stamp_evt_brand_branch ON stamp_events(brand_id, place_id, created_at);

-- ════════ D. REWARD / PRIVILEGE CATALOG (denominated in the brand's own Stamps) ════════
CREATE TABLE IF NOT EXISTS stamp_rewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid NOT NULL REFERENCES stamp_programs(id) ON DELETE CASCADE,
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  city_id       uuid REFERENCES cities(id),
  title_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb, description_i18n jsonb, image_urls text[],
  kind          text NOT NULL DEFAULT 'free_item',  -- free_item | discount | privilege (สิทธิพิเศษ)
  cost_stamps   int  NOT NULL CHECK (cost_stamps > 0),
  audience_filter text[],                            -- reuse deals pattern (local/nomad/tourist)
  quota         int, redeemed_count int NOT NULL DEFAULT 0,   -- NULL = unlimited
  starts_at timestamptz, ends_at timestamptz,
  status        text NOT NULL DEFAULT 'active',       -- active | paused | expired
  sort          int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stamp_rewards_brand ON stamp_rewards(brand_id, status);

-- ════════ E. PROMOTIONS / MULTIPLIERS (Growth+) ════════
CREATE TABLE IF NOT EXISTS stamp_promotions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid NOT NULL REFERENCES stamp_programs(id) ON DELETE CASCADE,
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  kind          text NOT NULL,                        -- multiplier | flat_bonus | signup_bonus
  multiplier    numeric, flat_bonus int,
  audience_filter text[],
  starts_at timestamptz, ends_at timestamptz,
  status        text NOT NULL DEFAULT 'scheduled',     -- scheduled | active | paused | expired
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stamp_promos_brand ON stamp_promotions(brand_id, status);

-- ════════ F. SHOP REDEMPTION (idempotent; merchant-OTP confirm, NO static customer QR) ════════
CREATE TABLE IF NOT EXISTS shop_redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id),
  brand_id      uuid NOT NULL REFERENCES brands(id),
  place_id      uuid REFERENCES places(id),           -- branch where fulfilled
  city_id       uuid REFERENCES cities(id),
  reward_id     uuid NOT NULL REFERENCES stamp_rewards(id),
  cost_stamps   int  NOT NULL,
  initiation    redeem_init NOT NULL DEFAULT 'merchant_otp',  -- reuse enum (merchant_qr|merchant_otp)
  nonce         text, valid_until timestamptz,        -- single-use, short TTL
  linked_check_in_id uuid REFERENCES check_ins(id),
  idempotency_key text NOT NULL UNIQUE,               -- anti double-burn
  status        text NOT NULL DEFAULT 'pending',      -- pending | fulfilled | expired | cancelled
  created_at timestamptz NOT NULL DEFAULT now(), fulfilled_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_redeem_nonce ON shop_redemptions(nonce) WHERE nonce IS NOT NULL;

-- ════════ G. ANTI-FARM daily-earn cap (1 earn / user / brand / day, UTC+7 bucket) ════════
CREATE TABLE IF NOT EXISTS checkin_daily_caps (
  user_id   uuid NOT NULL REFERENCES users(id),
  brand_id  uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  earn_date date NOT NULL,
  earn_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, brand_id, earn_date)
);

-- ════════ H. SPARKS — add the balance floor it lacks (no enum ALTER) ════════
DO $$ BEGIN
  ALTER TABLE spark_balances ADD CONSTRAINT spark_balance_nonneg CHECK (balance >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════ I. PLATFORM REWARD CATALOG (Sparks sink: cosmetics / streak-freeze / sponsor perks) ════════
CREATE TABLE IF NOT EXISTS platform_rewards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id     uuid REFERENCES cities(id),
  kind        text NOT NULL,                          -- cosmetic | streak_freeze | partner_perk
  name_i18n   jsonb NOT NULL DEFAULT '{}'::jsonb, description_i18n jsonb, image_url text,
  cost_sparks int  NOT NULL CHECK (cost_sparks > 0),
  is_transferable boolean NOT NULL DEFAULT false CHECK (is_transferable = false),  -- MUST stay false
  funded_by   text,                                    -- NULL(cosmetic) | sponsor:<id> | platform_goodwill
  inventory   int, claimed_count int NOT NULL DEFAULT 0,  -- fixed exhaustible pool; first-come, NEVER random
  requires_permit_ref text,                             -- ม.8 ref; NULL + real value => keep flag OFF
  starts_at timestamptz, ends_at timestamptz,
  status      text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ J. SPARK SPEND LEDGER + non-transferable cosmetics ════════
CREATE TABLE IF NOT EXISTS spark_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  reward_id   uuid NOT NULL REFERENCES platform_rewards(id),
  cost_sparks int  NOT NULL CHECK (cost_sparks > 0),
  idempotency_key text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'fulfilled',
  city_id     uuid REFERENCES cities(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_cosmetics (   -- non-transferable BY DESIGN (no owner-change column, no gifting path)
  user_id     uuid NOT NULL REFERENCES users(id),
  reward_id   uuid NOT NULL REFERENCES platform_rewards(id),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_id)
);

-- ════════ K. append-only guard on the stamp ledger (reuse 0003 trigger fn) ════════
DROP TRIGGER IF EXISTS trg_stamp_events_immutable ON stamp_events;
CREATE TRIGGER trg_stamp_events_immutable BEFORE UPDATE OR DELETE ON stamp_events
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();

-- ════════ config helper (NULL-safe numeric read from platform_config; jsonb scalar) ════════
CREATE OR REPLACE FUNCTION cfg_num(p_key text, p_default numeric)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM platform_config
                    WHERE key = p_key AND city_id IS NULL LIMIT 1), p_default);
$$;

-- ════════ FUNCTIONS (idempotent, FOR UPDATE; NO ledger/accounts writes, NO take-rate) ════════

-- award_shop_points: the Stamp earn/burn primitive. INSERT append-only event + UPSERT floored balance.
-- Positive delta = earn (sets first_visit_at on first row, bumps lifetime_earned); negative = redeem.
CREATE OR REPLACE FUNCTION award_shop_points(
  p_user uuid, p_brand uuid, p_place uuid, p_delta int, p_reason text, p_ref uuid, p_city uuid
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_bal int;
BEGIN
  IF p_delta = 0 THEN
    SELECT balance INTO v_bal FROM stamp_balances WHERE user_id=p_user AND brand_id=p_brand;
    RETURN COALESCE(v_bal, 0);
  END IF;
  INSERT INTO stamp_events(user_id,brand_id,place_id,delta,reason,ref_id,city_id)
    VALUES(p_user,p_brand,p_place,p_delta,p_reason,p_ref,p_city);
  INSERT INTO stamp_balances(user_id,brand_id,city_id,balance,lifetime_earned,first_visit_at,last_earned_at)
    VALUES(p_user,p_brand,p_city,GREATEST(0,p_delta),GREATEST(0,p_delta),now(),now())
  ON CONFLICT (user_id,brand_id) DO UPDATE
    SET balance         = stamp_balances.balance + p_delta,          -- CHECK(balance>=0) fails closed on over-burn
        lifetime_earned = stamp_balances.lifetime_earned + GREATEST(0,p_delta),
        last_earned_at  = now(),
        updated_at      = now()
  RETURNING balance INTO v_bal;
  RETURN v_bal;
END $$;

-- fn_redeem_stamps: confirm a pending shop_redemption at the counter. Fail-closed balance + quota gates.
CREATE OR REPLACE FUNCTION fn_redeem_stamps(p_redemption uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE r shop_redemptions%ROWTYPE; v_bal int; v_quota int; v_used int;
BEGIN
  SELECT * INTO r FROM shop_redemptions WHERE id=p_redemption FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'redeem_stamps: % not found', p_redemption; END IF;
  IF r.status <> 'pending' THEN RETURN r.status; END IF;                 -- idempotent
  SELECT balance INTO v_bal FROM stamp_balances WHERE user_id=r.user_id AND brand_id=r.brand_id FOR UPDATE;
  IF COALESCE(v_bal,0) < r.cost_stamps THEN
    RAISE EXCEPTION 'redeem_stamps: insufficient stamps (% < %)', COALESCE(v_bal,0), r.cost_stamps; END IF;
  SELECT quota, redeemed_count INTO v_quota, v_used FROM stamp_rewards WHERE id=r.reward_id FOR UPDATE;
  IF v_quota IS NOT NULL AND v_used >= v_quota THEN RAISE EXCEPTION 'redeem_stamps: reward sold out'; END IF;
  PERFORM award_shop_points(r.user_id, r.brand_id, r.place_id, -r.cost_stamps, 'redeem', r.id, r.city_id);
  UPDATE stamp_rewards SET redeemed_count = redeemed_count + 1 WHERE id=r.reward_id;
  UPDATE shop_redemptions SET status='fulfilled', fulfilled_at=now() WHERE id=p_redemption;
  RETURN 'fulfilled';
END $$;

-- spend_sparks: the Sparks SINK. Floored debit + record spend in spark ledger (no enum ALTER:
-- the spend posts a negative spark_event with reason 'admin_adjust') + grant cosmetic / pool item.
CREATE OR REPLACE FUNCTION spend_sparks(p_user uuid, p_reward uuid, p_idem text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE rw platform_rewards%ROWTYPE; v_bal bigint; v_city uuid; v_red uuid;
BEGIN
  SELECT id INTO v_red FROM spark_redemptions WHERE idempotency_key=p_idem;
  IF v_red IS NOT NULL THEN RETURN v_red; END IF;                        -- idempotent
  SELECT * INTO rw FROM platform_rewards WHERE id=p_reward FOR UPDATE;
  IF rw.id IS NULL THEN RAISE EXCEPTION 'spend_sparks: reward % not found', p_reward; END IF;
  IF rw.status <> 'active' THEN RAISE EXCEPTION 'spend_sparks: reward not active'; END IF;
  IF rw.inventory IS NOT NULL AND rw.claimed_count >= rw.inventory THEN
    RAISE EXCEPTION 'spend_sparks: out of stock'; END IF;
  SELECT balance, city_id INTO v_bal, v_city FROM spark_balances WHERE user_id=p_user FOR UPDATE;
  IF COALESCE(v_bal,0) < rw.cost_sparks THEN
    RAISE EXCEPTION 'spend_sparks: insufficient sparks (% < %)', COALESCE(v_bal,0), rw.cost_sparks; END IF;
  UPDATE spark_balances SET balance = balance - rw.cost_sparks, updated_at=now() WHERE user_id=p_user;
  INSERT INTO spark_events(user_id,delta,reason,ref_id,city_id)
    VALUES(p_user, -rw.cost_sparks, 'admin_adjust', p_reward, v_city);
  INSERT INTO spark_redemptions(user_id,reward_id,cost_sparks,idempotency_key,city_id)
    VALUES(p_user,p_reward,rw.cost_sparks,p_idem,v_city) RETURNING id INTO v_red;
  IF rw.kind='cosmetic' THEN
    INSERT INTO user_cosmetics(user_id,reward_id) VALUES(p_user,p_reward) ON CONFLICT DO NOTHING;
  END IF;
  IF rw.inventory IS NOT NULL THEN
    UPDATE platform_rewards SET claimed_count = claimed_count + 1 WHERE id=p_reward;
  END IF;
  RETURN v_red;
END $$;

-- fn_shop_checkin: server-authoritative geofence (PostGIS ST_DWithin, mirror fn_check_in) → record
-- check_in → if the place's brand runs an active program, earn Stamps (tier×, daily cap, boost) →
-- ALWAYS award variable Sparks (base + first-of-day jackpot), even at brand-less places. NOT quest-bound.
-- Requires PostGIS at RUNTIME; created under check_function_bodies=off in the local stub (no PostGIS).
CREATE OR REPLACE FUNCTION fn_shop_checkin(
  p_user uuid, p_place uuid, p_lng double precision, p_lat double precision,
  p_method checkin_method, p_device uuid, p_radius_m int DEFAULT 80
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_city uuid; v_merchant uuid; v_geo geography; v_brand uuid;
  tier trust_tier; cin uuid; prog stamp_programs%ROWTYPE;
  v_mult numeric; v_earn int := 0; v_today int; v_spark bigint; v_stamp_bal int;
BEGIN
  SELECT city_id, merchant_id, geo, brand_id INTO v_city, v_merchant, v_geo, v_brand FROM places WHERE id=p_place;
  IF v_city IS NULL THEN RAISE EXCEPTION 'shop_checkin: place % not found', p_place; END IF;
  IF NOT ST_DWithin(v_geo, ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography, p_radius_m) THEN
    RAISE EXCEPTION 'shop_checkin: outside geofence (>% m)', p_radius_m;
  END IF;
  tier := CASE WHEN p_method IN ('rotating_qr','merchant_otp') THEN 'verified_visit'
               WHEN p_method='receipt' THEN 'proven_purchase' ELSE 'gps_dwell' END;
  INSERT INTO check_ins(user_id,place_id,merchant_id,city_id,trust_tier,method,device_id)
    VALUES(p_user,p_place,v_merchant,v_city,tier,p_method,p_device) RETURNING id INTO cin;

  -- (1) STAMPS — only if the brand runs an active program
  IF v_brand IS NOT NULL THEN
    SELECT * INTO prog FROM stamp_programs WHERE brand_id=v_brand AND status='active';
    IF prog.id IS NOT NULL THEN
      v_mult := COALESCE((prog.tier_multipliers ->> tier::text)::numeric, 0);
      v_earn := floor(prog.base_stamps_per_visit * v_mult);
      IF prog.boost_multiplier IS NOT NULL
         AND now() BETWEEN COALESCE(prog.boost_starts_at, now()) AND COALESCE(prog.boost_ends_at, now()) THEN
        v_earn := floor(v_earn * prog.boost_multiplier);
      END IF;
      IF v_earn > 0 THEN
        INSERT INTO checkin_daily_caps(user_id,brand_id,earn_date,earn_count)
          VALUES(p_user, v_brand, (now() AT TIME ZONE 'Asia/Bangkok')::date, 1)
        ON CONFLICT (user_id,brand_id,earn_date) DO UPDATE
          SET earn_count = checkin_daily_caps.earn_count + 1
        RETURNING earn_count INTO v_today;
        IF prog.per_user_daily_cap IS NULL OR v_today <= prog.per_user_daily_cap THEN
          v_stamp_bal := award_shop_points(p_user, v_brand, p_place, v_earn, 'earn_checkin', cin, v_city);
        ELSE
          v_earn := 0;   -- over the daily cap → no stamp this visit
        END IF;
      END IF;
    END IF;
  END IF;

  -- (2) SPARKS — always (platform XP), variable: base + first-check-in-of-day jackpot
  v_spark := cfg_num('SPARK_CHECKIN_BASE', 5)::bigint;
  IF NOT EXISTS (
    SELECT 1 FROM spark_events WHERE user_id=p_user AND reason='checkin'
       AND (created_at AT TIME ZONE 'Asia/Bangkok')::date = (now() AT TIME ZONE 'Asia/Bangkok')::date
  ) THEN
    v_spark := v_spark + cfg_num('SPARK_FIRST_OF_DAY_JACKPOT', 15)::bigint;
  END IF;
  PERFORM award_sparks(p_user, v_spark, 'checkin', cin, v_city);

  RETURN jsonb_build_object(
    'check_in_id', cin, 'tier', tier,
    'stamps_earned', COALESCE(v_earn,0), 'stamp_balance', v_stamp_bal, 'sparks_earned', v_spark);
END $$;

-- ════════ L. role grants (non-money writers; mirror the 0006 grant style) ════════
GRANT INSERT, SELECT ON stamp_events, spark_redemptions TO money_writer;
GRANT INSERT, UPDATE, SELECT ON stamp_balances, shop_redemptions, checkin_daily_caps, user_cosmetics TO money_writer;
GRANT SELECT ON stamp_programs, stamp_rewards, stamp_promotions, platform_rewards TO money_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO money_writer;

-- ════════ M. seed config keys (externalize the formerly hard-coded flat 5 Sparks + new params) ════════
INSERT INTO platform_config(key, value, city_id) VALUES
  ('SPARK_CHECKIN_BASE','5',NULL),
  ('SPARK_FIRST_OF_DAY_JACKPOT','15',NULL),
  ('SPARK_DAILY_EARN_CAP','60',NULL),
  ('STAMP_DEFAULT_VISITS_TO_REWARD','6',NULL),
  ('STREAK_FREEZE_SPARK_COST','25',NULL),
  ('STREAK_FREEZE_MONTHLY_CAP','2',NULL),
  ('GEO_COARSE_PURGE_DAYS','30',NULL)
ON CONFLICT (key) DO NOTHING;
