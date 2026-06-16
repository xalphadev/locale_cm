-- 0022_brands_and_branches.sql — MULTI-ENTITY OWNERSHIP for the self-service portal.
--
-- Problem: the shipped portal is 1-account = 1-place (0019 merchant_accounts.place_id =
-- "the ONE shop this account manages"). But one owner may run several distinct shops/brands
-- ("ร้าน"), each with several branches ("สาขา"), plus several accommodations ("ที่พัก").
-- The money-plane (users → merchant_users → merchants → places) already models depth, but the
-- portal cannot reach it, and every live self-service place has merchant_id = NULL (never
-- transacted). So we add the grouping in the PORTAL plane only and leave the ledger untouched.
--
-- Hierarchy this migration enables (NO money-plane writes):
--   merchant_accounts (เจ้าของ/login)
--      └─ brands (ร้าน/แบรนด์)            ← NEW. owner_account_id roots ownership; merchant_id is
--           └─ places.brand_id (สาขา/ที่พัก)  the deferred bridge to the money plane (NULL until a
--                └─ shop_products / stay_units / feed_posts   brand actually onboards to escrow/billing).
--
-- Founder calls baked in (2026-06-16): "นิติบุคคลเดียว หลายแบรนด์" → a real brands entity (not just a
-- text label); brands.merchant_id NULLABLE so 1 legal merchant can later own many brands. "ยังไม่ต้อง
-- มีพนักงาน" → no membership/role table; ownership is the single edge brands.owner_account_id. Staff
-- (a portal_memberships junction) is a later, purely-additive step.
--
-- Tenancy after this: an account may manage place P  ⇔  P.brand_id ∈ (brands WHERE owner_account_id =
-- account). currentAccount() resolves an "active branch" (merchant_accounts.active_place_id, falling
-- back to the legacy place_id, then the first owned place) and re-proves ownership every request.

CREATE TABLE IF NOT EXISTS brands (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id uuid NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,  -- portal owner (root of the tree)
  merchant_id      uuid REFERENCES merchants(id),     -- NULL until this brand transacts (money-plane settlement/escrow/KYC unit)
  city_id          uuid REFERENCES cities(id),
  name_i18n        jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url         text,
  description_i18n jsonb,
  brand_kind       text,                              -- eat | shop | stay | mixed (display hint; per-branch flags stay authoritative)
  status           text NOT NULL DEFAULT 'active',    -- active | hidden
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brands_owner    ON brands(owner_account_id, status);            -- "all my shops" switcher
CREATE INDEX IF NOT EXISTS idx_brands_merchant ON brands(merchant_id) WHERE merchant_id IS NOT NULL;  -- money-plane reconcile join

-- A branch/accommodation belongs to a brand. NULLABLE: agent_seed / money-plane places have no portal
-- brand. ON DELETE SET NULL — a place can OUTLIVE its portal brand (the brand is a grouping layer, not
-- the venue), and it lets DELETE FROM merchant_accounts cascade brands without dangling place rows.
ALTER TABLE places ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_places_brand ON places(brand_id) WHERE brand_id IS NOT NULL;

-- Advisory "active branch" the portal is currently editing. ALWAYS re-validated against brand ownership
-- per request (the session cookie still signs ONLY the account id — unforgeable boundary unchanged).
ALTER TABLE merchant_accounts ADD COLUMN IF NOT EXISTS active_place_id uuid REFERENCES places(id);

-- ════════ Backfill (idempotent) — give every EXISTING single-place account one brand owning its place ════════
-- One brand per legacy account, named after its place (fallback: the account display_name).
INSERT INTO brands (owner_account_id, city_id, name_i18n, status)
SELECT ma.id, p.city_id, COALESCE(p.name_i18n, jsonb_build_object('th', ma.display_name)), 'active'
  FROM merchant_accounts ma
  JOIN places p ON p.id = ma.place_id
 WHERE ma.place_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM brands b WHERE b.owner_account_id = ma.id);

-- Attach each legacy account's place to its (single) brand.
UPDATE places pl
   SET brand_id = b.id
  FROM merchant_accounts ma
  JOIN brands b ON b.owner_account_id = ma.id
 WHERE pl.id = ma.place_id
   AND pl.brand_id IS NULL;

-- Seed the active branch = the legacy home place, so currentAccount returns the identical row on day 1.
UPDATE merchant_accounts
   SET active_place_id = place_id
 WHERE active_place_id IS NULL AND place_id IS NOT NULL;
