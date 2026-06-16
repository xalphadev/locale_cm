-- 0026_soft_delete.sql — SOFT DELETE for merchant business content + seal the brand→loyalty
-- cascade so removing an owner/brand can never hard-drop stamp programs, rewards, or balances.
--
-- Founder decision (2026-06-16): "ไม่อยากให้ delete จริง — ข้อมูลส่วนใหญ่สำคัญ ต้องใช้งาน + ต้องดูย้อนหลังได้."
-- So the merchant "ลบ" actions must STOP physically removing rows. A nullable deleted_at marks a row
-- as deleted (deleted_at IS NOT NULL = gone from every read, but retained for history / restore).
-- The app's four DELETE FROM paths become UPDATE … SET deleted_at=now(); every read of these tables
-- gains `deleted_at IS NULL`.
--
-- Scope (chosen 2026-06-16): BUSINESS CONTENT only —
--   shop_products, stay_units, feed_posts, post_comments, stamp_rewards.
-- Toggle/engagement tables (saved_places, post_likes) stay HARD delete: un-save / un-like is a
-- switch, not a deletion. The money + loyalty ledgers (ledger_entries, ledger_transactions,
-- coin_lots, stamp_events, spark_events) are already append-only / immutable (0003, 0023) — untouched.
--
-- Cascade fix: brands.owner_account_id and the stamp_* foreign keys shipped ON DELETE CASCADE, so
-- one `DELETE FROM merchant_accounts` would silently wipe brands → stamp programs → rewards →
-- per-user balances. We flip those edges to ON DELETE RESTRICT: removal must now be a soft delete,
-- and any accidental hard DELETE fails loudly instead of cascading away loyalty data.
--
-- App-side companions to this migration (NOT in SQL):
--   • merchant/actions.ts — deleteProductAction / deleteStayUnitAction / deletePostAction /
--     deleteRewardAction switch DELETE → UPDATE … SET deleted_at=now(); deletePostAction stops
--     hard-deleting post_likes (kept) and soft-deletes post_comments instead.
--   • every SELECT/COUNT over the five tables (and brands/merchant_accounts) gains `deleted_at IS NULL`.

-- ════════ A. deleted_at on the five content tables (+ brands/accounts for the cascade) ════════
ALTER TABLE shop_products     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE stay_units        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE feed_posts        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE post_comments     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE stamp_rewards     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE brands            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE merchant_accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial indexes on the hot browse paths so the live (deleted_at IS NULL) reads stay fast and the
-- index stays small (deleted rows drop out of the index entirely).
CREATE INDEX IF NOT EXISTS idx_shop_products_live ON shop_products(place_id, status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_units_live    ON stay_units(place_id, status)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feed_posts_live    ON feed_posts(status, created_at DESC)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_live ON post_comments(post_key, created_at)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stamp_rewards_live ON stamp_rewards(brand_id, status)         WHERE deleted_at IS NULL;

-- ════════ B. seal the loyalty cascade: flip the chain FKs from CASCADE → RESTRICT ════════
-- Re-create each FK by introspection: we look the constraint up by (child → parent) so a
-- non-default constraint name is handled too (shipped names are the Postgres default
-- "<table>_<column>_fkey"). RESTRICT = a hard DELETE of the parent is blocked while children
-- exist; the app removes by soft delete instead. places.brand_id stays ON DELETE SET NULL
-- (a place may outlive its grouping brand) and is intentionally NOT changed here.
DO $$
DECLARE
  -- {child_table, parent_table, fk_column} — every edge that fed the dangerous loyalty cascade.
  fks text[][] := ARRAY[
    ['brands','merchant_accounts','owner_account_id'],
    ['stamp_programs','brands','brand_id'],
    ['stamp_balances','brands','brand_id'],
    ['stamp_rewards','brands','brand_id'],
    ['stamp_rewards','stamp_programs','program_id'],
    ['stamp_promotions','brands','brand_id'],
    ['stamp_promotions','stamp_programs','program_id'],
    ['checkin_daily_caps','brands','brand_id']
  ];
  f   text[];
  con text;
BEGIN
  FOREACH f SLICE 1 IN ARRAY fks LOOP
    SELECT conname INTO con FROM pg_constraint
      WHERE conrelid = f[1]::regclass AND confrelid = f[2]::regclass AND contype = 'f';
    IF con IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', f[1], con);
    END IF;
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE RESTRICT',
      f[1], f[1] || '_' || f[3] || '_fkey', f[3], f[2]);
  END LOOP;
END $$;
