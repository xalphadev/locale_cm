import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, Thumb, isUuid } from '../../ui';
import { BILLS, AMEN, FURNISHED_TH } from '../RoomForm';
import { updateVacancyAction, setStayUnitFlagAction, deleteStayUnitAction } from '../../../actions';

export const dynamic = 'force-dynamic';
const DAILY_TH: Record<string, string> = { vacant: 'ว่างวันนี้', full: 'เต็มวันนี้', ask: 'สอบถามว่าง' };
const daysAgo = (ts: any) => { const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return d <= 0 ? 'วันนี้' : d === 1 ? 'เมื่อวาน' : `${d} วันก่อน`; };
const baht = (m: any) => (m != null ? `฿${Math.round(m / 100).toLocaleString()}` : null);

export default async function RoomDetail({ params }: { params: { id: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const [u] = isUuid(params.id) ? await q<any>(`SELECT * FROM stay_units WHERE id=$1 AND place_id=$2`, [params.id, acc.place_id]) : [];
  if (!u) return (<><div className="mback"><a href="/merchant/rooms"><Icon n="chevL" size={18} /> ห้องพัก</a></div><h1>ไม่พบห้องพัก</h1></>);

  const imgs: string[] | null = u.image_urls;
  const monthly = u.rental_mode === 'monthly';
  const hidden = u.status === 'hidden';
  const billLabels = BILLS.filter(([k]) => (u.bills_included ?? []).includes(k)).map(([, l]) => l);
  const amenLabels = AMEN.filter(([k]) => (u.unit_amenities ?? []).includes(k)).map(([, l]) => l);
  const facts: [string, string, string][] = [];
  if (u.capacity) facts.push(['users', 'รับได้', `${u.capacity} ท่าน`]);
  if (u.room_size_sqm) facts.push(['ruler', 'ขนาด', `${u.room_size_sqm} ตร.ม.`]);
  if (u.deposit_minor != null) facts.push(['wallet', 'มัดจำ', baht(u.deposit_minor)!]);
  if (u.min_stay) facts.push(['calendar', 'ขั้นต่ำ', `${u.min_stay} ${monthly ? 'เดือน' : 'คืน'}`]);
  if (u.furnished) facts.push(['sofa', 'เฟอร์นิเจอร์', FURNISHED_TH[u.furnished] || u.furnished]);

  return (
    <>
      <div className="mback"><a href="/merchant/rooms"><Icon n="chevL" size={18} /> ห้องพัก</a></div>

      <div className="dhero">
        {imgs && imgs.length ? (
          <div className="dgal">{imgs.map((src, i) => <img key={i} src={src} alt="" loading={i ? 'lazy' : 'eager'} />)}</div>
        ) : (
          <span className="dhero-ph"><Thumb images={null} kind="room" /><span>ยังไม่มีรูป — เพิ่มรูปในหน้าแก้ไข</span></span>
        )}
        {imgs && imgs.length > 1 && <span className="dcount"><Icon n="image" size={12} /> {imgs.length} รูป</span>}
      </div>

      <div className="dtitle">
        <div className="dtags">
          <span className="t cat"><Icon n="bed" size={12} /> {monthly ? 'เช่ารายเดือน' : 'เช่ารายวัน'}</span>
          {hidden && <span className="t off">ซ่อนอยู่</span>}
        </div>
        <h1>{i18n(u.name_i18n)}</h1>
        {u.price_minor != null && <div className="dprice">{baht(u.price_minor)}<span>/{monthly ? 'เดือน' : 'คืน'}</span></div>}
      </div>

      {/* Availability — the 10-second update, restamps freshness */}
      <div className="availcard">
        <div className="availcard-l">
          <div className="availcard-k">สถานะห้องว่าง</div>
          {monthly
            ? <div className={`availcard-v ${u.available_units > 0 ? 'ok' : 'no'}`}>{u.available_units > 0 ? `ว่าง ${u.available_units} ห้อง` : 'เต็มแล้ว'}</div>
            : <div className={`availcard-v ${u.daily_status === 'vacant' ? 'ok' : u.daily_status === 'full' ? 'no' : ''}`}>{DAILY_TH[u.daily_status]}</div>}
          <div className="availcard-f"><Icon n="clock" size={12} /> อัปเดต {daysAgo(u.availability_updated_at)}</div>
        </div>
        {monthly ? (
          <div className="stepper">
            <form action={updateVacancyAction.bind(null, u.id, -1)}><button className="step" type="submit" aria-label="ลดห้องว่าง"><Icon n="minus" size={18} /></button></form>
            <span className="step-n">{u.available_units}</span>
            <form action={updateVacancyAction.bind(null, u.id, 1)}><button className="step" type="submit" aria-label="เพิ่มห้องว่าง"><Icon n="plus" size={18} /></button></form>
          </div>
        ) : (
          <form action={setStayUnitFlagAction.bind(null, u.id, 'cycle_daily')}><button className="dbtn sm" type="submit">เปลี่ยนสถานะ →</button></form>
        )}
      </div>

      {facts.length > 0 && (
        <div className="factgrid">
          {facts.map(([ic, l, v]) => (
            <div className="factitem" key={l}>
              <span className="factitem-ic"><Icon n={ic} size={17} /></span>
              <div className="factitem-tx"><div className="factitem-l">{l}</div><div className="factitem-v">{v}</div></div>
            </div>
          ))}
        </div>
      )}

      {billLabels.length > 0 && (<>
        <h2 className="rsec"><span className="rsec-ic"><Icon n="bill" size={15} /></span> รวมค่าใช้จ่าย</h2>
        <div className="chips">{billLabels.map((l) => <span className="chip" key={l}><Icon n="check" size={12} /> {l}</span>)}</div>
      </>)}

      {amenLabels.length > 0 && (<>
        <h2 className="rsec"><span className="rsec-ic"><Icon n="sofa" size={15} /></span> สิ่งอำนวยความสะดวก</h2>
        <div className="chips">{amenLabels.map((l) => <span className="chip" key={l}><Icon n="check" size={12} /> {l}</span>)}</div>
      </>)}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="store" size={15} /></span> จัดการห้อง</h2>
      <div className="dbar">
        <a className="dbtn primary" href={`/merchant/rooms/${u.id}/edit`}><Icon n="edit" size={18} /> แก้ไขห้อง</a>
        <form action={setStayUnitFlagAction.bind(null, u.id, hidden ? 'show' : 'hide')}><button className="dbtn" type="submit"><Icon n={hidden ? 'eye' : 'eyeOff'} size={18} /> {hidden ? 'แสดงให้ลูกค้าเห็น' : 'ซ่อนจากลูกค้า'}</button></form>
      </div>
      <form className="delwrap" action={deleteStayUnitAction.bind(null, u.id)}>
        <button className="dbtn danger" type="submit"><Icon n="trash" size={17} /> ลบห้องนี้</button>
      </form>
    </>
  );
}
