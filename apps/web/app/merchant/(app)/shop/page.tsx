import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';

export const dynamic = 'force-dynamic';

const CONSUMER = process.env.CONSUMER_BASE ?? 'http://127.0.0.1:3003';
const NIMMAN_LNG = 98.967, NIMMAN_LAT = 18.796;
function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

function Fact({ ic, label, value, link, muted }: { ic: string; label: string; value: string; link?: string; muted?: boolean }) {
  return (
    <div className="factitem">
      <span className="factitem-ic"><Icon n={ic} size={17} /></span>
      <div className="factitem-tx">
        <div className="factitem-l">{label}</div>
        <div className="factitem-v" style={muted ? { color: 'var(--hint,#9aa0a6)', fontWeight: 600 } : undefined}>
          {link ? <a href={link} target={link.startsWith('http') ? '_blank' : undefined} rel="noopener">{value}</a> : value}
        </div>
      </div>
    </div>
  );
}

// READ-ONLY shop detail. Opening this page shows the info; editing happens on /merchant/shop/edit
// (reached via the "แก้ไข" button) so the owner doesn't land straight in editable fields.
export default async function Shop({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = await q<any>(
    `SELECT name_i18n, description_i18n, phone, line_id, website, sells_products, offers_stay, manages_stay, room_mode, geo::text geo FROM places WHERE id=$1`, [acc.place_id]);
  const pt = parsePoint(p?.geo);
  const pinned = !!pt && !(Math.abs(pt.lng - NIMMAN_LNG) < 1e-4 && Math.abs(pt.lat - NIMMAN_LAT) < 1e-4);
  const desc = i18n(p?.description_i18n);
  const caps = [
    p?.sells_products && 'ขายสินค้า',
    p?.offers_stay && 'มีห้องพัก (เผยแพร่)',
    p?.manages_stay && 'ใช้ระบบจัดการห้อง',
  ].filter(Boolean) as string[];

  return (
    <>
      {searchParams?.ok && <div className="banner-ok">✓ บันทึกแล้ว</div>}

      <div className="listhead">
        <h1>ข้อมูลร้าน</h1>
        <a className="addbtn" href="/merchant/shop/edit"><Icon n="edit" size={16} /> แก้ไข</a>
      </div>

      <div className="dtitle">
        <div className="dtags">
          {acc.verified
            ? <span className="t season"><Icon n="check" size={12} /> ยืนยันเจ้าของแล้ว</span>
            : <a className="t off" href="/merchant/verify">ยังไม่ยืนยัน · กดยืนยัน</a>}
        </div>
        <h1>{i18n(p?.name_i18n) || 'ยังไม่ได้ตั้งชื่อร้าน'}</h1>
        {desc
          ? <p style={{ color: 'var(--muted,#6b7280)', fontSize: '.95rem', lineHeight: 1.6, margin: '4px 0 0' }}>{desc}</p>
          : <p className="fhint" style={{ margin: '4px 0 0' }}>ยังไม่ได้ใส่รายละเอียดร้าน</p>}
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="chat" size={15} /></span> ช่องทางติดต่อ</h2>
      <div className="factgrid">
        <Fact ic="phone" label="เบอร์โทร" value={p?.phone || 'ยังไม่ได้ใส่'} link={p?.phone ? `tel:${p.phone}` : undefined} muted={!p?.phone} />
        <Fact ic="chat" label="LINE ID" value={p?.line_id || 'ยังไม่ได้ใส่'} muted={!p?.line_id} />
        {p?.website && <Fact ic="globe" label="เว็บไซต์" value={p.website} link={p.website} />}
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="tag" size={15} /></span> ร้านนี้มี</h2>
      {caps.length > 0
        ? <div className="chips">{caps.map((c) => <span className="chip" key={c}><Icon n="check" size={12} /> {c}</span>)}</div>
        : <p className="note">ร้านทั่วไป — ยังไม่ได้เปิด “สินค้า” หรือ “ห้องพัก” (เปิดได้ที่ปุ่มแก้ไข)</p>}
      {p?.offers_stay && <p className="note" style={{ marginTop: 6 }}>รูปแบบห้อง: <b>{p.room_mode === 'unique' ? 'แต่ละห้องไม่เหมือนกัน (รีสอร์ท/เกสต์เฮาส์)' : 'หลายห้องเหมือนกัน (หอพัก/อพาร์ตเมนต์)'}</b></p>}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="pin" size={15} /></span> ตำแหน่งบนแผนที่</h2>
      <div className="factgrid">
        <Fact ic="pin" label="หมุดที่ตั้ง" value={pinned ? 'ปักหมุดแล้ว' : 'ยังไม่ได้ปักหมุด'} muted={!pinned} />
      </div>
      {!pinned && <p className="note">ยังไม่ได้ปักหมุด — ลูกค้าจะหาคุณบนแผนที่ไม่เจอ · กด “แก้ไข” เพื่อปักหมุด</p>}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="eye" size={15} /></span> หน้าร้านของลูกค้า</h2>
      <div className="menu">
        <a className="menu-row" href={`${CONSUMER}/place/${acc.place_id}`} target="_blank" rel="noopener">
          <span className="menu-ic"><Icon n="eye" size={19} /></span>
          <span className="menu-tx">ดูหน้าร้านที่ลูกค้าเห็น</span>
          <Icon n="ext" className="menu-go" size={16} />
        </a>
      </div>
    </>
  );
}
