-- ============================================================================
-- Demo events for the Nimman / Chiang Mai rollout. Re-runnable (clears seeded events first).
-- Dates are relative to now() so "upcoming" always renders in the consumer Discover feed.
-- ============================================================================
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset

DELETE FROM events WHERE city_id=:'cid' AND source='agent_seed';

INSERT INTO events(city_id,district_id,title_i18n,description_i18n,kind,starts_at,ends_at,is_recurring,recurrence,status,is_featured) VALUES
 (:'cid',:'did','{"th":"ถนนคนเดินวันอาทิตย์","en":"Sunday Walking Street","zh":"周日步行街"}',
   '{"th":"ตลาดงานคราฟต์ + สตรีทฟู้ดทุกเย็นวันอาทิตย์"}','market',
   now()+interval '2 day', now()+interval '2 day'+interval '5 hour', true,'weekly:sun','published',true),
 (:'cid',:'did','{"th":"นิมมาน อาร์ต มาร์เก็ต","en":"Nimman Art Market","zh":"宁曼艺术市集"}',
   '{"th":"งานศิลปะ คราฟต์ และดนตรีสด"}','market',
   now()+interval '5 day', now()+interval '6 day', false,NULL,'published',false),
 (:'cid',:'did','{"th":"ยี่เป็ง เชียงใหม่","en":"Yi Peng Lantern Festival","zh":"清迈天灯节"}',
   '{"th":"เทศกาลลอยโคมประจำปี"}','festival',
   now()+interval '20 day', now()+interval '22 day', false,NULL,'published',true),
 (:'cid',:'did','{"th":"คลาสชงกาแฟ Slow Bar","en":"Slow Bar Brewing Class"}',
   '{"th":"เวิร์กช็อปชงกาแฟดริปกับบาริสต้านิมมาน"}','workshop',
   now()+interval '8 day', now()+interval '8 day'+interval '3 hour', false,NULL,'published',false);

SELECT 'EVENTS seeded='||count(*) AS seeded FROM events WHERE city_id=:'cid' AND status='published';
