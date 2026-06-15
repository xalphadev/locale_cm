-- seed-stays.sql — demo accommodations (monthly dorm/apartment + daily homestay/guesthouse).
-- Re-runnable: no-ops once stay_units has rows. Creates real published places via fn_create_place
-- (portable geo + freshness + history) near นิมมาน/มช., flips offers_stay/stay_kind, and inserts
-- rentable units. Rent is plain retail THB (price_minor satang), NEVER the loyalty Coin value.

DO $$
DECLARE
  v_city uuid; v_dist uuid;
  ag uuid := '00000000-0000-4000-8000-00000000a6e7';   -- DEMO_AGENT (proposer)
  ad uuid := '00000000-0000-4000-8000-00000000ad11';   -- DEMO_ADMIN (reviewer; SoD: ag<>ad)
  p_dorm uuid; p_apt uuid; p_home uuid; p_guest uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM stay_units) THEN RETURN; END IF;
  SELECT id INTO v_city FROM cities WHERE code='CNX';
  SELECT id INTO v_dist FROM districts WHERE slug='nimman';

  -- 1) MONTHLY — dorm near CMU
  p_dorm := fn_create_place('{"name_i18n":{"th":"หอพักนิมมาน เฮาส์","en":"Nimman House Dorm","zh":"宁曼之家宿舍"},"description_i18n":{"th":"หอพักเงียบสงบ เดิน 5 นาทีถึงมหาวิทยาลัยเชียงใหม่ ใกล้คาเฟ่นิมมาน"},"category":"see","subcategory":"dorm","status":"published","lng":98.9665,"lat":18.7985,"phone":"053-111-222","line_id":"@nimmanhouse"}'::jsonb, v_city, v_dist, ag, ad);
  UPDATE places SET offers_stay=true, stay_kind='dorm' WHERE id=p_dorm;
  INSERT INTO stay_units(place_id, city_id, name_i18n, rental_mode, price_minor, price_period, available_units, available_from, capacity, deposit_minor, min_stay, room_size_sqm, furnished, bills_included, unit_amenities, sort, status) VALUES
    (p_dorm, v_city, '{"th":"ห้องสตูดิโอ พัดลม","en":"Studio (fan)"}'::jsonb, 'monthly', 350000, 'month', 3, NULL, 1, 350000, 3, 20, 'partial',  '{water}',       '{private_bath,balcony}',          1, 'published'),
    (p_dorm, v_city, '{"th":"ห้องสตูดิโอ แอร์","en":"Studio (A/C)"}'::jsonb,  'monthly', 550000, 'month', 2, NULL, 1, 550000, 3, 24, 'furnished','{water,wifi}',  '{aircon,private_bath,balcony,fiber_wifi}', 2, 'published');

  -- 2) MONTHLY — apartment, ว่างเดือนหน้า
  p_apt := fn_create_place('{"name_i18n":{"th":"ดิ เออร์เบิน นิมมาน อพาร์ตเมนต์","en":"The Urban Nimman Apartment","zh":"宁曼城市公寓"},"description_i18n":{"th":"อพาร์ตเมนต์ใหม่ มีลิฟต์ ที่จอดรถ เครื่องซักผ้า ใกล้ One Nimman"},"category":"see","subcategory":"apartment","status":"published","lng":98.9672,"lat":18.7951,"phone":"053-333-444","line_id":"@theurbannimman"}'::jsonb, v_city, v_dist, ag, ad);
  UPDATE places SET offers_stay=true, stay_kind='apartment' WHERE id=p_apt;
  INSERT INTO stay_units(place_id, city_id, name_i18n, rental_mode, price_minor, price_period, available_units, available_from, capacity, deposit_minor, min_stay, room_size_sqm, furnished, bills_included, unit_amenities, sort, status) VALUES
    (p_apt, v_city, '{"th":"1 ห้องนอน","en":"1 Bedroom"}'::jsonb,  'monthly', 1200000, 'month', 1, (now() + interval '1 month')::date, 2, 2400000, 6, 35, 'furnished', '{wifi,common_fee}', '{aircon,private_bath,kitchen,washing_machine,parking,fiber_wifi}', 1, 'published'),
    (p_apt, v_city, '{"th":"สตูดิโอ","en":"Studio"}'::jsonb,       'monthly',  850000, 'month', 0, NULL,                              2, 1700000, 6, 28, 'furnished', '{wifi,common_fee}', '{aircon,private_bath,washing_machine,parking}',                  2, 'published');

  -- 3) DAILY — homestay, ว่างวันนี้
  p_home := fn_create_place('{"name_i18n":{"th":"บ้านสวนโฮมสเตย์ เชียงใหม่","en":"Baan Suan Homestay","zh":"花园民宿"},"description_i18n":{"th":"บ้านไม้ในสวน บรรยากาศล้านนา อาหารเช้าโฮมเมด เจ้าของพูดอังกฤษได้"},"category":"see","subcategory":"homestay","status":"published","lng":98.9701,"lat":18.8012,"phone":"081-555-666","line_id":"@baansuanstay"}'::jsonb, v_city, v_dist, ag, ad);
  UPDATE places SET offers_stay=true, stay_kind='homestay' WHERE id=p_home;
  INSERT INTO stay_units(place_id, city_id, name_i18n, rental_mode, price_minor, price_period, daily_status, capacity, min_stay, furnished, unit_amenities, sort, status) VALUES
    (p_home, v_city, '{"th":"ห้องเตียงคู่ วิวสวน","en":"Twin room, garden view"}'::jsonb, 'daily',  89000, 'night', 'vacant', 2, 1, 'furnished', '{aircon,private_bath,balcony}', 1, 'published'),
    (p_home, v_city, '{"th":"ห้องครอบครัว","en":"Family room"}'::jsonb,                'daily', 149000, 'night', 'full',   4, 1, 'furnished', '{aircon,private_bath,kitchen}', 2, 'published');

  -- 4) DAILY — guesthouse
  p_guest := fn_create_place('{"name_i18n":{"th":"นิมมาน บูทีค เกสต์เฮาส์","en":"Nimman Boutique Guesthouse","zh":"宁曼精品旅馆"},"description_i18n":{"th":"เกสต์เฮาส์เล็กๆ ใจกลางนิมมาน ราคาเป็นมิตร เดินเที่ยวคาเฟ่ได้"},"category":"see","subcategory":"guesthouse","status":"published","lng":98.9668,"lat":18.7969,"phone":"053-777-888","line_id":"@nimmanboutique"}'::jsonb, v_city, v_dist, ag, ad);
  UPDATE places SET offers_stay=true, stay_kind='guesthouse' WHERE id=p_guest;
  INSERT INTO stay_units(place_id, city_id, name_i18n, rental_mode, price_minor, price_period, daily_status, capacity, min_stay, furnished, unit_amenities, sort, status) VALUES
    (p_guest, v_city, '{"th":"ห้องดับเบิล แอร์","en":"Double room, A/C"}'::jsonb, 'daily', 65000, 'night', 'vacant', 2, 1, 'furnished', '{aircon,private_bath,fiber_wifi}', 1, 'published'),
    (p_guest, v_city, '{"th":"ห้องเตียงเดี่ยว ประหยัด","en":"Single room, budget"}'::jsonb, 'daily', 45000, 'night', 'ask', 1, 1, 'partial', '{fan,private_bath}', 2, 'published');
END $$;
