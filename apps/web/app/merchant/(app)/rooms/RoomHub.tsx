import Link from 'next/link';
import { Icon } from '../ui';
import { HubInfo } from './HubInfo';
import { MTopbar } from '../MTopbar';

// Header for a room-management SPOKE page (จอง / ผังห้อง / ประเภท & ราคา). DEEP pages reached from the
// ห้องพัก hub, so a standard MTopbar (back-chevron → /merchant/stay + centered title). The add action is a
// FAB floating bottom-right (thumb-reachable; these pages have no bottom nav so nothing collides). The
// contextual "?" help sits inline at the end of the sub line, only where it's relevant (ประเภท & ราคา).
export function RoomHub({ active, title, addHref, addLabel }: {
  active: 'bookings' | 'board' | 'types'; title: string; addHref?: string; addLabel?: string;
}) {
  const sub = active === 'bookings'
    ? 'คำขอจอง + การจอง + ตรวจสลิปชำระเงินของที่พัก'
    : active === 'types'
      ? 'ราคา รูป ห้องว่าง — สิ่งที่ลูกค้าเห็น'
      : 'ห้องจริงของคุณ — ว่างกี่ห้อง · ตั้งสถานะเอง (ไม่โชว์ลูกค้า)';
  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title={title} />
      <div className="roomhub-subrow">
        <p className="roomhub-sub">{sub}</p>
        {active === 'types' && <HubInfo />}
      </div>
      {addHref && <Link className="fab" href={addHref} aria-label={addLabel}><Icon n="plus" size={26} /></Link>}
    </>
  );
}
