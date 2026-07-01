-- 0066: real MENU structure for restaurant/cafe (and any product shop) — Phase-3 vertical depth.
-- The brief's "Restaurant backoffice = Menu / Images / Hours / Promotions" had everything except
-- the menu STRUCTURE: shop_products was a flat list. This adds owner-defined sections ("กาแฟ",
-- "เมนูข้าว", "ของหวาน") + a per-item แนะนำ flag. Reuses shop_products (which already has sort +
-- price + photos) rather than a parallel menu table — one item universe for market AND menus.
-- Soft-delete per 0026 (sections are business content); products keep their rows when a section
-- dies — deleteShopSectionAction NULLs section_id so items fall back to "ไม่จัดหมวด".
CREATE TABLE IF NOT EXISTS shop_section (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id   uuid NOT NULL REFERENCES places(id),
  name_i18n  jsonb NOT NULL,
  sort       int NOT NULL DEFAULT 100,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_section_place ON shop_section(place_id, sort) WHERE deleted_at IS NULL;

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES shop_section(id);
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_shop_products_section ON shop_products(place_id, section_id, sort) WHERE deleted_at IS NULL;
