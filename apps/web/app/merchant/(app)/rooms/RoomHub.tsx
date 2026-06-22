import Link from 'next/link';
import { Icon } from '../ui';
import { HubInfo } from './HubInfo';

// Shared header for the room "hub". Both /merchant/rooms (ประเภท & ราคา) and /merchant/units (ผังห้อง)
// render this identically, so the two views read as two tabs of ONE section — not two parallel bottom-nav
// menus (which confused owners). The segment only appears when there's a board to switch to
// (offers_stay && manages_stay && multi); otherwise it degrades to a plain titled header.
export function RoomHub({ active, showSeg, noun, addHref, addLabel }: {
  active: 'types' | 'board'; showSeg: boolean; noun: string; addHref?: string; addLabel?: string;
}) {
  const sub = !showSeg
    ? 'ราคา รูป ห้องว่าง — สิ่งที่ลูกค้าเห็น'
    : active === 'types'
      ? 'หน้าร้านของคุณ — ราคา รูป จำนวนห้องว่างที่ลูกค้าเห็น'
      : 'ห้องจริงของคุณ — ใครอยู่ห้องไหน / ว่างกี่ห้อง (ไม่โชว์ลูกค้า)';
  return (
    <div className="roomhub">
      <div className="listhead">
        <h1>{noun}</h1>
        {showSeg && active === 'types' && <HubInfo />}
        {addHref && <Link className="addbtn" href={addHref}><Icon n="plus" size={17} /> {addLabel}</Link>}
      </div>
      {showSeg && (
        <div className="roomseg" role="tablist">
          <Link className={`roomseg-i ${active === 'types' ? 'on' : ''}`} href="/merchant/rooms">ประเภท &amp; ราคา</Link>
          <Link className={`roomseg-i ${active === 'board' ? 'on' : ''}`} href="/merchant/units">ผังห้อง</Link>
        </div>
      )}
      <p className="roomhub-sub">{sub}</p>
    </div>
  );
}
