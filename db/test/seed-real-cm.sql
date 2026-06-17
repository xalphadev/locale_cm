-- ============================================================================
-- seed-real-cm.sql — REAL, well-known Chiang Mai venues for the localhost demo.
--
-- Replaces the synthetic "Cafe 1 / Mokmok / Nimman Cafe-Hop" demo data with
-- ~30 genuine, recognisable Chiang Mai businesses & sights (eat / see / do),
-- plus reviews, deals, events, a stamp quest, feed posts, shop products and a
-- few real guesthouses with rooms (the /stay side).
--
-- DESTRUCTIVE + idempotent: wipes ALL data tables (keeps only pure reference:
-- cities, districts, place_categories, roles, platform_config) then rebuilds.
-- Local-dev only. Apply with:  db/test/reseed-real.sh
--
-- NOTE ON "real": venue names, categories, neighbourhoods and approximate
-- coordinates are real. Phone numbers, ratings, reviews, deals and opening
-- hours are illustrative placeholders so the app looks alive — not live data.
-- ============================================================================
SET client_min_messages = warning;

-- ── 0. WIPE everything except reference tables ──────────────────────────────
DO $wipe$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname='public'
      AND tablename NOT IN ('cities','districts','place_categories','roles','platform_config')
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
  END LOOP;
END $wipe$;

-- ── 1. Back-office users (field agent + admin) needed by fn_create_place ────
\set agent '00000000-0000-4000-8000-00000000a6e7'
\set admin '00000000-0000-4000-8000-00000000ad11'
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset

INSERT INTO users(id, home_city_id) VALUES (:'agent', :'cid'), (:'admin', :'cid') ON CONFLICT DO NOTHING;
INSERT INTO user_roles(user_id, role, scope_city_id) VALUES
  (:'agent','field_agent', :'cid'), (:'admin','platform_admin', :'cid') ON CONFLICT DO NOTHING;
INSERT INTO agents(id, user_id, city_id, affiliation, status, kyc_status)
  VALUES ('00000000-0000-4000-8000-00000000a6e8', :'agent', :'cid', 'cmu', 'active', 'verified')
  ON CONFLICT DO NOTHING;

-- ── 2. Reviewer pool (36) + the demo consumer ──────────────────────────────
INSERT INTO users(id, home_city_id)
  SELECT ('00000000-0000-4000-8000-0000000000'||lpad(to_hex(g),2,'0'))::uuid, :'cid'
  FROM generate_series(0,35) g ON CONFLICT DO NOTHING;
INSERT INTO profiles(user_id, display_name)
  SELECT ('00000000-0000-4000-8000-0000000000'||lpad(to_hex(g),2,'0'))::uuid,
         (ARRAY['นัทกาแฟ','bee_w','ploy.j','เก่งกินเก่ง','mint_cnx','อาร์ม','fern.t','ตุ๊กตา',
                'won_p','jane_cooks','หมูแดง','noon.k','นัทดริป','fern_wfh','tonkla','อ้วนกินจุ',
                'may_eat','ploy','เป้นักเที่ยว','joe_cnx','noiyy','มินท์รักสปา','aon_relax','bee',
                'นัทตี้','Beam','pim_ch','มะลิ','Tarn','joojee','หนึ่งฤทัย','Krit','ploy.w','เอกซ์',
                'Ploypilin','maxz'])[g+1]
  FROM generate_series(0,35) g
  ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name;

-- demo consumer (lib/db.ts DEMO_USER) so consumer login/profile works
INSERT INTO users(id, home_city_id) VALUES ('00000000-0000-4000-8000-0000000000d0', :'cid') ON CONFLICT DO NOTHING;
INSERT INTO profiles(user_id, display_name) VALUES ('00000000-0000-4000-8000-0000000000d0','คุณนักเที่ยว')
  ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name;

-- ── 3. Merchants (for deal attribution) ────────────────────────────────────
INSERT INTO merchants(id, city_id, display_name_i18n, trust_state) VALUES
  ('00000000-0000-4000-8000-00000000be01', :'cid', '{"en":"Ristr8to","th":"ริสเตรตโต"}',         'finance_verified'),
  ('00000000-0000-4000-8000-00000000be02', :'cid', '{"en":"Tong Tem Toh","th":"ตองเต็มโต๊ะ"}',   'finance_verified'),
  ('00000000-0000-4000-8000-00000000be03', :'cid', '{"en":"Cherng Doi","th":"เชิงดอย"}',          'finance_verified'),
  ('00000000-0000-4000-8000-00000000be04', :'cid', '{"en":"Mango Tango","th":"แมงโก้แทงโก้"}',    'finance_verified'),
  ('00000000-0000-4000-8000-00000000be05', :'cid', '{"en":"Fah Lanna Spa","th":"ฟ้าล้านนา สปา"}','finance_verified'),
  ('00000000-0000-4000-8000-00000000be06', :'cid', '{"en":"Khao Soi Khun Yai","th":"ข้าวซอยคุณยาย"}','finance_verified')
ON CONFLICT (id) DO NOTHING;

-- ── 4. Places — 30 real Chiang Mai venues (eat / see / do) ─────────────────
DO $places$
DECLARE
  cid uuid; did uuid;
  agent uuid := '00000000-0000-4000-8000-00000000a6e7';
  admin uuid := '00000000-0000-4000-8000-00000000ad11';
BEGIN
  SELECT id INTO cid FROM cities WHERE code='CNX';
  SELECT id INTO did FROM districts WHERE slug='nimman';

  -- ===== EAT · cafe =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"ริสเตรตโต","en":"Ristr8to","zh":"Ristr8to 咖啡"},"description_i18n":{"th":"คาเฟ่ระดับตำนานย่านนิมมานของแชมป์ลาเต้อาร์ตโลก เด่นเรื่องเอสเพรสโซเข้มข้นและลาเต้อาร์ตสุดประณีต","en":"A legendary Nimman cafe from a world latte-art champion, known for bold espresso and exquisite latte art."},"category":"eat","subcategory":"cafe","lng":98.9665,"lat":18.7972,"opening_hours":{"mon":"07:00-18:00","tue":"07:00-18:00","wed":"07:00-18:00","thu":"07:00-18:00","fri":"07:00-18:00","sat":"07:00-18:00","sun":"07:00-18:00"},"amenities":["wifi","power_outlet","aircon","card_accepted"],"price_band":"3","phone":"+66 53 215 278"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"อาข่า อ่ามา คอฟฟี่ (ลา ลานนา)","en":"Akha Ama Coffee La Lanna","zh":"阿卡阿玛咖啡"},"description_i18n":{"th":"กิจการเพื่อสังคมที่นำเมล็ดกาแฟจากหมู่บ้านอาข่าบนดอยมาคั่ว-ชงเอง รสชาติสะอาดและมีเรื่องราว","en":"A social-enterprise cafe roasting and brewing beans grown by an Akha hill-tribe village — clean cups with a story."},"category":"eat","subcategory":"cafe","lng":98.9746,"lat":18.7889,"opening_hours":{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"closed","thu":"08:00-18:00","fri":"08:00-18:00","sat":"08:00-18:00","sun":"08:00-18:00"},"amenities":["wifi","power_outlet","vegan_options","card_accepted"],"price_band":"2","phone":"+66 86 915 8600"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"กราฟ คาเฟ่","en":"Graph Cafe","zh":"Graph 咖啡"},"description_i18n":{"th":"คาเฟ่เล็กในเมืองเก่า สายสเปเชียลตี้คอฟฟี่และเมนูครีเอทีฟ บรรยากาศมินิมอลเท่ๆ","en":"A tiny specialty-coffee bar in the old city with creative signature drinks and a cool minimalist vibe."},"category":"eat","subcategory":"cafe","lng":98.9889,"lat":18.7907,"opening_hours":{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-18:00","sun":"09:00-18:00"},"amenities":["wifi","power_outlet","aircon"],"price_band":"3","phone":"+66 99 451 9426"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"เดอะ บาริสโทร แอท เดอะ ริเวอร์","en":"The Baristro at the River","zh":"Baristro 河畔店"},"description_i18n":{"th":"คาเฟ่ริมแม่น้ำปิงสไตล์อินดัสเทรียลผสมสวนเขียว วิวสวยนั่งสบาย เมนูกาแฟและบรันช์ครบ","en":"A riverside cafe blending industrial design with greenery — great Ping-river views, full coffee and brunch menu."},"category":"eat","subcategory":"cafe","lng":99.0046,"lat":18.7969,"opening_hours":{"mon":"07:00-19:00","tue":"07:00-19:00","wed":"07:00-19:00","thu":"07:00-19:00","fri":"07:00-19:00","sat":"07:00-19:00","sun":"07:00-19:00"},"amenities":["wifi","power_outlet","outdoor_seating","parking","card_accepted"],"price_band":"3","phone":"+66 88 251 4929"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"โรสเทอรี่ คาเฟ่ นิมมาน","en":"Roast8ery Cafe","zh":"Roast8ery 咖啡"},"description_i18n":{"th":"คาเฟ่โรงคั่วย่านนิมมาน เน้นกาแฟซิงเกิลออริจินและเบเกอรี่โฮมเมด เหมาะนั่งทำงาน","en":"A Nimman roastery cafe focused on single-origin coffee and homemade bakery — a solid work-friendly spot."},"category":"eat","subcategory":"cafe","lng":98.9671,"lat":18.7951,"opening_hours":{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-18:00","sat":"08:00-18:30","sun":"08:00-18:30"},"amenities":["wifi","power_outlet","aircon","outdoor_seating"],"price_band":"2","phone":"+66 80 678 1414"}$v$::jsonb, cid, did, agent, admin);

  -- ===== EAT · restaurant =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"ตองเต็มโต๊ะ","en":"Tong Tem Toh","zh":"通滕桌北部菜"},"description_i18n":{"th":"ร้านอาหารเหนือยอดนิยมในซอยนิมมานฯ 13 เรือนไม้เก่าบรรยากาศพื้นถิ่น เมนูแกงฮังเล น้ำพริกอ่อง ไส้อั่ว","en":"A beloved northern-Thai restaurant on Nimman Soi 13 in an old wooden house — hang lay curry, nam prik ong, sai ua."},"category":"eat","subcategory":"restaurant","lng":98.9676,"lat":18.8009,"opening_hours":{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"},"amenities":["dine_in","outdoor_seating","card_accepted","group_friendly"],"price_band":"2","phone":"+66 53 894 701"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"เฮือนเพ็ญ","en":"Huen Phen","zh":"Huen Phen 北部菜"},"description_i18n":{"th":"ตำนานอาหารเหนือในเมืองเก่า กลางวันขายตามสั่ง กลางคืนเปิดเป็นภัตตาคารบรรยากาศล้านนา ข้าวซอย-แกงฮังเลเด็ด","en":"An old-city institution for northern Thai food — a casual lunch shop by day, an atmospheric Lanna dinner house by night."},"category":"eat","subcategory":"restaurant","lng":98.9817,"lat":18.7869,"opening_hours":{"mon":"08:30-16:00, 17:00-22:00","tue":"08:30-16:00, 17:00-22:00","wed":"08:30-16:00, 17:00-22:00","thu":"08:30-16:00, 17:00-22:00","fri":"08:30-16:00, 17:00-22:00","sat":"08:30-16:00, 17:00-22:00","sun":"08:30-16:00, 17:00-22:00"},"amenities":["dine_in","cash_only","group_friendly"],"price_band":"2","phone":"+66 53 814 548"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"เอสพี ไก่ย่าง","en":"SP Chicken","zh":"SP 烤鸡"},"description_i18n":{"th":"ร้านไก่ย่างชื่อดังหลังวัดพระสิงห์ ไก่ย่างเตาฟืนหนังกรอบหอม คู่ส้มตำและข้าวเหนียว ราคาย่อมเยา","en":"A famous wood-fired rotisserie-chicken shop behind Wat Phra Singh — crispy charcoal chicken with som tam and sticky rice."},"category":"eat","subcategory":"restaurant","lng":98.9802,"lat":18.7889,"opening_hours":{"mon":"10:00-21:00","tue":"10:00-21:00","wed":"10:00-21:00","thu":"10:00-21:00","fri":"10:00-21:00","sat":"10:00-21:00","sun":"10:00-21:00"},"amenities":["dine_in","takeaway","cash_only"],"price_band":"1","phone":"+66 81 026 9569"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ไก่ย่างเชิงดอย","en":"Cherng Doi Roast Chicken","zh":"Cherng Doi 烤鸡"},"description_i18n":{"th":"ร้านไก่ย่างซอยนิมมานฯ 7 ไก่บ้านย่างหนังกรอบ น้ำจิ้มแจ่วรสเด็ด เมนูอีสาน-เหนือเป็นกันเอง คนแน่นทุกเย็น","en":"A Nimman Soi 7 favourite for crispy free-range roast chicken with a punchy jaew dip and easy Isan-northern plates; packed every evening."},"category":"eat","subcategory":"restaurant","lng":98.9679,"lat":18.7986,"opening_hours":{"mon":"11:30-21:00","tue":"11:30-21:00","wed":"11:30-21:00","thu":"11:30-21:00","fri":"11:30-21:00","sat":"11:30-21:00","sun":"11:30-21:00"},"amenities":["dine_in","takeaway","outdoor_seating","cash_only"],"price_band":"1","phone":"+66 88 251 4145"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ข้าวซอยคุณยาย","en":"Khao Soi Khun Yai","zh":"奶奶金面"},"description_i18n":{"th":"ร้านข้าวซอยเก่าแก่ใกล้วัดเกตการาม ขายเฉพาะกลางวันจนของหมด น้ำแกงเข้มข้นกลมกล่อม ราคาท้องถิ่น","en":"An old khao soi shop near Wat Ket open only until it sells out at midday — rich, balanced curry broth at local prices."},"category":"eat","subcategory":"restaurant","lng":98.9926,"lat":18.7935,"opening_hours":{"mon":"10:00-14:00","tue":"10:00-14:00","wed":"10:00-14:00","thu":"10:00-14:00","fri":"10:00-14:00","sat":"10:00-14:00","sun":"closed"},"amenities":["dine_in","cash_only","takeaway"],"price_band":"1","phone":"+66 53 242 668"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"เดอะ ริเวอร์ไซด์","en":"The Riverside Bar & Restaurant","zh":"河畔餐厅"},"description_i18n":{"th":"ร้านอาหารริมน้ำปิงในตึกไม้เก่ากว่า 30 ปี มีดนตรีสดทุกคืน เมนูไทย-สากล วิวพระอาทิตย์ตกสวย","en":"A 30-year-old riverside institution on the Ping in a timber building, with live music nightly, Thai-international menu and lovely sunset views."},"category":"eat","subcategory":"restaurant","lng":99.0033,"lat":18.7906,"opening_hours":{"mon":"10:00-01:00","tue":"10:00-01:00","wed":"10:00-01:00","thu":"10:00-01:00","fri":"10:00-01:00","sat":"10:00-01:00","sun":"10:00-01:00"},"amenities":["dine_in","outdoor_seating","live_music","card_accepted","reservations"],"price_band":"3","phone":"+66 53 243 239"}$v$::jsonb, cid, did, agent, admin);

  -- ===== EAT · street_food =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"ข้าวขาหมูช้างเผือก (ป้าหมวกคาวบอย)","en":"Cowboy Hat Khao Kha Moo (Chang Phueak)","zh":"牛仔帽猪脚饭"},"description_i18n":{"th":"แผงข้าวขาหมูในตບาดประตูช้างเผือก เจ้าของใส่หมวกคาวบอยจนเป็นเอกลักษณ์ หมูเปื่อยนุ่มราดน้ำเข้มข้น เปิดเย็นถึงดึก","en":"The iconic cowboy-hat khao kha moo (stewed pork leg) stall at Chang Phueak gate market — tender pork over rice, open evening to late."},"category":"eat","subcategory":"street_food","lng":98.9856,"lat":18.7995,"opening_hours":{"mon":"16:00-24:00","tue":"16:00-24:00","wed":"16:00-24:00","thu":"16:00-24:00","fri":"16:00-24:00","sat":"16:00-24:00","sun":"16:00-24:00"},"amenities":["takeaway","outdoor_seating","cash_only"],"price_band":"1","phone":"+66 81 882 3140"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ข้าวซอยลุงประกิต (กาดก้อม)","en":"Khao Soi Lung Prakit Kad Kom","zh":"Lung Prakit 金面"},"description_i18n":{"th":"ร้านข้าวซอยเก่าแก่ย่านกาดก้อม น้ำแกงสูตรดั้งเดิมหอมเครื่อง เส้นนุ่มเส้นกรอบครบ ราคาเป็นกันเอง","en":"A long-running khao soi shop in the Kad Kom area — fragrant traditional broth, soft-and-crispy noodles, friendly prices."},"category":"eat","subcategory":"street_food","lng":98.9748,"lat":18.8083,"opening_hours":{"mon":"08:00-15:00","tue":"08:00-15:00","wed":"08:00-15:00","thu":"08:00-15:00","fri":"08:00-15:00","sat":"08:00-15:00","sun":"08:00-15:00"},"amenities":["dine_in","takeaway","cash_only"],"price_band":"1","phone":"+66 89 700 9148"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"กู๋ ฟิวชั่น โรตี แอนด์ ที","en":"Guu Fusion Roti & Tea","zh":"Guu 创意煎饼"},"description_i18n":{"th":"แผงโรติฟิวชั่นย่านนิมมาน โรตีกรอบนอกนุ่มในหน้าหลากหลาย คู่ชานมเย็น ของกินเล่นยอดฮิตของนักท่องเที่ยว","en":"A Nimman fusion-roti stall — crisp-edged roti with creative toppings and iced milk tea, a tourist-favourite snack."},"category":"eat","subcategory":"street_food","lng":98.9669,"lat":18.7997,"opening_hours":{"mon":"11:00-22:00","tue":"11:00-22:00","wed":"11:00-22:00","thu":"11:00-22:00","fri":"11:00-22:30","sat":"11:00-22:30","sun":"11:00-22:00"},"amenities":["takeaway","outdoor_seating","cash_only","vegetarian_options"],"price_band":"1","phone":"+66 90 462 7781"}$v$::jsonb, cid, did, agent, admin);

  -- ===== EAT · dessert =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"แมงโก้ แทงโก้","en":"Mango Tango","zh":"芒果探戈"},"description_i18n":{"th":"ร้านขนมหวานมะม่วงชื่อดังย่านนิมมาน เมนูเด่นข้าวเหนียวมะม่วงและมะม่วงปั่น สดใหม่ทุกจาน","en":"A famous Nimman mango-dessert shop — signature mango sticky rice and mango smoothies, fresh every plate."},"category":"eat","subcategory":"dessert","lng":98.9673,"lat":18.7969,"opening_hours":{"mon":"11:00-22:00","tue":"11:00-22:00","wed":"11:00-22:00","thu":"11:00-22:00","fri":"11:00-22:00","sat":"11:00-22:00","sun":"11:00-22:00"},"amenities":["dine_in","takeaway","aircon","card_accepted"],"price_band":"2","phone":"+66 99 289 1234"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ไอเบอร์รี่ การ์เด้น","en":"iberry Garden","zh":"iberry 花园"},"description_i18n":{"th":"ร้านไอศกรีมในสวนกว้างย่านนิมมาน มีประติมากรรมจมูกยักษ์เป็นจุดถ่ายรูป ไอศกรีมโฮมเมดรสไทยๆ และของหวาน","en":"A leafy garden ice-cream destination in Nimman with the giant-nose sculpture photo spot, homemade Thai-flavour scoops and desserts."},"category":"eat","subcategory":"dessert","lng":98.9656,"lat":18.7956,"opening_hours":{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-22:00","sat":"10:00-22:00","sun":"10:00-22:00"},"amenities":["dine_in","outdoor_seating","garden_seating","parking","card_accepted","kid_friendly"],"price_band":"2","phone":"+66 53 895 181"}$v$::jsonb, cid, did, agent, admin);

  -- ===== EAT · bar =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"โซอี้ อิน เยลโล่","en":"Zoe in Yellow","zh":"Zoe in Yellow 酒吧"},"description_i18n":{"th":"คอมเพล็กซ์บาร์กลางเมืองเก่า ย่านปาร์ตี้ยอดฮิตของนักท่องเที่ยว เปิดดึก เครื่องดื่มราคาถูก ดนตรีสนุก","en":"An old-city open-air bar complex — the city's best-known backpacker party spot with cheap drinks, late hours and lively music."},"category":"eat","subcategory":"bar","lng":98.9897,"lat":18.7905,"opening_hours":{"mon":"18:00-02:00","tue":"18:00-02:00","wed":"18:00-02:00","thu":"18:00-02:00","fri":"18:00-02:00","sat":"18:00-02:00","sun":"18:00-02:00"},"amenities":["outdoor_seating","live_music","cash_only","late_night"],"price_band":"1","phone":"+66 84 611 2009"}$v$::jsonb, cid, did, agent, admin);

  -- ===== SEE · temple =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"วัดพระธาตุดอยสุเทพราชวรวิหาร","en":"Wat Phra That Doi Suthep","zh":"双龙寺"},"description_i18n":{"th":"วัดศักดิ์สิทธิ์คู่บ้านคู่เมืองบนดอยสุเทพ เจดีย์ทองเปล่งประกาย บันไดนาค 306 ขั้น และจุดชมวิวเมืองเชียงใหม่แบบพาโนรามา","en":"Chiang Mai's most sacred mountaintop temple — a gleaming golden chedi, the 306-step naga staircase and a panoramic city viewpoint."},"category":"see","subcategory":"temple","lng":98.9217,"lat":18.8048,"opening_hours":{"mon":"06:00-18:00","tue":"06:00-18:00","wed":"06:00-18:00","thu":"06:00-18:00","fri":"06:00-18:00","sat":"06:00-18:00","sun":"06:00-18:00"},"amenities":["parking","restroom","photo_spot","cable_car"],"price_band":"1","phone":"+66 53 295 003"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"วัดพระสิงห์วรมหาวิหาร","en":"Wat Phra Singh","zh":"帕辛寺"},"description_i18n":{"th":"วัดสำคัญใจกลางเมืองเก่า ที่ประดิษฐานพระพุทธสิหิงค์ วิหารลายคำงดงามแบบล้านนาแท้","en":"A revered old-city temple housing the Phra Singh Buddha, with an exquisite gilded Lanna viharn."},"category":"see","subcategory":"temple","lng":98.9817,"lat":18.7889,"opening_hours":{"mon":"06:00-20:00","tue":"06:00-20:00","wed":"06:00-20:00","thu":"06:00-20:00","fri":"06:00-20:00","sat":"06:00-20:00","sun":"06:00-20:00"},"amenities":["restroom","photo_spot","wheelchair_access"],"price_band":"1","phone":"+66 53 814 164"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"วัดเจดีย์หลวงวรวิหาร","en":"Wat Chedi Luang","zh":"契迪龙寺"},"description_i18n":{"th":"วัดเก่าแก่กลางเมืองที่มีเจดีย์ใหญ่พังทลายบางส่วนจากแผ่นดินไหวโบราณ ทรงพลังและงดงามทางประวัติศาสตร์","en":"An ancient city-centre temple dominated by a massive partly-collapsed chedi — historically powerful and striking."},"category":"see","subcategory":"temple","lng":98.9869,"lat":18.7869,"opening_hours":{"mon":"06:00-18:30","tue":"06:00-18:30","wed":"06:00-18:30","thu":"06:00-18:30","fri":"06:00-18:30","sat":"06:00-18:30","sun":"06:00-18:30"},"amenities":["parking","restroom","photo_spot"],"price_band":"1","phone":"+66 53 814 119"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"วัดศรีสุพรรณ (วัดเงิน)","en":"Wat Sri Suphan (Silver Temple)","zh":"银庙"},"description_i18n":{"th":"วัดที่มีอุโบสถเงินวิจิตรงานหัตถกรรมย่านวัวลาย สะท้อนภูมิปัญญาช่างเงินเชียงใหม่ (อุโบสถสงวนเฉพาะผู้ชาย)","en":"Home to an intricate silver ordination hall in the Wualai silversmith quarter, showcasing Chiang Mai's silver craft (the hall is men-only)."},"category":"see","subcategory":"temple","lng":98.9808,"lat":18.7799,"opening_hours":{"mon":"06:00-18:00","tue":"06:00-18:00","wed":"06:00-18:00","thu":"06:00-18:00","fri":"06:00-18:00","sat":"06:00-18:00","sun":"06:00-18:00"},"amenities":["restroom","photo_spot"],"price_band":"1","phone":"+66 53 200 332"}$v$::jsonb, cid, did, agent, admin);

  -- ===== SEE · viewpoint / museum =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"จุดชมวิวดอยสุเทพ (ผาดูดาว)","en":"Doi Suthep Viewpoint (Pha Dudao)","zh":"素贴山观景台"},"description_i18n":{"th":"จุดชมวิวริมทางขึ้นดอยสุเทพ มองเห็นเมืองเชียงใหม่แบบพาโนรามา สวยทั้งเช้ามีหมอกและค่ำที่ไฟเมืองระยิบ","en":"A roadside lookout on the Doi Suthep climb with a sweeping city panorama — magic at misty dawn and sparkling dusk."},"category":"see","subcategory":"viewpoint","lng":98.9395,"lat":18.8101,"opening_hours":{"mon":"05:00-20:00","tue":"05:00-20:00","wed":"05:00-20:00","thu":"05:00-20:00","fri":"05:00-20:00","sat":"05:00-20:00","sun":"05:00-20:00"},"amenities":["parking","photo_spot"]}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"หอศิลปวัฒนธรรมเมืองเชียงใหม่","en":"Chiang Mai City Arts and Cultural Centre","zh":"清迈城市艺术文化中心"},"description_i18n":{"th":"พิพิธภัณฑ์ในอาคารราชการเก่าสไตล์โคโลเนียลกลางเมือง เล่าเรื่องประวัติศาสตร์ล้านนาผ่านนิทรรศการและหุ่นจำลอง","en":"A museum in a graceful colonial-era hall opposite the Three Kings Monument, telling Lanna history through exhibits and dioramas."},"category":"see","subcategory":"museum","lng":98.9870,"lat":18.7905,"opening_hours":{"mon":"closed","tue":"08:30-17:00","wed":"08:30-17:00","thu":"08:30-17:00","fri":"08:30-17:00","sat":"08:30-17:00","sun":"08:30-17:00"},"amenities":["parking","restroom","guided_tour","photo_spot","wheelchair_access"],"price_band":"1","phone":"+66 53 217 793"}$v$::jsonb, cid, did, agent, admin);

  -- ===== SEE · market / landmark =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"ถนนคนเดินวันอาทิตย์ (ท่าแพ-ราชดำเนิน)","en":"Sunday Walking Street (Ratchadamnoen)","zh":"周日步行街"},"description_i18n":{"th":"ถนนคนเดินยอดฮิตทุกเย็นวันอาทิตย์ตลอดถนนราชดำเนินในเมืองเก่า งานคราฟต์ ของกินพื้นเมือง และการแสดงสด","en":"The city's flagship Sunday-evening walking street along Ratchadamnoen in the old town — crafts, street food and live performances."},"category":"see","subcategory":"market","lng":98.9850,"lat":18.7876,"opening_hours":{"mon":"closed","tue":"closed","wed":"closed","thu":"closed","fri":"closed","sat":"closed","sun":"16:00-23:00"},"amenities":["outdoor_seating","photo_spot","cash_only","street_food"],"price_band":"1"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ถนนคนเดินวัวลาย (วันเสาร์)","en":"Saturday Walking Street (Wualai)","zh":"周六步行街"},"description_i18n":{"th":"ถนนคนเดินวันเสาร์ย่านวัวลาย แหล่งเครื่องเงินดั้งเดิม เต็มไปด้วยงานหัตถกรรม ของกินเหนือ และบรรยากาศคึกคัก","en":"The Saturday walking street in the Wualai silver quarter — handicrafts, northern snacks and a lively local crowd."},"category":"see","subcategory":"market","lng":98.9838,"lat":18.7808,"opening_hours":{"mon":"closed","tue":"closed","wed":"closed","thu":"closed","fri":"closed","sat":"16:00-23:00","sun":"closed"},"amenities":["outdoor_seating","photo_spot","cash_only","street_food"],"price_band":"1"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"กาดหลวง (ตลาดวโรรส)","en":"Warorot Market (Kad Luang)","zh":"瓦洛洛市场"},"description_i18n":{"th":"ตลาดเก่าแก่ที่สุดของเชียงใหม่ริมแม่น้ำปิง ขายของกินพื้นเมือง แคบหมู น้ำพริกหนุ่ม ไส้อั่ว ผ้าและของฝากครบ","en":"Chiang Mai's oldest market by the Ping river — northern delicacies (pork crackling, nam prik num, sai ua), textiles and souvenirs."},"category":"see","subcategory":"market","lng":98.9966,"lat":18.7910,"opening_hours":{"mon":"06:00-18:00","tue":"06:00-18:00","wed":"06:00-18:00","thu":"06:00-18:00","fri":"06:00-18:00","sat":"06:00-18:00","sun":"06:00-18:00"},"amenities":["parking","restroom","cash_only","street_food"],"price_band":"1","phone":"+66 53 232 592"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ประตูท่าแพ","en":"Tha Phae Gate","zh":"塔佩门"},"description_i18n":{"th":"ประตูเมืองเก่าอันเป็นสัญลักษณ์ของเชียงใหม่ ลานกว้างด้านหน้ามีฝูงนกพิราบ จุดเช็คอินและจัดงานเทศกาลสำคัญ","en":"Chiang Mai's iconic old-city gate with a pigeon-filled plaza — a top check-in spot and the stage for major festivals."},"category":"see","subcategory":"landmark","lng":98.9938,"lat":18.7876,"opening_hours":{"mon":"00:00-24:00","tue":"00:00-24:00","wed":"00:00-24:00","thu":"00:00-24:00","fri":"00:00-24:00","sat":"00:00-24:00","sun":"00:00-24:00"},"amenities":["photo_spot","outdoor_seating"]}$v$::jsonb, cid, did, agent, admin);

  -- ===== DO · cooking_class / muay_thai / spa / workshop =====
  PERFORM fn_create_place($v${"name_i18n":{"th":"ไทยฟาร์ม คุกกิ้ง สคูล","en":"Thai Farm Cooking School","zh":"泰式农场烹饪学校"},"description_i18n":{"th":"คลาสสอนทำอาหารไทยในฟาร์มออร์แกนิกชานเมือง เดินเก็บผักสด ตำเครื่องแกง แล้วลงมือทำหลายเมนูพร้อมสูตรกลับบ้าน","en":"A Thai cooking class on an organic farm outside town — pick fresh produce, pound curry paste and cook several dishes with recipes to take home."},"category":"do","subcategory":"cooking_class","lng":98.9602,"lat":18.8155,"opening_hours":{"mon":"08:00-16:00","tue":"08:00-16:00","wed":"08:00-16:00","thu":"08:00-16:00","fri":"08:00-16:00","sat":"08:00-16:00","sun":"08:00-16:00"},"amenities":["booking_required","english_speaking","pickup_service","beginner_friendly","vegetarian_options"],"price_band":"2","phone":"+66 81 288 5989"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ค่ายมวยไทยสันติ","en":"Santai Muay Thai Gym","zh":"Santai 泰拳馆"},"description_i18n":{"th":"ค่ายมวยไทยชานเมืองเชียงใหม่ เทรนเนอร์อดีตนักชกสอนตั้งแต่มือใหม่ถึงระดับแข่ง คลาสเช้า-เย็นในสังเวียนกลางแจ้ง","en":"A Chiang Mai Muay Thai camp with ex-fighter trainers teaching beginners through competitors — morning and evening classes in an open-air ring."},"category":"do","subcategory":"muay_thai","lng":98.9255,"lat":18.7650,"opening_hours":{"mon":"07:00-10:00, 15:30-18:30","tue":"07:00-10:00, 15:30-18:30","wed":"07:00-10:00, 15:30-18:30","thu":"07:00-10:00, 15:30-18:30","fri":"07:00-10:00, 15:30-18:30","sat":"08:00-11:00","sun":"closed"},"amenities":["english_speaking","beginner_friendly","pickup_service","shower"],"price_band":"2","phone":"+66 89 700 1331"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"ฟ้าล้านนา สปา","en":"Fah Lanna Spa","zh":"Fah Lanna 水疗"},"description_i18n":{"th":"สปาบรรยากาศล้านนาร่มรื่นใจกลางเมือง ทรีตเมนต์นวดไทย นวดน้ำมัน และแพ็กเกจสมุนไพรครบ ควรจองล่วงหน้า","en":"A serene Lanna-style spa in the city centre offering Thai and oil massage and full herbal packages — booking recommended."},"category":"do","subcategory":"spa","lng":98.9890,"lat":18.7925,"opening_hours":{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-22:00","sat":"10:00-22:00","sun":"10:00-22:00"},"amenities":["booking_required","english_speaking","parking","card_accepted"],"price_band":"3","phone":"+66 53 416 191"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"สตูดิโอเครื่องปั้นดินเผาแม่ริม","en":"Mae Rim Pottery & Ceramics Workshop","zh":"陶艺工作坊"},"description_i18n":{"th":"เวิร์กช็อปปั้นเซรามิกในสวนชานเมืองแม่ริม สอนขึ้นรูปด้วยแป้นหมุนและเพนต์ลวดลาย เหมาะกับทุกวัยแบบมือใหม่","en":"A garden pottery workshop in suburban Mae Rim teaching wheel-throwing and glazing — beginner-friendly for all ages."},"category":"do","subcategory":"workshop","lng":98.9290,"lat":18.9105,"opening_hours":{"mon":"09:00-17:00","tue":"09:00-17:00","wed":"09:00-17:00","thu":"09:00-17:00","fri":"09:00-17:00","sat":"09:00-17:00","sun":"closed"},"amenities":["booking_required","english_speaking","beginner_friendly","kid_friendly","parking"],"price_band":"2","phone":"+66 86 184 7720"}$v$::jsonb, cid, did, agent, admin);
END $places$;

-- offers_stay places are added in §10 below.

-- ── 5. Reviews — generated per place (6–14 each, skewed positive) ───────────
DO $rev$
DECLARE
  vp record;
  pool uuid[];
  th_eat text[] := ARRAY[
    'รสชาติอร่อยถูกปาก บรรยากาศร้านดี พนักงานบริการน่ารัก จะกลับมาอีกแน่นอน',
    'ของอร่อย ราคาคุ้มค่า ที่นั่งสบาย เหมาะมานั่งชิลกับเพื่อน',
    'คุณภาพดีสมราคา รสชาติเป็นเอกลักษณ์ แนะนำให้มาลอง',
    'ร้านสะอาด อาหารมาไว รสชาติกลมกล่อม ประทับใจมาก',
    'อร่อยใช้ได้ แต่ช่วงพีคคนเยอะต้องรอคิวนานหน่อย',
    'รสชาติดีแต่ราคาสูงไปนิด โดยรวมโอเคน่ามาซ้ำ',
    'เมนูซิกเนเจอร์เด็ดมาก ต้องสั่ง บรรยากาศถ่ายรูปสวย',
    'เป็นร้านประจำเลย รสชาติคงที่ ไม่เคยผิดหวัง'];
  th_see text[] := ARRAY[
    'สถานที่สวยงาม บรรยากาศดี เหมาะแก่การมาเที่ยวถ่ายรูป',
    'ร่มรื่นเงียบสงบ ได้บรรยากาศมาก คุ้มค่าที่มา',
    'สวยจริง ประทับใจสถาปัตยกรรม แนะนำให้มาช่วงเช้าคนน้อย',
    'จุดเที่ยวห้ามพลาดของเชียงใหม่ วิวสวยมาก',
    'มีเสน่ห์ดี ได้ความรู้และบรรยากาศ แต่วันหยุดคนเยอะ',
    'สวยแต่ที่จอดรถหายากนิดหน่อย แนะนำมาเช้าๆ',
    'ประทับใจมาก ถ่ายรูปออกมาสวยทุกมุม',
    'บรรยากาศดีน่าเดินเล่น เหมาะพาครอบครัวมา'];
  th_do text[] := ARRAY[
    'สนุกมาก ได้ประสบการณ์ใหม่ คุ้มค่าเกินราคา',
    'สตาฟใจดีดูแลดี เหมาะกับมือใหม่ แนะนำเลย',
    'กิจกรรมจัดเต็ม ได้ทั้งความรู้และความสนุก ประทับใจ',
    'บริการดีมาก สถานที่สะอาด จะกลับมาอีก',
    'คุ้มค่ามาก ครูสอนละเอียด เป็นกันเอง',
    'สนุกแต่ควรจองล่วงหน้าเพราะคนเยอะ',
    'ผ่อนคลายสุดๆ บรรยากาศดี บริการประทับใจ',
    'ได้ลองทำเองสนุกมาก เหมาะมาเป็นกลุ่ม'];
  bodies text[];
  ratings int[] := ARRAY[5,5,4,5,4,5,3,4,5,4,5,3,4,5];
  n int; i int; uid uuid; off int; b text;
BEGIN
  pool := ARRAY(SELECT ('00000000-0000-4000-8000-0000000000'||lpad(to_hex(g),2,'0'))::uuid FROM generate_series(0,35) g);
  FOR vp IN SELECT id, city_id, category::text cat FROM places WHERE status='published' AND NOT offers_stay LOOP
    bodies := CASE vp.cat WHEN 'eat' THEN th_eat WHEN 'see' THEN th_see ELSE th_do END;
    n := 6 + (abs(hashtext(vp.id::text)) % 9);            -- 6..14, deterministic per place
    off := abs(hashtext(vp.id::text)) % 36;
    FOR i IN 0..n-1 LOOP
      uid := pool[1 + ((off + i) % 36)];                  -- distinct reviewers within a place
      b := bodies[1 + (i % array_length(bodies,1))];
      INSERT INTO reviews(place_id, city_id, user_id, rating, body_i18n, original_locale, trust_weight, moderation_status)
      VALUES (vp.id, vp.city_id, uid, ratings[1 + (i % array_length(ratings,1))],
              jsonb_build_object('th', b), 'th'::locale_code, 1, 'approved'::moderation_st);
    END LOOP;
  END LOOP;
END $rev$;

-- ── 6. Deals (active) ───────────────────────────────────────────────────────
INSERT INTO deals(place_id, merchant_id, city_id, title_i18n, terms_i18n, deal_type, value_minor, value_pct, starts_at, ends_at, quota_total, quota_used, status)
SELECT p.id, d.mid, p.city_id, d.title, d.terms, d.dtype::deal_type, d.vmin, d.vpct, now(), now()+ (d.days||' days')::interval, d.quota, d.used, 'active'::deal_status
FROM (VALUES
  ('Ristr8to',                         '00000000-0000-4000-8000-00000000be01'::uuid, '{"th":"ลด 15% เครื่องดื่มทุกแก้ว","en":"15% off all drinks"}'::jsonb, '{"th":"เฉพาะหน้าร้าน 14:00–17:00"}'::jsonb, 'percent_off', NULL::bigint, 15::numeric, 3, 40, 23),
  ('Cherng Doi Roast Chicken',         '00000000-0000-4000-8000-00000000be03'::uuid, '{"th":"ลด ฿30 เมื่อสั่งครบ ฿300","en":"฿30 off when you spend ฿300"}'::jsonb, '{"th":"ทานที่ร้านเท่านั้น"}'::jsonb, 'fixed_off', 3000::bigint, NULL::numeric, 2, 30, 6),
  ('Khao Soi Khun Yai',                '00000000-0000-4000-8000-00000000be06'::uuid, '{"th":"ซื้อ 1 แถม 1 ข้าวซอยไก่","en":"Buy 1 get 1 chicken khao soi"}'::jsonb, '{"th":"เฉพาะ 11:00–13:00"}'::jsonb, 'bogo', NULL::bigint, NULL::numeric, 4, 20, 17),
  ('Mango Tango',                      '00000000-0000-4000-8000-00000000be04'::uuid, '{"th":"ฟรีท็อปปิ้งเมื่อสั่งข้าวเหนียวมะม่วง","en":"Free topping with mango sticky rice"}'::jsonb, '{"th":"1 สิทธิ์ต่อโต๊ะ"}'::jsonb, 'freebie', NULL::bigint, NULL::numeric, 5, 50, 12),
  ('Tong Tem Toh',                     '00000000-0000-4000-8000-00000000be02'::uuid, '{"th":"ลด 10% บิลอาหารเหนือ","en":"10% off northern Thai set"}'::jsonb, '{"th":"จันทร์–พฤหัส"}'::jsonb, 'percent_off', NULL::bigint, 10::numeric, 6, 60, 31),
  ('Fah Lanna Spa',                    '00000000-0000-4000-8000-00000000be05'::uuid, '{"th":"ลด ฿200 แพ็กเกจนวด 2 ชม.","en":"฿200 off 2-hour massage package"}'::jsonb, '{"th":"ต้องจองล่วงหน้า"}'::jsonb, 'fixed_off', 20000::bigint, NULL::numeric, 7, 25, 9),
  ('iberry Garden',                    '00000000-0000-4000-8000-00000000be04'::uuid, '{"th":"ลด 20% ไอศกรีมสกู๊ปที่สอง","en":"20% off your second scoop"}'::jsonb, '{"th":"ทุกวัน"}'::jsonb, 'percent_off', NULL::bigint, 20::numeric, 4, 80, 40),
  ('Roast8ery Cafe',                   '00000000-0000-4000-8000-00000000be01'::uuid, '{"th":"ฟรีครัวซองต์เมื่อซื้อกาแฟ 2 แก้ว","en":"Free croissant with 2 coffees"}'::jsonb, '{"th":"ก่อน 11 โมง"}'::jsonb, 'freebie', NULL::bigint, NULL::numeric, 3, 35, 8)
) AS d(pname, mid, title, terms, dtype, vmin, vpct, days, quota, used)
JOIN places p ON p.name_i18n->>'en' = d.pname;

-- ── 7. Events (published, upcoming) ─────────────────────────────────────────
INSERT INTO events(city_id, district_id, place_id, title_i18n, description_i18n, kind, starts_at, ends_at, status, is_featured, source)
SELECT (SELECT id FROM cities WHERE code='CNX'), NULL, p.id, e.title, e.descr, e.kind, now()+ (e.din||' days')::interval, now()+ ((e.din+1)||' days')::interval, 'published'::event_status, e.feat, 'agent_seed'
FROM (VALUES
  ('Tha Phae Gate',         '{"th":"เทศกาลโคมยี่เป็ง ลานท่าแพ","en":"Yi Peng Lantern Festival @ Tha Phae"}'::jsonb, '{"th":"ปล่อยโคมและขบวนแห่กลางเมืองเก่า"}'::jsonb, 'festival', 12, true),
  ('Sunday Walking Street (Ratchadamnoen)', '{"th":"ถนนคนเดินวันอาทิตย์","en":"Sunday Walking Street"}'::jsonb, '{"th":"งานคราฟต์ ของกิน และดนตรีสด"}'::jsonb, 'market', 3, false),
  ('Thai Farm Cooking School', '{"th":"คลาสทำอาหารไทยรอบพิเศษ","en":"Special Thai cooking session"}'::jsonb, '{"th":"เก็บผักจากฟาร์มแล้วลงมือทำ"}'::jsonb, 'workshop', 6, false),
  ('The Riverside Bar & Restaurant', '{"th":"ดนตรีสดริมน้ำปิง","en":"Live music by the Ping"}'::jsonb, '{"th":"วงอะคูสติกทุกค่ำคืน"}'::jsonb, 'music', 1, false),
  ('Mae Rim Pottery & Ceramics Workshop', '{"th":"เวิร์กช็อปปั้นเซรามิกสุดสัปดาห์","en":"Weekend pottery workshop"}'::jsonb, '{"th":"ขึ้นรูปและเพนต์ชิ้นงานของตัวเอง"}'::jsonb, 'workshop', 9, false)
) AS e(pname, title, descr, kind, din, feat)
JOIN places p ON p.name_i18n->>'en' = e.pname;

-- ── 8. Stamp quest: "Nimman Cafe-Hop" (featured, active) ────────────────────
WITH c AS (SELECT id FROM cities WHERE code='CNX'),
nq AS (
  INSERT INTO quests(city_id, title_i18n, description_i18n, reward_terms_i18n, quest_type, reward_spark_amount, min_steps_required, starts_at, ends_at, is_featured, status)
  SELECT c.id, '{"th":"นิมมาน คาเฟ่ฮ็อป","en":"Nimman Cafe-Hop"}'::jsonb,
         '{"th":"เช็คอินคาเฟ่เด็ดย่านนิมมานครบ 3 ร้าน รับ Sparks ฟรี","en":"Check in at 3 great Nimman cafes to earn free Sparks"}'::jsonb,
         '{"th":"รับ 50 Sparks + สิทธิ์ฟรีกาแฟ 1 แก้ว"}'::jsonb, 'standard'::quest_type, 50, 3, now(), now()+interval '30 days', true, 'active'::quest_status
  FROM c RETURNING id, city_id
)
INSERT INTO quest_steps(quest_id, place_id, city_id, step_order, required_trust_tier, bonus_spark)
SELECT nq.id, p.id, nq.city_id, s.ord, 'verified_visit'::trust_tier, s.bonus
FROM nq
JOIN (VALUES ('Ristr8to',0,10),('Roast8ery Cafe',1,10),('Akha Ama Coffee La Lanna',2,10),('The Baristro at the River',3,20)) AS s(pname, ord, bonus)
  ON true
JOIN places p ON p.name_i18n->>'en' = s.pname;

-- ── 9. Feed posts (merchant updates) ───────────────────────────────────────
INSERT INTO feed_posts(place_id, author_user_id, author_kind, body_i18n, image_count, status)
SELECT p.id, NULL, 'merchant', f.body, 1, 'published'
FROM (VALUES
  ('Ristr8to',                  '{"th":"เมล็ดล็อตใหม่ Geisha มาแล้ว! หอมดอกไม้ชัดเจน มาลองดริปกันได้เลยวันนี้ ☕"}'::jsonb),
  ('Akha Ama Coffee La Lanna',  '{"th":"ขอบคุณทุกการสนับสนุนเกษตรกรอาข่า กาแฟคั่วใหม่พร้อมเสิร์ฟทุกเช้า 🌱"}'::jsonb),
  ('Tong Tem Toh',              '{"th":"วันนี้มีน้ำพริกหนุ่มทำสดใหม่ คู่แคบหมูกรอบๆ มาเป็นเซ็ตคุ้มมาก"}'::jsonb),
  ('Cherng Doi Roast Chicken',  '{"th":"ไก่ย่างเตรียมเยอะเป็นพิเศษช่วงสุดสัปดาห์ มาเร็วของหมดไว 🍗"}'::jsonb),
  ('Mango Tango',               '{"th":"มะม่วงน้ำดอกไม้ลอตใหม่หวานฉ่ำกำลังดี ข้าวเหนียวมะม่วงพร้อมเสิร์ฟแล้ว 🥭"}'::jsonb)
) AS f(pname, body)
JOIN places p ON p.name_i18n->>'en' = f.pname;

-- ── 10. Shop products on a few eat venues (sells_products) ──────────────────
UPDATE places SET sells_products=true, shop_kind='cafe'
  WHERE name_i18n->>'en' IN ('Ristr8to','Akha Ama Coffee La Lanna','Roast8ery Cafe','Mango Tango','Tong Tem Toh');

INSERT INTO shop_products(place_id, city_id, name_i18n, description_i18n, subtype, price_minor, price_unit, currency, image_count, in_season, available_today, sold_out, sort, status, author_kind)
SELECT p.id, p.city_id, x.nm, x.ds, x.st, x.pm, x.pu, 'THB', 0, true, true, false, x.so, 'published', 'merchant'
FROM (VALUES
  ('Ristr8to', '{"th":"ดิอาโบล (Diablo)","en":"Diablo signature"}'::jsonb, '{"th":"เอสเพรสโซเข้มข้นซิกเนเจอร์"}'::jsonb, 'drink', 13000::bigint, 'cup', 0),
  ('Ristr8to', '{"th":"แฟลตไวต์","en":"Flat White"}'::jsonb, '{"th":"นมสตรีมละมุน"}'::jsonb, 'drink', 9000::bigint, 'cup', 1),
  ('Akha Ama Coffee La Lanna', '{"th":"ดริปดอยช้าง","en":"Doi Chang Drip"}'::jsonb, '{"th":"ซิงเกิลออริจินคั่วอ่อน"}'::jsonb, 'drink', 8000::bigint, 'cup', 0),
  ('Akha Ama Coffee La Lanna', '{"th":"คอลด์บรูว์","en":"Cold Brew"}'::jsonb, '{"th":"สกัดเย็น 18 ชม."}'::jsonb, 'drink', 9000::bigint, 'bottle', 1),
  ('Roast8ery Cafe', '{"th":"ครัวซองต์เนยสด","en":"Butter Croissant"}'::jsonb, '{"th":"อบใหม่ทุกเช้า"}'::jsonb, 'bakery', 6500::bigint, 'piece', 0),
  ('Mango Tango', '{"th":"ข้าวเหนียวมะม่วง","en":"Mango Sticky Rice"}'::jsonb, '{"th":"มะม่วงน้ำดอกไม้ + กะทิสด"}'::jsonb, 'dessert', 12000::bigint, 'plate', 0),
  ('Tong Tem Toh', '{"th":"แกงฮังเล","en":"Hang Lay Curry"}'::jsonb, '{"th":"หมูตุ๋นเครื่องแกงเหนือ"}'::jsonb, 'food', 12000::bigint, 'plate', 0),
  ('Tong Tem Toh', '{"th":"ไส้อั่ว","en":"Sai Ua (herb sausage)"}'::jsonb, '{"th":"ไส้อั่วสมุนไพรย่าง"}'::jsonb, 'food', 10000::bigint, 'plate', 1)
) AS x(pname, nm, ds, st, pm, pu, so)
JOIN places p ON p.name_i18n->>'en' = x.pname;

-- ── 11. Accommodations (offers_stay) + rooms — for the /stay side ───────────
DO $stay$
DECLARE
  cid uuid; did uuid;
  agent uuid := '00000000-0000-4000-8000-00000000a6e7';
  admin uuid := '00000000-0000-4000-8000-00000000ad11';
BEGIN
  SELECT id INTO cid FROM cities WHERE code='CNX';
  SELECT id INTO did FROM districts WHERE slug='nimman';
  PERFORM fn_create_place($v${"name_i18n":{"th":"ทามารินด์ วิลเลจ","en":"Tamarind Village","zh":"罗望子村酒店"},"description_i18n":{"th":"บูทีคโฮเทลใจกลางเมืองเก่า ออกแบบสไตล์ล้านนาร่มรื่นรอบต้นมะขามใหญ่ บรรยากาศสงบเดินถึงวัดสำคัญ","en":"A boutique Lanna-style hotel in the heart of the old city, set around a grand tamarind tree — calm and walkable to the major temples."},"category":"see","subcategory":"hotel","lng":98.9885,"lat":18.7882,"opening_hours":{},"amenities":["wifi","pool","aircon","parking","breakfast","card_accepted"],"price_band":"4","phone":"+66 53 418 896"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"กรีน ไทเกอร์ เฮาส์ (มังสวิรัติ)","en":"Green Tiger Vegetarian House","zh":"绿虎素食旅舍"},"description_i18n":{"th":"เกสต์เฮาส์มังสวิรัติเป็นมิตรกับสิ่งแวดล้อมในเมืองเก่า มีคาเฟ่ดาดฟ้าวิวดี เหมาะกับนักเดินทางสายรักษ์โลก","en":"An eco-friendly vegetarian guesthouse in the old city with a rooftop cafe — perfect for conscious travellers."},"category":"see","subcategory":"guesthouse","lng":98.9846,"lat":18.7931,"opening_hours":{},"amenities":["wifi","aircon","breakfast","rooftop","vegetarian_options"],"price_band":"2","phone":"+66 92 271 2447"}$v$::jsonb, cid, did, agent, admin);
  PERFORM fn_create_place($v${"name_i18n":{"th":"นิมมาน โค-ลิฟวิ่ง โฮสเทล","en":"Nimman Co-Living Hostel","zh":"宁曼共居旅舍"},"description_i18n":{"th":"โฮสเทลสไตล์โค-ลิฟวิ่งกลางย่านนิมมาน มีโซนทำงานร่วม ห้องรวมและห้องส่วนตัว เหมาะกับดิจิทัลโนแมด","en":"A co-living hostel in the middle of Nimman with coworking space, dorms and private rooms — built for digital nomads."},"category":"see","subcategory":"hostel","lng":98.9668,"lat":18.7989,"opening_hours":{},"amenities":["wifi","aircon","coworking","laundry","shared_kitchen"],"price_band":"1","phone":"+66 95 614 8820"}$v$::jsonb, cid, did, agent, admin);
END $stay$;

UPDATE places SET offers_stay=true,
  stay_kind = CASE name_i18n->>'en' WHEN 'Tamarind Village' THEN 'hotel' WHEN 'Green Tiger Vegetarian House' THEN 'guesthouse' ELSE 'hostel' END
  WHERE name_i18n->>'en' IN ('Tamarind Village','Green Tiger Vegetarian House','Nimman Co-Living Hostel');

INSERT INTO stay_units(place_id, city_id, name_i18n, description_i18n, rental_mode, price_minor, price_period, currency, image_count, available_units, daily_status, capacity, room_size_sqm, furnished, sort, status, author_kind)
SELECT p.id, p.city_id, u.nm, u.ds, u.mode, u.pm, u.per, 'THB', 0, u.avail, 'vacant', u.cap, u.sqm, u.furn, u.so, 'published', 'merchant'
FROM (VALUES
  ('Tamarind Village', '{"th":"ห้องดีลักซ์ล้านนา","en":"Lanna Deluxe Room"}'::jsonb, '{"th":"ห้องตกแต่งไม้สไตล์ล้านนา วิวสวน"}'::jsonb, 'daily', 380000::bigint, 'day',6, 2, 32, 'furnished', 0),
  ('Tamarind Village', '{"th":"ห้องสวีทมะขาม","en":"Tamarind Suite"}'::jsonb, '{"th":"สวีทกว้างพิเศษ ระเบียงส่วนตัว"}'::jsonb, 'daily', 620000::bigint, 'day',3, 2, 48, 'furnished', 1),
  ('Green Tiger Vegetarian House', '{"th":"ห้องดับเบิลวิวเมือง","en":"Double Room City View"}'::jsonb, '{"th":"ห้องคู่สะอาด วิวเมืองเก่า"}'::jsonb, 'daily', 120000::bigint, 'day',5, 2, 20, 'furnished', 0),
  ('Nimman Co-Living Hostel', '{"th":"เตียงในห้องรวม (6 เตียง)","en":"Bunk in 6-bed Dorm"}'::jsonb, '{"th":"เตียงพร้อมล็อกเกอร์และม่านส่วนตัว"}'::jsonb, 'daily', 35000::bigint, 'day',12, 1, 4, 'furnished', 0),
  ('Nimman Co-Living Hostel', '{"th":"ห้องส่วนตัวรายเดือน","en":"Private Room (Monthly)"}'::jsonb, '{"th":"ห้องส่วนตัวสำหรับพักยาว เหมาะโนแมด"}'::jsonb, 'monthly', 1200000::bigint, 'month', 4, 1, 18, 'furnished', 1)
) AS u(pname, nm, ds, mode, pm, per, avail, cap, sqm, furn, so)
JOIN places p ON p.name_i18n->>'en' = u.pname;

-- ── 12. Real Chiang Mai areas (districts) + assign every place to its area ──────────────────────
INSERT INTO districts(city_id, name_i18n, slug, rollout_status)
SELECT (SELECT id FROM cities WHERE code='CNX'), x.nm::jsonb, x.slug, 'live'::rollout_status
FROM (VALUES
  ('old_city',   '{"th":"เมืองเก่า","en":"Old City"}'),
  ('chang_klan', '{"th":"ช้างคลาน · ไนท์บาซาร์","en":"Chang Klan"}'),
  ('santitham',  '{"th":"สันติธรรม","en":"Santitham"}'),
  ('wualai',     '{"th":"วัวลาย","en":"Wualai"}'),
  ('riverside',  '{"th":"ริมปิง · วัดเกต","en":"Riverside"}'),
  ('suthep',     '{"th":"เชิงดอยสุเทพ","en":"Suthep"}'),
  ('maerim',     '{"th":"แม่ริม","en":"Mae Rim"}')
) AS x(slug, nm)
WHERE NOT EXISTS (SELECT 1 FROM districts d WHERE d.slug=x.slug);

-- assign by venue name (PostGIS-portable: NO geo-text parsing → works on the dev stub AND on a real
-- geography column, where geo::text is WKB hex and the old regex approach silently matched nothing)
UPDATE places p SET district_id = d.id
FROM (VALUES
  ('Ristr8to','nimman'),('Roast8ery Cafe','nimman'),('Tong Tem Toh','nimman'),
  ('Cherng Doi Roast Chicken','nimman'),('Guu Fusion Roti & Tea','nimman'),
  ('Mango Tango','nimman'),('iberry Garden','nimman'),('Nimman Co-Living Hostel','nimman'),
  ('Graph Cafe','old_city'),('Huen Phen','old_city'),('SP Chicken','old_city'),
  ('Zoe in Yellow','old_city'),('Wat Phra Singh','old_city'),('Wat Chedi Luang','old_city'),
  ('Chiang Mai City Arts and Cultural Centre','old_city'),('Sunday Walking Street (Ratchadamnoen)','old_city'),
  ('Tha Phae Gate','old_city'),('Fah Lanna Spa','old_city'),
  ('Tamarind Village','old_city'),('Green Tiger Vegetarian House','old_city'),
  ('Akha Ama Coffee La Lanna','santitham'),('Cowboy Hat Khao Kha Moo (Chang Phueak)','santitham'),
  ('Khao Soi Lung Prakit Kad Kom','santitham'),
  ('Wat Sri Suphan (Silver Temple)','wualai'),('Saturday Walking Street (Wualai)','wualai'),
  ('The Baristro at the River','riverside'),('Khao Soi Khun Yai','riverside'),
  ('The Riverside Bar & Restaurant','riverside'),('Warorot Market (Kad Luang)','riverside'),
  ('Wat Phra That Doi Suthep','suthep'),('Doi Suthep Viewpoint (Pha Dudao)','suthep'),
  ('Santai Muay Thai Gym','suthep'),
  ('Thai Farm Cooking School','maerim'),('Mae Rim Pottery & Ceramics Workshop','maerim')
) AS m(name, slug)
JOIN districts d ON d.slug = m.slug
WHERE p.name_i18n->>'en' = m.name;

-- ── Summary ─────────────────────────────────────────────────────────────────
SELECT 'places='||(SELECT count(*) FROM places)
     ||' browse(not stay)='||(SELECT count(*) FROM places WHERE NOT offers_stay)
     ||' stays='||(SELECT count(*) FROM places WHERE offers_stay)
     ||' reviews='||(SELECT count(*) FROM reviews)
     ||' deals='||(SELECT count(*) FROM deals WHERE status='active')
     ||' events='||(SELECT count(*) FROM events WHERE status='published')
     ||' quests='||(SELECT count(*) FROM quests WHERE status='active')
     ||' quest_steps='||(SELECT count(*) FROM quest_steps)
     ||' feed='||(SELECT count(*) FROM feed_posts)
     ||' products='||(SELECT count(*) FROM shop_products)
     ||' stay_units='||(SELECT count(*) FROM stay_units) AS seeded;
