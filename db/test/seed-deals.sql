-- ============================================================================
-- seed-deals.sql — demo promotions on the rich venues (active, with urgency/quota).
-- Agent-seeded places have merchant_id NULL, so deals reference a demo finance_verified
-- merchant for display. Re-runnable. Requires seed-venues first.
-- ============================================================================
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS mid FROM merchants WHERE trust_state='finance_verified' ORDER BY created_at LIMIT 1 \gset
DELETE FROM deals WHERE city_id=:'cid';

INSERT INTO deals(place_id, merchant_id, city_id, title_i18n, terms_i18n, deal_type, value_pct, value_minor, starts_at, ends_at, quota_total, quota_used, status)
SELECT p.id, :'mid', :'cid', d.title::jsonb, d.terms::jsonb, d.dtype::deal_type, d.pct, d.minor,
       now() - interval '1 day', now() + (d.days||' days')::interval, d.qtot, d.qused, 'active'
FROM (VALUES
  ('Rakngao Slow Bar & Roastery','{"th":"ลด 15% เครื่องดื่มทุกแก้ว","en":"15% off all drinks"}','{"th":"เฉพาะหน้าร้าน ไม่รวมเมล็ดกาแฟ"}','percent_off',15.0,NULL,3,80,63),
  ('Khao Soi Mae Sai Nimman','{"th":"ซื้อ 1 แถม 1 ข้าวซอยไก่","en":"Buy 1 get 1 chicken khao soi"}','{"th":"เฉพาะ 11:00–14:00"}','bogo',NULL,NULL,5,40,31),
  ('Coconut House Mango Sticky Rice & Shaved Ice','{"th":"ฟรีไอติมกะทิ เมื่อสั่งข้าวเหนียวมะม่วง","en":"Free coconut ice cream with mango sticky rice"}','{"th":"1 ที่ต่อ 1 บิล"}','freebie',NULL,NULL,7,60,22),
  ('Mokmok Coffee Roasters','{"th":"Happy Hour ลด 30 บาท บ่าย 2–5 โมง","en":"Happy Hour: ฿30 off, 2–5pm"}','{"th":"เฉพาะช่วงเวลาที่กำหนด"}','fixed_off',NULL,3000,2,50,44),
  ('Ruen Mai Lanna Herbal Spa','{"th":"นวดน้ำมัน 90 นาที จ่ายราคา 60 นาที","en":"90-min oil massage for the price of 60"}','{"th":"ต้องจองล่วงหน้า"}','percent_off',33.0,NULL,10,30,9)
) AS d(en,title,terms,dtype,pct,minor,days,qtot,qused)
JOIN places p ON p.name_i18n->>'en' = d.en;

SELECT 'DEALS active='||count(*) AS seeded FROM deals WHERE status='active';
