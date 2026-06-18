-- 0031_stay_capability_and_projection_flags.sql — capability split + marketplace projection flags.
--
-- Direction (founder, 2026-06-18): grow the NON-transactional stay showcase (0020) into a real
-- room-MANAGEMENT product sold as a standalone SaaS to accommodation owners — still NO in-system
-- money, NO invoicing, NO structured tenant records. This migration only adds the FLAGS that split
-- "manages their place" from "publishes to the consumer marketplace", and lets a managed listing's
-- vacancy be SYSTEM-computed instead of hand-typed. The physical-room / occupancy / booking / pricing
-- tables arrive in 0032-0035; everything here is additive and backward-compatible with the live
-- /stay browse (see docs/13_stay_room_management.md).
--
--   * places.manages_stay  — owner runs the room-management product (the SaaS gate). ORTHOGONAL to
--     offers_stay, which stays = "this place is PUBLISHED to the consumer /stay marketplace".
--       manages_stay && !offers_stay  = private SaaS tenant (manages rooms, invisible to consumers)
--       manages_stay && offers_stay   = upsold (manages + published)
--       offers_stay  && !manages_stay = legacy showcase-only listing (today's rows)
--   * stay_units.managed   — when true, available_units / daily_status are a PROJECTION of the
--     physical rooms + occupancy (fn_stay_refresh_vacancy, 0033), not owner-typed scalars. Default
--     false ⇒ every existing row keeps its hand-typed vacancy, the consumer read side is unchanged.
--   * stay_units.published_to_marketplace — per-listing publish toggle (the upsell switch). Default
--     true so every existing row keeps showing exactly as today.

ALTER TABLE places     ADD COLUMN IF NOT EXISTS manages_stay boolean NOT NULL DEFAULT false;

ALTER TABLE stay_units ADD COLUMN IF NOT EXISTS managed                  boolean NOT NULL DEFAULT false;
ALTER TABLE stay_units ADD COLUMN IF NOT EXISTS published_to_marketplace boolean NOT NULL DEFAULT true;

-- The SaaS gate, indexed for the portal's "which of my branches use room management" reads.
CREATE INDEX IF NOT EXISTS idx_places_manages_stay ON places(city_id) WHERE manages_stay;
-- The marketplace browse adds (offers_stay AND published_to_marketplace); keep the live read narrow.
CREATE INDEX IF NOT EXISTS idx_stay_units_published ON stay_units(place_id, status)
  WHERE deleted_at IS NULL AND published_to_marketplace;
