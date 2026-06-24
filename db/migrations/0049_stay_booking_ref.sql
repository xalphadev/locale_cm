-- 0049: human-readable booking reference code (BK000001) on every booking/lead.
-- Shared by the ops calendar (bars show [BK...]), the bookings list/detail, and the
-- upcoming consumer online-booking + slip-payment flow (the "หมายเลขการจอง"). No money here —
-- just an identifier. A column DEFAULT means ALL insert paths get a ref with no action changes.
CREATE SEQUENCE IF NOT EXISTS stay_booking_ref_seq START 1001;

ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS ref text;

-- backfill existing rows (oldest first → stable ascending codes)
UPDATE stay_booking_request b
   SET ref = 'BK' || lpad(nextval('stay_booking_ref_seq')::text, 6, '0')
  FROM (SELECT id FROM stay_booking_request WHERE ref IS NULL ORDER BY created_at) o
 WHERE b.id = o.id;

ALTER TABLE stay_booking_request ALTER COLUMN ref SET DEFAULT ('BK' || lpad(nextval('stay_booking_ref_seq')::text, 6, '0'));
ALTER TABLE stay_booking_request ALTER COLUMN ref SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stay_booking_request_ref_key ON stay_booking_request(ref);
