-- 0044_stay_amenity_catalog.sql — make the room amenity / building-facility / bills lists a CONTROLLED
-- VOCABULARY managed by the platform (admin), instead of hardcoded in 3 places (merchant constants.ts +
-- consumer facets.ts ×2). These keys are FILTERABLE facets on /stay (su.unit_amenities @> …,
-- su.attrs->'building' @> …), so they must stay a shared list — a merchant free-typing "ไวไฟ" would be
-- unfilterable. Unique one-off features live in stay_units.description_i18n (free text) instead.
-- Admin adds/edits rows here (no deploy); merchant form + consumer filter + both detail pages read from this.
CREATE TABLE IF NOT EXISTS stay_amenity (
  grp        text NOT NULL CHECK (grp IN ('amenity','building','bills')),  -- in-unit | common-area | bills-included
  key        text NOT NULL,                       -- stable code stored in unit_amenities[] / attrs.building[] / bills_included[]
  label_i18n jsonb NOT NULL,                       -- {"th":"แอร์"} (+ en later)
  icon       text,                                 -- optional icon name (consumer/merchant chips)
  sort       int  NOT NULL DEFAULT 100,
  active     boolean NOT NULL DEFAULT true,        -- hide without deleting (keeps existing rows' keys valid)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grp, key)
);

-- seed = the existing hardcoded lists + the market-coverage expansion the audit asked for. Idempotent.
INSERT INTO stay_amenity (grp, key, label_i18n, sort) VALUES
  -- in-unit amenities
  ('amenity','aircon',          '{"th":"แอร์"}',            10),
  ('amenity','fan',             '{"th":"พัดลม"}',           20),
  ('amenity','private_bath',    '{"th":"ห้องน้ำในตัว"}',     30),
  ('amenity','hot_water',       '{"th":"น้ำอุ่น"}',          40),
  ('amenity','balcony',         '{"th":"ระเบียง"}',          50),
  ('amenity','kitchen',         '{"th":"ครัว"}',            60),
  ('amenity','fridge',          '{"th":"ตู้เย็น"}',          70),
  ('amenity','microwave',       '{"th":"ไมโครเวฟ"}',        80),
  ('amenity','tv',              '{"th":"ทีวี"}',            90),
  ('amenity','desk',            '{"th":"โต๊ะทำงาน"}',       100),
  ('amenity','wardrobe',        '{"th":"ตู้เสื้อผ้า"}',      110),
  ('amenity','washing_machine', '{"th":"เครื่องซักผ้า"}',    120),
  ('amenity','parking',         '{"th":"ที่จอดรถ"}',        130),
  ('amenity','pets_ok',         '{"th":"เลี้ยงสัตว์ได้"}',   140),
  ('amenity','fiber_wifi',      '{"th":"เน็ตไฟเบอร์"}',     150),
  -- common-area / building facilities
  ('building','pool',            '{"th":"สระว่ายน้ำ"}',       10),
  ('building','gym',             '{"th":"ฟิตเนส"}',          20),
  ('building','lift',            '{"th":"ลิฟต์"}',           30),
  ('building','security',        '{"th":"รปภ."}',            40),
  ('building','cctv',            '{"th":"กล้องวงจรปิด"}',     50),
  ('building','garden',          '{"th":"สวน"}',            60),
  ('building','coworking',       '{"th":"โต๊ะทำงานส่วนกลาง"}', 70),
  ('building','laundry_room',    '{"th":"ห้องซักผ้า"}',       80),
  ('building','covered_parking', '{"th":"ที่จอดในร่ม"}',      90),
  ('building','playground',      '{"th":"สนามเด็กเล่น"}',     100),
  ('building','bbq',             '{"th":"พื้นที่ปิ้งย่าง"}',   110),
  ('building','convenience_store','{"th":"ร้านสะดวกซื้อ"}',    120),
  ('building','restaurant',      '{"th":"ร้านอาหาร"}',       130),
  ('building','sauna',           '{"th":"ซาวน่า"}',          140),
  -- bills included in rent
  ('bills','water',       '{"th":"น้ำ"}',        10),
  ('bills','electricity', '{"th":"ไฟ"}',         20),
  ('bills','wifi',        '{"th":"เน็ต"}',        30),
  ('bills','common_fee',  '{"th":"ส่วนกลาง"}',    40)
ON CONFLICT (grp, key) DO NOTHING;

COMMENT ON TABLE stay_amenity IS 'Admin-managed controlled vocabulary for room amenities / building facilities / included bills (filterable facets). Read by merchant form + consumer filter + detail pages.';
