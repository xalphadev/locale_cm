import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { createStayUnitAction, updateVacancyAction, setStayUnitFlagAction, deleteStayUnitAction } from '../../actions';

export const dynamic = 'force-dynamic';

const BILLS: [string, string][] = [['water', 'น้ำ'], ['electricity', 'ไฟ'], ['wifi', 'เน็ต'], ['common_fee', 'ส่วนกลาง']];
const AMEN: [string, string][] = [['aircon', 'แอร์'], ['private_bath', 'ห้องน้ำในตัว'], ['balcony', 'ระเบียง'], ['kitchen', 'ครัว'], ['washing_machine', 'เครื่องซักผ้า'], ['parking', 'ที่จอดรถ'], ['pets_ok', 'เลี้ยงสัตว์ได้'], ['fiber_wifi', 'เน็ตไฟเบอร์']];
const DAILY_TH: Record<string, string> = { vacant: 'ว่างวันนี้', full: 'เต็มวันนี้', ask: 'สอบถามว่าง' };
const daysAgo = (ts: any) => { const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return d <= 0 ? 'วันนี้' : d === 1 ? 'เมื่อวาน' : `${d} วันก่อน`; };

export default async function Rooms({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const rows = await q<any>(
    `SELECT id, name_i18n, rental_mode, price_minor, price_period, available_units, available_from, daily_status,
            availability_updated_at, capacity, status
       FROM stay_units WHERE place_id=$1 ORDER BY rental_mode, sort, created_at DESC`, [acc.place_id]);

  return (
    <>
      <h1>ห้องพัก / ห้องว่าง</h1>
      {searchParams?.ok && <div className="banner-ok">✓ เพิ่มห้องแล้ว — ลูกค้าเห็นได้เมื่อที่พักเผยแพร่อยู่</div>}
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อห้อง</div>}
      <p className="note">โชว์ห้อง + บอกว่าว่างกี่ห้อง/ว่างวันนี้ไหม — ลูกค้าทักไลน์/โทรจองกับคุณเอง (แอปไม่มีระบบจอง/จ่ายเงิน)</p>

      <form className="form pform" action={createStayUnitAction}>
        <div className="field"><label>ชื่อห้อง *</label><input name="name_th" required placeholder="เช่น ห้องสตูดิโอ แอร์ / ห้องเตียงคู่ วิวสวน" /></div>
        <div className="grid3">
          <div className="field"><label>ประเภทเช่า</label><select name="rental_mode" defaultValue="monthly"><option value="monthly">รายเดือน</option><option value="daily">รายวัน</option></select></div>
          <div className="field"><label>ราคา (บาท)</label><input name="price" type="number" min="0" placeholder="5500" /></div>
          <div className="field"><label>รับกี่ท่าน</label><input name="capacity" type="number" min="1" placeholder="2" /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>รายเดือน: ว่างกี่ห้อง</label><input name="available_units" type="number" min="0" defaultValue="1" /></div>
          <div className="field"><label>รายวัน: สถานะวันนี้</label><select name="daily_status" defaultValue="vacant"><option value="vacant">ว่างวันนี้</option><option value="ask">สอบถามว่าง</option><option value="full">เต็มวันนี้</option></select></div>
          <div className="field"><label>เฟอร์นิเจอร์</label><select name="furnished" defaultValue=""><option value="">—</option><option value="furnished">เฟอร์ครบ</option><option value="partial">บางส่วน</option><option value="unfurnished">ไม่มี</option></select></div>
        </div>
        <div className="grid3">
          <div className="field"><label>มัดจำ (บาท)</label><input name="deposit" type="number" min="0" placeholder="5500" /></div>
          <div className="field"><label>สัญญาขั้นต่ำ (เดือน/คืน)</label><input name="min_stay" type="number" min="0" placeholder="3" /></div>
          <div className="field"><label>ขนาด (ตร.ม.)</label><input name="room_size_sqm" type="number" min="0" placeholder="24" /></div>
        </div>
        <div className="field"><label>รวมค่าใช้จ่าย (รายเดือน)</label>
          <div className="checkrow">{BILLS.map(([k, l]) => <label key={k} className="cbox"><input type="checkbox" name="bills" value={k} /> {l}</label>)}</div></div>
        <div className="field"><label>สิ่งอำนวยความสะดวก</label>
          <div className="checkrow">{AMEN.map(([k, l]) => <label key={k} className="cbox"><input type="checkbox" name="amenity" value={k} /> {l}</label>)}</div></div>
        <div className="field"><label>อัปโหลดรูปห้อง (เลือกได้หลายรูป)</label><input type="file" name="photos" accept="image/*" multiple /></div>
        <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด) — ถ้าไม่ใส่เลย ใช้รูปตัวอย่าง</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 44 }} /></div>
        <button className="btn btn-primary" type="submit">+ เพิ่มห้อง</button>
      </form>

      <h2>ห้องทั้งหมด ({rows.length})</h2>
      {rows.length === 0 && <p className="note">ยังไม่มีห้อง — เพิ่มจากฟอร์มด้านบน</p>}
      <div className="ptable">
        {rows.map((r) => (
          <div className={`prow ${r.status === 'hidden' ? 'off' : ''}`} key={r.id}>
            <div className="pr-main">
              <b>{i18n(r.name_i18n)}</b>
              <span className="pr-meta">
                {r.rental_mode === 'monthly' ? 'รายเดือน' : 'รายวัน'}
                {r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}/${r.price_period === 'night' ? 'คืน' : 'เดือน'}` : ''}
                {` · อัปเดต ${daysAgo(r.availability_updated_at)}`}
              </span>
              <span className="pr-tags">
                {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                {r.rental_mode === 'monthly'
                  ? <span className={`t ${r.available_units > 0 ? 'season' : 'sold'}`}>{r.available_units > 0 ? `ว่าง ${r.available_units} ห้อง` : 'เต็ม'}</span>
                  : <span className={`t ${r.daily_status === 'vacant' ? 'season' : r.daily_status === 'full' ? 'sold' : ''}`}>{DAILY_TH[r.daily_status]}</span>}
              </span>
            </div>
            <div className="pr-acts">
              {r.rental_mode === 'monthly' ? (
                <>
                  <form action={updateVacancyAction.bind(null, r.id, -1)}><button className="mini" type="submit">−</button></form>
                  <form action={updateVacancyAction.bind(null, r.id, 1)}><button className="mini" type="submit">+ ห้องว่าง</button></form>
                </>
              ) : (
                <form action={setStayUnitFlagAction.bind(null, r.id, 'cycle_daily')}><button className="mini" type="submit">เปลี่ยนสถานะวันนี้</button></form>
              )}
              <form action={setStayUnitFlagAction.bind(null, r.id, r.status === 'hidden' ? 'show' : 'hide')}><button className="mini" type="submit">{r.status === 'hidden' ? 'แสดง' : 'ซ่อน'}</button></form>
              <form action={deleteStayUnitAction.bind(null, r.id)}><button className="mini danger" type="submit">ลบ</button></form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
