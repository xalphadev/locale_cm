-- ============================================================================
-- Migration #1 — part 0004: Seed (roles, categories, CNX city + Nimman, config flags)
-- ============================================================================

-- ── 12 canonical roles ──
INSERT INTO roles (role, description) VALUES
  ('customer',         'End user / tourist / local'),
  ('platform_owner',   'Super admin; freeze override (dual-owner), role grant'),
  ('platform_admin',   'Operations admin'),
  ('merchant',         'Business account; manages own listings/escrow/redemptions'),
  ('field_agent',      'Paid data updater; submits change_proposals (never writes live)'),
  ('content_moderator','Reviews change_proposals + UGC; author<>moderator SoD'),
  ('city_manager',     'Per-city P&L, agent roster, density gate; cannot approve own content'),
  ('brand_sponsor',    'Funds quests/campaigns; analytics only, no listing edit'),
  ('support_cs',       'Tickets/disputes; compensation only via canonical ledger txns'),
  ('finance_payout',   'Payout batches; creator<>approver SoD; step-up MFA'),
  ('analyst_api',      'Read-only analytics (PDPA-safe, k-anonymity)'),
  ('dpo',              'Data Protection Officer; DSAR/erasure, PII unmask approval, breach')
ON CONFLICT (role) DO NOTHING;

-- ── Place categories (eat/see/do — starter set; extend without schema change) ──
INSERT INTO place_categories (category, subcategory, name_i18n, icon) VALUES
  ('eat','cafe',         '{"th":"คาเฟ่","en":"Cafe","zh":"咖啡馆"}','coffee'),
  ('eat','restaurant',   '{"th":"ร้านอาหาร","en":"Restaurant","zh":"餐厅"}','utensils'),
  ('eat','street_food',  '{"th":"สตรีทฟู้ด","en":"Street food","zh":"街头小吃"}','bowl'),
  ('eat','dessert',      '{"th":"ของหวาน","en":"Dessert","zh":"甜点"}','cake'),
  ('eat','bar',          '{"th":"บาร์","en":"Bar","zh":"酒吧"}','wine'),
  ('see','temple',       '{"th":"วัด","en":"Temple","zh":"寺庙"}','temple'),
  ('see','viewpoint',    '{"th":"จุดชมวิว","en":"Viewpoint","zh":"观景点"}','mountain'),
  ('see','market',       '{"th":"ตลาด","en":"Market","zh":"市场"}','market'),
  ('see','museum',       '{"th":"พิพิธภัณฑ์","en":"Museum","zh":"博物馆"}','museum'),
  ('do','cooking_class', '{"th":"คลาสทำอาหาร","en":"Cooking class","zh":"烹饪课"}','chef'),
  ('do','spa',           '{"th":"สปา","en":"Spa","zh":"水疗"}','spa'),
  ('do','muay_thai',     '{"th":"มวยไทย","en":"Muay Thai","zh":"泰拳"}','boxing'),
  ('do','workshop',      '{"th":"เวิร์กช็อป","en":"Workshop","zh":"工作坊"}','tools')
ON CONFLICT (category, subcategory) DO NOTHING;

-- ── Chiang Mai (beachhead city) + Nimman (launch district) ──
INSERT INTO cities (code, name_i18n, country_code, timezone, default_locale, is_live)
VALUES ('CNX', '{"th":"เชียงใหม่","en":"Chiang Mai","zh":"清迈"}', 'TH', 'Asia/Bangkok', 'th', false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO districts (city_id, name_i18n, slug, rollout_status, coverage_baseline)
SELECT c.id, '{"th":"นิมมานเหมินท์","en":"Nimman","zh":"宁曼"}', 'nimman', 'seeding', NULL
FROM cities c WHERE c.code='CNX'
ON CONFLICT (city_id, slug) DO NOTHING;

-- ── platform_config: fail-closed flags + defaults (real GRANT blocked until caps set) ──
-- COGS caps unset → grant_coins edge-fn must REJECT (fail-closed). goodwill pending legal sign-off.
INSERT INTO platform_config (key, value) VALUES
  ('TAKE_RATE_PCT',                  '10'),       -- effective floor 6% applied in edge-fn (pricing B.2)
  ('REWARD_PER_REDEMPTION_CAP_THB',  'null'),     -- ⛔ BLOCKING B1 — founder must set (fail-closed until then)
  ('MERCHANT_MONTHLY_COGS_CAP_THB',  'null'),     -- ⛔ BLOCKING B2 — founder must set
  ('MICRO_REDEMPTION_FREE_BELOW_THB','30'),       -- take-rate = 0 below this (pricing B.2)
  ('COIN_EXPIRY_DAYS',               '90'),       -- policy B/§A2.10 (legal/finance confirm)
  ('BANK_CHANGE_COOLDOWN_HOURS',     '72'),       -- SEAM-3 payout SoD
  ('PRO_TIER_ENABLED',               'false'),    -- enable after catchment count (pricing B.1.0)
  ('cogs_cap_unset',                 'true'),     -- flag: blocks real GRANT
  ('goodwill_pending',               'true')      -- flag: platform_goodwill_budget not active (legal)
ON CONFLICT (key) DO NOTHING;
