import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { thumb } from '@/lib/img';
import { updateVacancyAction, setStayUnitFlagAction } from '../../actions';

export const dynamic = 'force-dynamic';
const DAILY_TH: Record<string, string> = { vacant: 'ว่างวันนี้', full: 'เต็มวันนี้', ask: 'สอบถามว่าง' };
const daysAgo = (ts: any) => { const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return d <= 0 ? 'วันนี้' : d === 1 ? 'เมื่อวาน' : `${d} วันก่อน`; };

export default async function Rooms({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const rows = await q<any>(
    `SELECT id, name_i18n, rental_mode, price_minor, price_period, available_units, daily_status, availability_updated_at, image_urls, status
       FROM stay_units WHERE place_id=$1 ORDER BY rental_mode, sort, created_at DESC`, [acc.place_id]);
  return (
    <>
      <div className="listhead">
        <h1>ห้องพัก <span className="listcount">{rows.length}</span></h1>
        <a className="addbtn" href="/merchant/rooms/new">+ เพิ่มห้อง</a>
      </div>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว</div>}
      <p className="note">โชว์ห้อง + บอกว่าว่างกี่ห้อง/ว่างวันนี้ไหม — ลูกค้าทักไลน์/โทรจองกับคุณเอง</p>

      {rows.length === 0 ? (
        <div className="mempty">
          <p>ยังไม่มีห้อง — เพิ่มห้องแรกเพื่อให้ลูกค้าเห็นห้องว่าง</p>
          <a className="btn btn-primary" href="/merchant/rooms/new">+ เพิ่มห้องแรก</a>
        </div>
      ) : (
        <div className="mlist">
          {rows.map((r) => {
            const monthly = r.rental_mode === 'monthly';
            return (
              <div className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} key={r.id}>
                <a className="mrow-img" href={`/merchant/rooms/${r.id}/edit`}>
                  <img src={thumb(r.image_urls, 'r' + r.id, 'stay', 'see')} alt="" loading="lazy" />
                </a>
                <a className="mrow-body" href={`/merchant/rooms/${r.id}/edit`}>
                  <div className="mrow-nm">{i18n(r.name_i18n)}</div>
                  <div className="mrow-meta">{monthly ? 'รายเดือน' : 'รายวัน'}{r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}/${monthly ? 'เดือน' : 'คืน'}` : ''} · อัปเดต {daysAgo(r.availability_updated_at)}</div>
                  <div className="mrow-tags">
                    {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                    {monthly
                      ? <span className={`t ${r.available_units > 0 ? 'season' : 'sold'}`}>{r.available_units > 0 ? `ว่าง ${r.available_units} ห้อง` : 'เต็ม'}</span>
                      : <span className={`t ${r.daily_status === 'vacant' ? 'season' : r.daily_status === 'full' ? 'sold' : 'off'}`}>{DAILY_TH[r.daily_status]}</span>}
                  </div>
                </a>
                <div className="mrow-acts">
                  {monthly ? (
                    <div className="stepper">
                      <form action={updateVacancyAction.bind(null, r.id, -1)}><button className="mini step" type="submit">−</button></form>
                      <span className="step-n">{r.available_units}</span>
                      <form action={updateVacancyAction.bind(null, r.id, 1)}><button className="mini step" type="submit">+</button></form>
                    </div>
                  ) : (
                    <form action={setStayUnitFlagAction.bind(null, r.id, 'cycle_daily')}><button className="mini" type="submit">เปลี่ยนสถานะ</button></form>
                  )}
                  <a className="mini edit" href={`/merchant/rooms/${r.id}/edit`}>แก้ไข</a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
