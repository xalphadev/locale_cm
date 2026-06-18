-- 0034_stay_booking_request.sql — in-app booking / viewing-request inbox (the lead funnel).
--
-- Founder decision (2026-06-18): the consumer "contact via LINE/phone" handoff becomes a STRUCTURED
-- lead the owner sees in their console. This is the ONE place we store a consumer's contact (name +
-- phone/LINE) — minimal PII, surfaced WITH a privacy notice at the form ("ข้อมูลติดต่อจะถูกส่งให้
-- เจ้าของที่พัก"). STILL no money: a request is a lead, NEVER a confirmed/paid reservation. Promotable
-- into an anonymous occupancy block (0033, via converted_block_id). Soft-delete + lead `expires_at`
-- keep the inbox clean and the PII retention bounded. These rows are EXCLUDED from the pillar-4 data
-- product (see docs/13 §2).

CREATE TABLE IF NOT EXISTS stay_booking_request (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id           uuid NOT NULL REFERENCES places(id),
  stay_unit_id       uuid REFERENCES stay_units(id),       -- which listing they enquired on
  room_id            uuid REFERENCES stay_room(id),        -- optional: a specific room
  request_kind       text NOT NULL DEFAULT 'enquiry',      -- viewing | booking | enquiry
  rental_mode        text,                                 -- monthly | daily (mirrors the listing)
  desired_from       date,
  desired_to         date,                                 -- nightly check-out; monthly NULL
  desired_months     int,
  party_size         int,
  requester_user_id  uuid REFERENCES users(id),            -- set when the requester is a logged-in consumer
  contact_name       text,
  contact_phone      text,
  contact_line       text,
  message            text,
  channel            text NOT NULL DEFAULT 'app',          -- app | line | phone | walk_in
  status             text NOT NULL DEFAULT 'new',          -- new | contacted | scheduled | confirmed | declined | expired | converted
  scheduled_at       timestamptz,                          -- the viewing-appointment time
  converted_block_id uuid REFERENCES stay_occupancy_block(id),
  expires_at         timestamptz,                          -- lead-retention bound (PII auto-ageing)
  deleted_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_booking_req_place ON stay_booking_request(place_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_booking_req_user  ON stay_booking_request(requester_user_id) WHERE requester_user_id IS NOT NULL AND deleted_at IS NULL;
