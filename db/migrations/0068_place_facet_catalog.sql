-- 0068_place_facet_catalog.sql — the LAST hardcoded facet list moves into the DB. Place facets
-- ("นั่งทำงานได้", "ฮาลาล", "จุดถ่ายรูป"…) were duplicated in apps/consumer/lib/facets.ts AND
-- apps/web/lib/facets.ts — adding "vegan-certified" meant a deploy of both apps. Same rationale as
-- stay_amenity (0044): these tokens are FILTERABLE (places.amenities @> …), so they must stay a
-- controlled vocabulary — now admin-managed on /reports/amenities.
--   cats / subs = WHERE the facet is offered (merchant editor + consumer filter): a facet shows for
--   a place when subcategory ∈ subs, else category ∈ cats (same preference rule as the old facetsFor).
--   Inactive keys stop being offered but existing places' tokens still render (label lookup keeps all).
CREATE TABLE IF NOT EXISTS place_facet (
  key        text PRIMARY KEY,          -- stable token stored in places.amenities text[]
  label_i18n jsonb NOT NULL,            -- {"th":"นั่งทำงานได้"} (+ en later)
  cats       text[] NOT NULL DEFAULT '{}',  -- offer for these categories (eat|see|do) — fallback tier
  subs       text[] NOT NULL DEFAULT '{}',  -- offer for these subcategories — preferred tier
  sort       int NOT NULL DEFAULT 100,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- seed = the exact old hardcoded lists, mechanically inverted (facet → which subs/cats offered it),
-- sort = first-appearance order so the chip order customers saw stays identical. Idempotent.
INSERT INTO place_facet (key, label_i18n, cats, subs, sort) VALUES
  ('wifi', '{"th":"Wi-Fi"}', '{eat}', '{cafe}', 10),
  ('work_friendly', '{"th":"นั่งทำงานได้"}', '{eat}', '{cafe}', 20),
  ('power_outlet', '{"th":"มีปลั๊กไฟ"}', '{}', '{cafe}', 30),
  ('pet_friendly', '{"th":"สัตว์เลี้ยงได้"}', '{eat}', '{cafe}', 40),
  ('kid_friendly', '{"th":"เด็ก/ครอบครัว"}', '{eat,see}', '{cafe,dessert,museum}', 50),
  ('outdoor_seating', '{"th":"ที่นั่งกลางแจ้ง"}', '{}', '{cafe,bar}', 60),
  ('vegan', '{"th":"เมนูวีแกน"}', '{}', '{cafe,dessert}', 70),
  ('thai_food', '{"th":"อาหารไทย"}', '{eat}', '{restaurant,street_food}', 80),
  ('northern_food', '{"th":"อาหารเหนือ"}', '{}', '{restaurant}', 90),
  ('chinese_food', '{"th":"อาหารจีน"}', '{}', '{restaurant}', 100),
  ('buffet', '{"th":"บุฟเฟ่ต์"}', '{eat}', '{restaurant}', 110),
  ('live_music', '{"th":"ดนตรีสด"}', '{eat}', '{restaurant,bar}', 120),
  ('halal', '{"th":"ฮาลาล"}', '{eat}', '{restaurant,street_food}', 130),
  ('vegetarian', '{"th":"เมนูมังสวิรัติ"}', '{eat}', '{restaurant,street_food,dessert,cooking_class}', 140),
  ('no_pets', '{"th":"ห้ามนำสัตว์เลี้ยง"}', '{}', '{restaurant}', 150),
  ('alcohol', '{"th":"มีแอลกอฮอล์"}', '{}', '{restaurant,bar}', 160),
  ('late_night', '{"th":"เปิดดึก"}', '{}', '{street_food,market}', 170),
  ('parking', '{"th":"ที่จอดรถ"}', '{eat,see,do}', '{street_food,temple,viewpoint,market,spa}', 180),
  ('aircon', '{"th":"แอร์"}', '{}', '{dessert,museum}', 190),
  ('free_entry', '{"th":"เข้าฟรี"}', '{see}', '{temple,viewpoint}', 200),
  ('photo_spot', '{"th":"จุดถ่ายรูป"}', '{see}', '{temple,viewpoint,market,museum}', 210),
  ('guided_tour', '{"th":"มีไกด์นำชม"}', '{see}', '{temple,museum}', 220),
  ('wheelchair', '{"th":"รถเข็นเข้าได้"}', '{see}', '{temple,museum}', 230),
  ('restroom', '{"th":"มีห้องน้ำ"}', '{}', '{temple}', 240),
  ('sunset', '{"th":"ชมพระอาทิตย์ตก"}', '{}', '{viewpoint}', 250),
  ('local_crafts', '{"th":"ของคราฟต์ท้องถิ่น"}', '{}', '{market}', 260),
  ('english_speaking', '{"th":"บริการภาษาอังกฤษ"}', '{do}', '{cooking_class,spa,muay_thai,workshop}', 270),
  ('beginner_friendly', '{"th":"มือใหม่ได้"}', '{do}', '{cooking_class,muay_thai,workshop}', 280),
  ('booking_required', '{"th":"ต้องจองล่วงหน้า"}', '{do}', '{cooking_class,spa,workshop}', 290),
  ('pickup', '{"th":"รับ-ส่ง"}', '{do}', '{cooking_class}', 300),
  ('couple_room', '{"th":"ห้องคู่"}', '{}', '{spa}', 310),
  ('drop_in', '{"th":"วอล์กอินได้"}', '{}', '{muay_thai}', 320),
  ('materials_included', '{"th":"มีอุปกรณ์ให้"}', '{}', '{muay_thai,workshop}', 330)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE place_facet IS 'Admin-managed controlled vocabulary for place facets/highlights (filterable via places.amenities). Read by merchant shop editor + consumer home filter + place detail.';
