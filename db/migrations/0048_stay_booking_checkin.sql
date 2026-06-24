-- 0048_stay_booking_checkin.sql — close the stay loop: real check-in / check-out.
-- Until now a booking stopped at "converted" (room held by a block); "วันนี้/กำลังพัก" were derived from
-- dates, never from what actually happened at the front desk. These two timestamps record the real events.
-- The audit trail itself lives in stay_room_event (check_in/check_out kinds already defined in 0033); the
-- block flips to status='completed' on check-out. STILL no money — these are operational timestamps only.
ALTER TABLE stay_booking_request
  ADD COLUMN IF NOT EXISTS checked_in_at  timestamptz,
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;
