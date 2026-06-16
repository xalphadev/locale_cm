-- seed-shop-products.sql — demo product showcase across real named shops.
-- Re-runnable: no-ops once shop_products has rows. Picks 6 published, named places
-- (prefer eat-category — believable goods vendors), flips sells_products, fills a demo
-- LINE handle + phone where missing (so the "ทักไลน์สั่ง"/"โทรสั่ง" CTAs demo), and attaches
-- varied products (fruit/veg/bakery/craft/souvenir/menu/grocery) so the place-page rail,
-- the feed 'product' kind, and the /market browse all have content across every subtype.
-- Prices are plain retail THB (price_minor satang). image_urls NULL → consumer falls back to cover().

DO $$
DECLARE v_city uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM shop_products) THEN RETURN; END IF;
  SELECT id INTO v_city FROM cities WHERE code='CNX';

  -- choose 6 real, named shops (eat-category first) as goods vendors; fill demo contact where null
  WITH chosen AS (
    SELECT id, row_number() OVER (ORDER BY (category='eat') DESC, created_at) rn
    FROM places
    WHERE status='published' AND is_visible AND (name_i18n ? 'th') AND COALESCE(name_i18n->>'th','') <> ''
    LIMIT 6
  )
  UPDATE places p SET
    sells_products = true,
    shop_kind = CASE (c.rn % 6) WHEN 1 THEN 'produce' WHEN 2 THEN 'produce' WHEN 3 THEN 'bakery'
                                WHEN 4 THEN 'crafts'  WHEN 5 THEN 'mixed'   ELSE 'grocery' END,
    line_id = COALESCE(p.line_id, '@localeshop' || c.rn),
    phone   = COALESCE(p.phone, '053-000' || lpad(c.rn::text, 3, '0'))
  FROM chosen c WHERE p.id = c.id;

  -- attach products, mapped to the 6 vendor places by place_rn (same ordering as the chosen CTE)
  INSERT INTO shop_products(place_id, city_id, name_i18n, description_i18n, subtype,
                            price_minor, price_unit, price_text_i18n, in_season, available_today, sold_out, sort, status)
  SELECT pv.id, COALESCE(pv.city_id, v_city), x.nm, x.descr, x.subtype,
         x.price, x.unit, x.ptext, x.season, x.today, x.sold, x.srt, 'published'
  FROM (SELECT id, city_id, row_number() OVER (ORDER BY (category='eat') DESC, created_at) prn
        FROM places WHERE sells_products) pv
  JOIN (VALUES
    -- place 1 — produce (in-season tropical fruit)
    (1,'{"th":"มะม่วงน้ำดอกไม้สุก","en":"Ripe Nam Dok Mai Mango","zh":"南多迈芒果"}'::jsonb,'{"th":"หวานหอม คัดลูกใหญ่ ส่งจากสวนสันป่าตอง"}'::jsonb,'fruit',8000::bigint,'kg',NULL::jsonb,true,true,false,1),
    (1,'{"th":"ลำไยอีดอสด","en":"Fresh Longan","zh":"龙眼"}'::jsonb,NULL::jsonb,'fruit',6000::bigint,'kg',NULL::jsonb,true,true,false,2),
    (1,'{"th":"กล้วยหอมทอง","en":"Gold Banana"}'::jsonb,NULL::jsonb,'fruit',4000::bigint,'kg',NULL::jsonb,false,true,false,3),
    -- place 2 — produce (organic vegetables)
    (2,'{"th":"ผักสลัดออร์แกนิก","en":"Organic Salad Greens","zh":"有机沙拉菜"}'::jsonb,'{"th":"เก็บสดทุกเช้าจากแม่ริม ไร้สารเคมี"}'::jsonb,'vegetable',4500::bigint,'bag',NULL::jsonb,true,true,false,1),
    (2,'{"th":"มะเขือเทศราชินี","en":"Cherry Tomatoes"}'::jsonb,NULL::jsonb,'vegetable',3500::bigint,'box',NULL::jsonb,true,true,false,2),
    (2,'{"th":"เห็ดหอมสด","en":"Fresh Shiitake"}'::jsonb,NULL::jsonb,'vegetable',NULL::bigint,NULL,'{"th":"฿25/กำ"}'::jsonb,false,true,false,3),
    -- place 3 — bakery
    (3,'{"th":"ครัวซองต์เนยสด","en":"Butter Croissant","zh":"黄油可颂"}'::jsonb,'{"th":"อบใหม่ทุกเช้า เนยฝรั่งเศสแท้"}'::jsonb,'bakery',6500::bigint,'piece',NULL::jsonb,false,true,false,1),
    (3,'{"th":"ขนมปังซาวร์โดว์","en":"Sourdough Loaf"}'::jsonb,NULL::jsonb,'bakery',12000::bigint,'piece',NULL::jsonb,false,true,false,2),
    (3,'{"th":"คุกกี้ช็อกโกแลตชิป","en":"Choc-chip Cookie"}'::jsonb,NULL::jsonb,'bakery',5000::bigint,'box',NULL::jsonb,false,false,true,3),
    -- place 4 — crafts / souvenir
    (4,'{"th":"ผ้าพันคอทอมือ","en":"Handwoven Scarf","zh":"手织围巾"}'::jsonb,'{"th":"ทอมือลายล้านนา ย้อมสีธรรมชาติ"}'::jsonb,'craft',45000::bigint,'piece',NULL::jsonb,false,true,false,1),
    (4,'{"th":"แก้วเซรามิกเคลือบ","en":"Glazed Ceramic Mug"}'::jsonb,NULL::jsonb,'souvenir',28000::bigint,'piece',NULL::jsonb,false,true,false,2),
    (4,'{"th":"กระเป๋าผ้าทอ","en":"Woven Tote Bag"}'::jsonb,NULL::jsonb,'souvenir',35000::bigint,'piece',NULL::jsonb,false,true,false,3),
    -- place 5 — menu items (café/restaurant signature)
    (5,'{"th":"ลาเต้คั่วกลาง (เมล็ดดอยช้าง)","en":"Doi Chang Latte","zh":"拿铁"}'::jsonb,'{"th":"เมล็ดดอยช้างคั่วเอง กลมกล่อม"}'::jsonb,'menu_item',7500::bigint,'cup',NULL::jsonb,false,true,false,1),
    (5,'{"th":"ข้าวซอยไก่","en":"Khao Soi Chicken","zh":"咖喱面"}'::jsonb,NULL::jsonb,'menu_item',6900::bigint,'piece',NULL::jsonb,false,true,false,2),
    -- place 6 — grocery / mixed (take-home)
    (6,'{"th":"เมล็ดกาแฟคั่วถุง 250 ก.","en":"Roasted Coffee Beans 250g","zh":"咖啡豆"}'::jsonb,'{"th":"คั่วสดทุกสัปดาห์ บดให้ฟรี"}'::jsonb,'grocery',32000::bigint,'bag',NULL::jsonb,false,true,false,1),
    (6,'{"th":"น้ำผึ้งดอกลำไยแท้","en":"Pure Longan Honey","zh":"龙眼蜂蜜"}'::jsonb,NULL::jsonb,'grocery',18000::bigint,'jar',NULL::jsonb,true,true,false,2)
  ) x(place_rn,nm,descr,subtype,price,unit,ptext,season,today,sold,srt) ON x.place_rn = pv.prn;
END $$;
