-- 0055_stay_marketplace_ready.sql
-- A room listing only shows on the consumer marketplace once it has a price AND ≥1 photo (matches the
-- create/update actions). Backfill: hide existing published-but-incomplete listings from guests (still
-- visible + editable in the merchant backend; status unchanged). No money — visibility projection only.
UPDATE stay_units SET published_to_marketplace = false, updated_at = now()
 WHERE deleted_at IS NULL AND published_to_marketplace = true
   AND (price_minor IS NULL OR COALESCE(array_length(image_urls,1),0) = 0);
