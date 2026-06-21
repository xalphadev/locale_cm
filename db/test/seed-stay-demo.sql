-- Demo stay inventory so the /stay discovery home has populated rails (no money — search/display only).
-- Idempotent: re-running replaces the 'd0000000-%' seed set.
BEGIN;
DELETE FROM reviews     WHERE place_id IN (SELECT id FROM places WHERE id::text LIKE 'd0000000-%');
DELETE FROM stay_units  WHERE place_id IN (SELECT id FROM places WHERE id::text LIKE 'd0000000-%');
DELETE FROM places      WHERE id::text LIKE 'd0000000-%';

WITH city AS (SELECT city_id cid FROM places LIMIT 1),
ins(id, kind, slug, th, en, lng, lat) AS (VALUES
  ('d0000000-0000-4000-8000-000000000001'::uuid,'dorm','santitham','หอพักสันติธรรม เรสซิเดนซ์','Santitham Residence',98.978,18.802),
  ('d0000000-0000-4000-8000-000000000002'::uuid,'apartment','nimman','นิมมาน ลิฟวิ่ง อพาร์ตเมนต์','Nimman Living Apartment',98.967,18.799),
  ('d0000000-0000-4000-8000-000000000003'::uuid,'condo','nimman','เดอะ นิมมาน คอนโด','The Nimman Condo',98.969,18.797),
  ('d0000000-0000-4000-8000-000000000004'::uuid,'house','suthep','บ้านสวนเชิงดอย','Doi Garden House',98.952,18.804),
  ('d0000000-0000-4000-8000-000000000005'::uuid,'apartment','santitham','สันติธรรม สตูดิโอ','Santitham Studio',98.979,18.800),
  ('d0000000-0000-4000-8000-000000000006'::uuid,'dorm','suthep','มช. ดอร์ม','CMU Dorm',98.953,18.806),
  ('d0000000-0000-4000-8000-000000000007'::uuid,'hotel','old_city','โรงแรมเมืองเก่า บูทีค','Old City Boutique Hotel',98.985,18.788),
  ('d0000000-0000-4000-8000-000000000008'::uuid,'hostel','nimman','นิมมาน แบ็คแพ็ค โฮสเทล','Nimman Backpack Hostel',98.966,18.801),
  ('d0000000-0000-4000-8000-000000000009'::uuid,'guesthouse','old_city','เกสต์เฮาส์ประตูท่าแพ','Tha Phae Guesthouse',98.993,18.787),
  ('d0000000-0000-4000-8000-000000000010'::uuid,'homestay','riverside','โฮมสเตย์ริมน้ำปิง','Ping Riverside Homestay',99.005,18.792),
  ('d0000000-0000-4000-8000-000000000011'::uuid,'hotel','nimman','นิมมาน แกรนด์ โฮเทล','Nimman Grand Hotel',98.968,18.796),
  ('d0000000-0000-4000-8000-000000000012'::uuid,'guesthouse','santitham','บ้านสันติ เกสต์เฮาส์','Baan Santi Guesthouse',98.977,18.803)
)
INSERT INTO places (id, city_id, category, stay_kind, district_id, name_i18n, geo, is_visible, offers_stay, status)
SELECT i.id, c.cid, 'see', i.kind, d.id, jsonb_build_object('th', i.th, 'en', i.en),
       'POINT(' || i.lng || ' ' || i.lat || ')', true, true, 'published'
  FROM ins i CROSS JOIN city c JOIN districts d ON d.slug = i.slug;

-- one unit per place (monthly 01-06, daily 07-12)
INSERT INTO stay_units (place_id, name_i18n, rental_mode, price_minor, price_period, capacity, available_units, daily_status, status, published_to_marketplace, availability_updated_at) VALUES
  ('d0000000-0000-4000-8000-000000000001','{"th":"ห้องสตูดิโอ","en":"Studio"}','monthly',350000,'month',1,4,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000002','{"th":"1 ห้องนอน","en":"1 Bedroom"}','monthly',800000,'month',2,3,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000003','{"th":"คอนโด 1 ห้องนอน","en":"1BR Condo"}','monthly',1200000,'month',2,2,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000004','{"th":"บ้านทั้งหลัง","en":"Whole House"}','monthly',1500000,'month',4,2,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000005','{"th":"สตูดิโอเล็ก","en":"Compact Studio"}','monthly',550000,'month',1,5,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000006','{"th":"ห้องพัดลม","en":"Fan Room"}','monthly',420000,'month',1,6,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000007','{"th":"ดีลักซ์","en":"Deluxe"}','daily',180000,'day',2,0,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000008','{"th":"เตียงในห้องรวม","en":"Dorm Bed"}','daily',45000,'day',1,0,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000009','{"th":"ห้องคู่","en":"Double Room"}','daily',90000,'day',2,0,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000010','{"th":"บ้านริมน้ำ","en":"Riverside Room"}','daily',120000,'day',3,0,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000011','{"th":"ซูพีเรียร์","en":"Superior"}','daily',250000,'day',2,0,'vacant','published',true,now()),
  ('d0000000-0000-4000-8000-000000000012','{"th":"ห้องมาตรฐาน","en":"Standard"}','daily',70000,'day',2,0,'vacant','published',true,now());

-- reviews (approved) on 4 places so "ยอดนิยม" (≥5 reviews) has content
INSERT INTO reviews (place_id, city_id, user_id, rating, moderation_status)
SELECT pp.id, (SELECT city_id FROM places LIMIT 1), uu.uid, uu.rating, 'approved'
  FROM (VALUES
    ('d0000000-0000-4000-8000-000000000002'::uuid),
    ('d0000000-0000-4000-8000-000000000003'::uuid),
    ('d0000000-0000-4000-8000-000000000004'::uuid),
    ('d0000000-0000-4000-8000-000000000007'::uuid),
    ('d0000000-0000-4000-8000-000000000009'::uuid),
    ('d0000000-0000-4000-8000-000000000011'::uuid)
  ) pp(id)
  CROSS JOIN (VALUES
    ('00000000-0000-4000-8000-000000000000'::uuid,5),
    ('00000000-0000-4000-8000-000000000001'::uuid,5),
    ('00000000-0000-4000-8000-000000000002'::uuid,4),
    ('00000000-0000-4000-8000-000000000003'::uuid,5),
    ('00000000-0000-4000-8000-000000000004'::uuid,4),
    ('00000000-0000-4000-8000-000000000005'::uuid,5)
  ) uu(uid, rating);
COMMIT;
