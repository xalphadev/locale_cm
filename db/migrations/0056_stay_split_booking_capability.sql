-- 0056_stay_split_booking_capability.sql
-- Capability reframe: "ห้องพัก" (offers_stay = listed on /stay, contact direct) is now SEPARATE from
-- "ระบบการจอง" (manages_stay = in-app booking requests + online payment + room board + check-in/out).
-- Previously the consumer booking flow was gated on offers_stay, so every listed place implicitly
-- accepted bookings. Backfill: keep that behaviour for existing places by turning ระบบการจอง on wherever
-- a place is currently listed — so no one loses the ability to receive bookings. New places choose per the
-- 3 toggles in /merchant/shop. Idempotent (only flips false→true). No money — capability projection only.
-- (places has no deleted_at — visibility is via status/is_visible; the flag is set regardless of status.)
UPDATE places SET manages_stay = true, updated_at = now()
 WHERE offers_stay = true AND manages_stay = false;
