-- 0057_stay_operating_mode.sql — per-PROPERTY operating mode (rental period), so the back-office shows
-- only the menus that fit how a property actually rents. Sits beside room_mode (0037, room STRUCTURE)
-- and is orthogonal to it:
--   stay_mode = 'nightly' → rents by the night (hotel/homestay/guesthouse): keep ปฏิทินรวม + หาห้องว่าง.
--   stay_mode = 'monthly' → long-term tenancy (dorm/apartment/condo): hide the night-by-night tools.
--   stay_mode = 'both'    → does both; show everything.
-- UI/onboarding metadata ONLY — it gates which merchant menus show. It is NOT a booking/availability
-- gate: stay_units.rental_mode (per unit) stays the source of truth for what's bookable, so a mixed
-- property keeps working unchanged. Defaulted from the accommodation kind at signup; editable in /merchant/shop.
ALTER TABLE places ADD COLUMN IF NOT EXISTS stay_mode text NOT NULL DEFAULT 'both';

-- Backfill existing stay properties from their kind so menus are correct immediately (non-stay places
-- keep 'both' — harmless, they have no stay menus). Owners can change it in shop settings.
UPDATE places SET stay_mode = CASE
    WHEN stay_kind IN ('dorm','apartment','condo','mansion') THEN 'monthly'
    WHEN stay_kind IN ('homestay','guesthouse','hotel')      THEN 'nightly'
    ELSE 'both'
  END
 WHERE stay_kind IS NOT NULL;
