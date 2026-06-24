import Link from 'next/link';
import { Icon } from '../ui';

// One "ห้อง" menu, two views — the segmented switch that unifies the room board (now) and the calendar
// (by date) so they read as a single menu with a toggle, not two confusingly-similar nav entries.
export function RoomViewToggle({ active }: { active: 'board' | 'calendar' }) {
  return (
    <div className="roomview">
      <Link className={`roomview-i ${active === 'board' ? 'on' : ''}`} href="/merchant/units">
        <Icon n="grid" size={15} /> ผังตอนนี้
      </Link>
      <Link className={`roomview-i ${active === 'calendar' ? 'on' : ''}`} href="/merchant/units/calendar">
        <Icon n="calendar" size={15} /> ปฏิทินตามวัน
      </Link>
    </div>
  );
}
