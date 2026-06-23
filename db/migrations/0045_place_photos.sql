-- 0045_place_photos.sql — dedicated PLACE-level photo gallery (facade / lobby / pool / common areas).
-- Until now the consumer /place/[id] gallery was cobbled from product + room images + generated stock covers,
-- so a freshly-listed place looked generic. Give places their own image_urls[] (same self-owned-array pattern
-- as shop_products / stay_units / feed_posts) — uploaded via saveUploads(..,'places') (storage kind already
-- whitelisted) and shown FIRST in the gallery. Display-only; no money/PII.
ALTER TABLE places ADD COLUMN IF NOT EXISTS image_urls  text[];
ALTER TABLE places ADD COLUMN IF NOT EXISTS image_count int NOT NULL DEFAULT 0;
