-- 0041_seed_stay_categories.sql
-- The 4 accommodation kinds added after 0020 (hostel, condo, mansion, house) lacked a
-- place_categories row, so they fell back to a generic icon/label. Seed them to match the
-- existing stay rows from 0020 (category='see', icon='bed'). Idempotent.
INSERT INTO place_categories (category, subcategory, name_i18n, icon) VALUES
  ('see','hostel',  '{"th":"โฮสเทล","en":"Hostel","zh":"青年旅舍"}','bed'),
  ('see','condo',   '{"th":"คอนโด","en":"Condominium","zh":"公寓"}','bed'),
  ('see','mansion', '{"th":"แมนชั่น","en":"Mansion","zh":"公寓楼"}','bed'),
  ('see','house',   '{"th":"บ้านเช่า","en":"House","zh":"独栋房屋"}','bed')
ON CONFLICT (category, subcategory) DO NOTHING;
