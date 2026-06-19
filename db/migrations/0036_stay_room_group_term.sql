-- 0036_stay_room_group_term.sql — let each property name HOW its rooms are grouped.
--
-- The room-management board (0032 stay_room) groups rooms by stay_room.floor, but "floor" is only
-- right for a dorm/hotel. A resort groups by ZONE (โซนริมน้ำ), a complex by อาคาร/ตึก. The per-room
-- group VALUE stays free-text in stay_room.floor; this column just stores the NOUN used to label it
-- in the board + add-room form (e.g. "ชั้น 1" vs "โซน ริมน้ำ"). Default 'ชั้น' = today's behaviour.
ALTER TABLE places ADD COLUMN IF NOT EXISTS room_group_term text NOT NULL DEFAULT 'ชั้น';
