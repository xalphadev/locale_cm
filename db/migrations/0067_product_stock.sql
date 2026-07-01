-- 0067: optional stock counting for shop_products (Phase-3 "Inventory/Stock" from the brief).
-- NULL = ไม่นับสต็อก (the shop keeps today's manual "หมด" button — nothing changes for them).
-- A number = tracked: the app syncs sold_out = (stock_qty = 0) on every write path, so "หมด"
-- flips on/off automatically as the count hits/leaves zero. Deliberately a bare counter —
-- no SKU/variants/movements ledger until a real shop asks for them (YAGNI; additive later).
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS stock_qty int;
DO $$ BEGIN
  ALTER TABLE shop_products ADD CONSTRAINT chk_shop_products_stock CHECK (stock_qty IS NULL OR stock_qty >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
