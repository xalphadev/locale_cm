-- ============================================================================
-- 0020_stay_units.sql — ที่พัก / accommodation vertical (NON-TRANSACTIONAL).
--
-- Structural TWIN of 0019 shop_products: a flat-status content table for rentable
-- units, self-owned image_urls[], retail rent in price_minor THB satang that is NEVER
-- joined to coin_lots / the ledger, and deliberately NOT routed through
-- change_proposals / fn_apply_proposal. The app SHOWCASES vacancy; the guest books
-- OFF-APP (LINE / phone). No booking calendar, no hold, no payment, no commission.
--
--   • One table holds BOTH rental modes via rental_mode (monthly|daily):
--       monthly → available_units (ว่างกี่ห้อง) + available_from (ว่างตั้งแต่เมื่อไหร่)
--       daily   → daily_status (vacant|full|ask  → ว่างวันนี้/เต็ม/สอบถาม)
--   • availability_updated_at = OWNER-attested vacancy freshness (separate from the
--     STAFF data_freshness seal). Bumped on every vacancy edit; the read side demotes
--     stale-vacant rows (no cron needed).
--   • Accommodations are flagged with places.offers_stay + stay_kind — NO place_cat
--     enum change (place_cat eat|see|do feeds fn_create_place / RLS / indexes / casts).
--     Stays live under category='see'.
-- ============================================================================

ALTER TABLE places ADD COLUMN IF NOT EXISTS offers_stay boolean NOT NULL DEFAULT false;
ALTER TABLE places ADD COLUMN IF NOT EXISTS stay_kind   text;   -- dorm|apartment|homestay|hotel|guesthouse|mixed
CREATE INDEX IF NOT EXISTS idx_places_stays ON places(city_id) WHERE status='published' AND offers_stay;

-- trilingual labels + icon for the new stay subcategories (fn_create_place tolerates a NULL
-- category_id, but seeding gives proper TH/EN/ZH labels + CAT_ICON resolution).
INSERT INTO place_categories (category, subcategory, name_i18n, icon) VALUES
  ('see','dorm',       '{"th":"หอพัก","en":"Dormitory","zh":"宿舍"}','bed'),
  ('see','apartment',  '{"th":"อพาร์ตเมนต์","en":"Apartment","zh":"公寓"}','bed'),
  ('see','homestay',   '{"th":"โฮมสเตย์","en":"Homestay","zh":"民宿"}','bed'),
  ('see','hotel',      '{"th":"โรงแรม","en":"Hotel","zh":"酒店"}','bed'),
  ('see','guesthouse', '{"th":"เกสต์เฮาส์","en":"Guesthouse","zh":"招待所"}','bed')
ON CONFLICT (category, subcategory) DO NOTHING;

CREATE TABLE IF NOT EXISTS stay_units (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        uuid NOT NULL REFERENCES places(id),
  merchant_id     uuid REFERENCES merchants(id),
  city_id         uuid REFERENCES cities(id),
  name_i18n       jsonb NOT NULL DEFAULT '{}',
  description_i18n jsonb,
  rental_mode     text NOT NULL DEFAULT 'monthly',   -- monthly | daily
  price_minor     bigint,                            -- plain RETAIL THB satang; NEVER joined to ledger/coin_lots
  price_period    text NOT NULL DEFAULT 'month',     -- month | night
  price_text_i18n jsonb,
  currency        text NOT NULL DEFAULT 'THB',
  image_urls      text[],
  image_count     int NOT NULL DEFAULT 1,
  -- availability (vacancy state, NOT a calendar)
  available_units int NOT NULL DEFAULT 0,            -- MONTHLY: ว่างกี่ห้อง (also the browse gate)
  available_from  date,                              -- MONTHLY: ว่างตั้งแต่เมื่อไหร่ (NULL = ทันที)
  daily_status    text NOT NULL DEFAULT 'ask',       -- DAILY: vacant | full | ask
  availability_updated_at timestamptz NOT NULL DEFAULT now(),  -- owner-attested vacancy freshness
  -- long-stay / room attributes
  capacity        int,                               -- ท่าน
  deposit_minor   bigint,                            -- มัดจำ (display only)
  min_stay        int,                               -- months (monthly) / nights (daily)
  room_size_sqm   int,
  furnished       text,                              -- furnished | partial | unfurnished
  bills_included  text[],                            -- {water,electricity,wifi,common_fee}
  unit_amenities  text[],                            -- aircon,private_bath,balcony,kitchen,washing_machine,parking,pets_ok,fiber_wifi
  sort            int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'published', -- pending | published | hidden
  author_kind     text NOT NULL DEFAULT 'merchant',  -- merchant | staff
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_units_place  ON stay_units(place_id, status);
CREATE INDEX IF NOT EXISTS idx_stay_units_browse ON stay_units(status, rental_mode, available_from, created_at DESC);
