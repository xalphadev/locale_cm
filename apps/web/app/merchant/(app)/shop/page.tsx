import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { SOCIAL_CHANNELS, socialHref } from '@/lib/socials';

export const dynamic = 'force-dynamic';

const CONSUMER = process.env.CONSUMER_BASE ?? 'http://127.0.0.1:3003';
const NIMMAN_LNG = 98.967, NIMMAN_LAT = 18.796;
const DAYS: [string, string][] = [['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัสบดี'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์']];
function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

// READ-ONLY branch detail — mirrors what the customer sees (cover, address, hours, contact) and leads with a
// readiness strip that nudges an incomplete branch to "พร้อมเผยแพร่". Editing is on /merchant/shop/edit.
export default async function Shop({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = await q<any>(
    `SELECT name_i18n, description_i18n, address_i18n, image_urls, opening_hours, phone, line_id, website, socials,
            sells_products, offers_stay, manages_stay, room_mode, geo::text geo
       FROM places WHERE id=$1`, [acc.place_id]);
  const pt = parsePoint(p?.geo);
  const pinned = !!pt && !(Math.abs(pt.lng - NIMMAN_LNG) < 1e-4 && Math.abs(pt.lat - NIMMAN_LAT) < 1e-4);
  const noun = (acc.branch_count ?? 1) > 1 ? 'สาขา' : 'ร้าน';
  const desc = i18n(p?.description_i18n);
  const addr = i18n(p?.address_i18n);
  const imgs: string[] = (p?.image_urls || []).filter(Boolean);
  const hours: Record<string, string> = p?.opening_hours || {};
  const socials: Record<string, string> = p?.socials || {};
  const hasHours = Object.keys(hours).length > 0;
  const caps = [
    p?.sells_products && 'ขายสินค้า',
    p?.offers_stay && 'มีห้องพัก (เผยแพร่)',
    p?.manages_stay && 'ใช้ระบบจัดการห้อง',
  ].filter(Boolean) as string[];

  // readiness: the 5 things a branch needs to look complete to customers
  const ready = [
    { ok: imgs.length > 0, label: 'รูป' },
    { ok: !!addr, label: 'ที่อยู่' },
    { ok: pinned, label: 'ปักหมุด' },
    { ok: hasHours, label: 'เวลาเปิด-ปิด' },
    { ok: !!(p?.phone || p?.line_id), label: 'ช่องทางติดต่อ' },
  ];
  const missing = ready.filter((r) => !r.ok).map((r) => r.label);
  const pct = Math.round(((ready.length - missing.length) / ready.length) * 100);
  const today = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', weekday: 'short' }).format(new Date()).toLowerCase().slice(0, 3);
  const hr = (k: string) => (hours[k] && hours[k] !== 'closed' ? hours[k].replace('-', '–') : 'ปิด');

  return (
    <>
      {searchParams?.ok && <div className="banner-ok">✓ บันทึกแล้ว</div>}

      <div className="listhead">
        <h1>ข้อมูล{noun}</h1>
        <Link className="addbtn" href="/merchant/shop/edit"><Icon n="edit" size={16} /> แก้ไข</Link>
      </div>

      {/* readiness strip — whole strip taps through to edit; vanishes at 100% */}
      {missing.length > 0 && (
        <Link className="banner-warn rstrip" href="/merchant/shop/edit">
          <span className="rstrip-top"><Icon n="clock" size={15} /> <b>ขาดอีก {missing.length} อย่างจะพร้อมเผยแพร่</b><span className="rstrip-go">แก้ไข →</span></span>
          <span className="rstrip-sub">{missing.join(' · ')}</span>
          <span className="rstrip-bar"><i style={{ width: pct + '%' }} /></span>
        </Link>
      )}

      {/* cover + gallery (what customers see first) */}
      <div className="dhero">
        {imgs.length > 0 ? (
          <>
            <div className="dgal">{imgs.map((u) => <img key={u} src={u} alt="" />)}</div>
            <span className="dcount"><Icon n="image" size={13} /> {imgs.length} รูป</span>
          </>
        ) : (
          <div className="dhero-ph"><span className="ph" /><span>ยังไม่มีรูป{noun}</span></div>
        )}
      </div>

      <div className="dtitle">
        <div className="dtags">
          {acc.verified
            ? <span className="t season"><Icon n="check" size={12} /> ยืนยันเจ้าของแล้ว</span>
            : <Link className="t off" href="/merchant/verify">ยังไม่ยืนยัน · กดยืนยัน</Link>}
        </div>
        <h1>{i18n(p?.name_i18n) || `ยังไม่ได้ตั้งชื่อ${noun}`}</h1>
        {(acc.branch_count ?? 1) > 1 && <p className="fhint" style={{ margin: '2px 0 0' }}><Icon n="store" size={12} /> สาขาของร้าน {i18n(acc.brand_name) || '—'}</p>}
        {desc
          ? <p style={{ color: 'var(--m-muted)', fontSize: '.95rem', lineHeight: 1.6, margin: '6px 0 0' }}>{desc}</p>
          : <p className="fhint" style={{ margin: '6px 0 0' }}>ยังไม่ได้ใส่รายละเอียด{noun}</p>}
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="chat" size={15} /></span> ที่อยู่ &amp; ติดต่อ</h2>
      <div className="info">
        <div className="info-row"><Icon n="pin" className="flat-ico" size={17} /><span style={{ color: addr ? 'var(--m-text)' : 'var(--m-muted)', fontWeight: 600 }}>{addr || 'ยังไม่ได้ใส่ที่อยู่'}</span></div>
        <div className="info-row"><Icon n="phone" className="flat-ico" size={17} /><span>เบอร์โทร</span>{p?.phone ? <b><a href={`tel:${p.phone}`}>{p.phone}</a></b> : <b style={{ color: 'var(--m-muted)', fontWeight: 600 }}>ยังไม่ได้ใส่</b>}</div>
        <div className="info-row"><Icon n="chat" className="flat-ico" size={17} /><span>LINE</span>{p?.line_id ? <b>{p.line_id}</b> : <b style={{ color: 'var(--m-muted)', fontWeight: 600 }}>ยังไม่ได้ใส่</b>}</div>
        {p?.website && <div className="info-row"><Icon n="globe" className="flat-ico" size={17} /><span>เว็บไซต์</span><b><a href={p.website} target="_blank" rel="noopener">เปิดเว็บ</a></b></div>}
        {SOCIAL_CHANNELS.filter((ch) => socials[ch.key]).map((ch) => (
          <div className="info-row" key={ch.key}><Icon n={ch.icon} className="flat-ico" size={17} /><span>{ch.label}</span><b><a href={socialHref(ch.key, socials[ch.key])} target="_blank" rel="noopener">{socials[ch.key].replace(/^https?:\/\//, '')}</a></b></div>
        ))}
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="clock" size={15} /></span> เวลาเปิด-ปิด</h2>
      {hasHours ? (
        <div className="info">
          {DAYS.map(([k, label]) => (
            <div className="info-row" key={k} style={k === today ? { fontWeight: 800 } : undefined}>
              <span style={k === today ? { color: 'var(--m-accent)' } : undefined}>{label}{k === today ? ' · วันนี้' : ''}</span>
              <b style={hours[k] && hours[k] !== 'closed' ? undefined : { color: 'var(--m-muted)', fontWeight: 600 }}>{hr(k)}</b>
            </div>
          ))}
        </div>
      ) : <p className="note">ยังไม่ได้ใส่เวลาเปิด-ปิด — ลูกค้าจะไม่เห็นสถานะ “เปิดอยู่/ปิด”</p>}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="tag" size={15} /></span> {noun}นี้มี</h2>
      {caps.length > 0
        ? <div className="chips">{caps.map((c) => <span className="chip" key={c}><Icon n="check" size={12} /> {c}</span>)}</div>
        : <p className="note">{noun}ทั่วไป — ยังไม่ได้เปิด “สินค้า” หรือ “ห้องพัก” (เปิดได้ที่ปุ่มแก้ไข)</p>}
      {p?.offers_stay && <p className="note" style={{ marginTop: 6 }}>รูปแบบห้อง: <b>{p.room_mode === 'unique' ? 'แต่ละห้องไม่เหมือนกัน (รีสอร์ท/เกสต์เฮาส์)' : 'หลายห้องเหมือนกัน (หอพัก/อพาร์ตเมนต์)'}</b></p>}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="pin" size={15} /></span> ตำแหน่งบนแผนที่</h2>
      {pinned ? (
        <div className="menu">
          <a className="menu-row" href={`https://www.google.com/maps?q=${pt!.lat},${pt!.lng}`} target="_blank" rel="noopener">
            <span className="menu-ic"><Icon n="pin" size={19} /></span>
            <span className="menu-tx">ปักหมุดแล้ว — ดูบน Google Maps</span>
            <Icon n="ext" className="menu-go" size={16} />
          </a>
        </div>
      ) : <p className="note">ยังไม่ได้ปักหมุด — ลูกค้าจะหาคุณบนแผนที่ไม่เจอ · กด “แก้ไข” เพื่อปักหมุด</p>}

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
