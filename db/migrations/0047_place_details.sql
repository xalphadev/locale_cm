-- 0047_place_details.sql — optional per-category extra info shown to customers, beyond the generic fields.
-- เที่ยว (see): best_time (ช่วงเวลาแนะนำ), getting_there (การเดินทาง). กิจกรรม (do): duration (ระยะเวลา),
-- includes (สิ่งที่รวมในกิจกรรม), getting_there (จุดนัดพบ/การเดินทาง). Stored as a flexible jsonb of plain Thai
-- strings {best_time, getting_there, duration, includes} so new keys need no migration. Display-only — NO money
-- (no prices/fees; entry fee stays out per the no-money rule).
ALTER TABLE places ADD COLUMN IF NOT EXISTS details jsonb;
