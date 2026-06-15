-- ============================================================================
-- 0019_shop_products.sql — merchant PRODUCT SHOWCASE (non-transactional) +
-- self-service merchant portal credentials.
--
--   • shop_products is the structural twin of feed_posts (0018): self-owned
--     image_urls[], a FLAT status (pending|published|hidden), author_kind.
--     price_minor is plain RETAIL THB satang and is NEVER joined to coin_lots /
--     the ledger (currency literal 'THB'). Products are SHOWCASE ONLY — the app
--     never processes a sale; the customer contacts the shop directly.
--   • Deliberately NOT routed through change_proposals / fn_apply_proposal (the
--     single money-adjacent place writer). Products get the lightweight feed_posts
--     treatment: a flat status + a simple admin/merchant toggle.
--   • No place_cat enum change — a goods vendor is flagged with places.sells_products
--     (produce vendors live under category='see' subcategory='market').
--   • merchant_accounts holds login credentials for the self-service portal, because
--     the money-plane users table has no password (auth was meant to be external).
-- ============================================================================

CREATE TABLE IF NOT EXISTS shop_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        uuid NOT NULL REFERENCES places(id),
  merchant_id     uuid REFERENCES merchants(id),
  city_id         uuid REFERENCES cities(id),
  name_i18n       jsonb NOT NULL DEFAULT '{}',
  description_i18n jsonb,
  subtype         text NOT NULL DEFAULT 'other',     -- fruit|vegetable|souvenir|bakery|craft|menu_item|grocery|other
  price_minor     bigint,                            -- plain RETAIL THB satang; NEVER joined to ledger/coin_lots
  price_unit      text,                              -- kg|piece|bag|box|cup|jar
  price_text_i18n jsonb,                             -- free-form fallback, e.g. {"th":"฿40/กำ"}
  currency        text NOT NULL DEFAULT 'THB',
  image_urls      text[],
  image_count     int NOT NULL DEFAULT 1,
  in_season       boolean NOT NULL DEFAULT false,
  available_today boolean NOT NULL DEFAULT true,
  sold_out        boolean NOT NULL DEFAULT false,
  sort            int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'published', -- pending | published | hidden
  author_kind     text NOT NULL DEFAULT 'merchant',  -- merchant | staff
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_products_place  ON shop_products(place_id, status);
CREATE INDEX IF NOT EXISTS idx_shop_products_browse ON shop_products(status, subtype, in_season DESC, created_at DESC);

ALTER TABLE places ADD COLUMN IF NOT EXISTS sells_products boolean NOT NULL DEFAULT false;
ALTER TABLE places ADD COLUMN IF NOT EXISTS shop_kind      text;   -- produce | bakery | crafts | grocery | mixed
CREATE INDEX IF NOT EXISTS idx_places_shops ON places(city_id) WHERE status='published' AND sells_products;

-- Self-service merchant portal login store (separate from money-plane users, which have no password).
-- password_hash format: "scryptN:<saltHex>:<hashHex>" (hashed in Node, never in DB).
CREATE TABLE IF NOT EXISTS merchant_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  phone         text,
  user_id       uuid REFERENCES users(id),           -- optional money-plane identity link
  merchant_id   uuid REFERENCES merchants(id),
  place_id      uuid REFERENCES places(id),           -- the ONE shop this account manages (single-place tenancy)
  status        text NOT NULL DEFAULT 'active',       -- active | suspended
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_place ON merchant_accounts(place_id);
