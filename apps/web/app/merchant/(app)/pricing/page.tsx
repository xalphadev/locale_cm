import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { MTopbar } from '../MTopbar';
import { ConfirmSubmit } from '../ConfirmSubmit';
import { createSeasonAction, deleteSeasonAction, createRateAction, deleteRateAction } from '../../actions';
import DateRangePicker from '../DateRangePicker';

export const dynamic = 'force-dynamic';

// "ราคาตามฤดู" (0035) — per room-TYPE rates by season window. DISPLAY-only: shown to customers, never a
// payment. Base price lives on stay_units.price_minor (edited in the room form); seasons override it.
const baht = (m: any) => (m != null ? `฿${Math.round(Number(m) / 100).toLocaleString()}` : '—');
const fmt = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');

export default async function Pricing({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay && !acc.manages_stay) redirect('/merchant');

  const seasons = await q<any>(`SELECT id, label_i18n, start_date, end_date, recurs_yearly FROM stay_season WHERE place_id=$1 AND deleted_at IS NULL ORDER BY start_date`, [acc.place_id]);
  const types = await q<any>(`SELECT id, name_i18n, rental_mode, price_minor FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const rates = await q<any>(
    `SELECT r.id, r.stay_unit_id, r.price_minor, r.price_period, r.start_date, r.end_date, r.season_id, s.label_i18n season_label
       FROM stay_rate r LEFT JOIN stay_season s ON s.id = r.season_id
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND (s.id IS NULL OR s.deleted_at IS NULL)
      ORDER BY r.created_at`, [acc.place_id]);
  const ratesByUnit: Record<string, any[]> = {};
  for (const r of rates) (ratesByUnit[r.stay_unit_id] ||= []).push(r);

  return (
    <>
      <MTopbar back="/merchant/rooms" backLabel="ประเภท & ราคา" title="ราคาตามฤดู" />

      {searchParams?.ok && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      {searchParams?.error === 'date' && <div className="banner-err">กรุณาเลือกวันเริ่ม–สิ้นสุด</div>}
      {searchParams?.error === 'price' && <div className="banner-err">กรุณาใส่ราคา</div>}
      {searchParams?.error === 'label' && <div className="banner-err">กรุณาตั้งชื่อช่วง</div>}
      {searchParams?.error === 'unit' && <div className="banner-err">ไม่พบรูปแบบห้อง</div>}

      <p className="note">ตั้งราคาต่อ “รูปแบบห้อง” แยกตามช่วง (ไฮ/โลว์ซีซั่น) — เป็นราคาที่ <b>แสดง</b> ให้ลูกค้าเห็นเท่านั้น ไม่มีการเก็บเงินผ่านแอป</p>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="calendar" size={15} /></span> ช่วงราคา (ฤดู)</div>
        {seasons.length === 0
          ? <p className="fhint">ยังไม่มีช่วง — เพิ่มด้านล่าง (เช่น ไฮซีซั่น 1 พ.ย.–28 ก.พ.)</p>
          : (
            <div className="mlist">
              {seasons.map((se) => (
                <div className="mrow" key={se.id} style={{ cursor: 'default' }}>
                  <span className="mrow-body">
                    <span className="mrow-nm">{i18n(se.label_i18n)}</span>
                    <span className="mrow-meta">{fmt(se.start_date)}–{fmt(se.end_date)}{se.recurs_yearly ? ' · ทุกปี' : ''}</span>
                  </span>
                  <form action={deleteSeasonAction.bind(null, se.id)}><ConfirmSubmit message="ลบช่วงราคานี้? ราคาทั้งหมดที่ผูกกับช่วงนี้จะถูกลบไปด้วย" className="dbtn sm danger"><Icon n="trash" size={14} /></ConfirmSubmit></form>
                </div>
              ))}
            </div>
          )}
        <form className="pricesub" action={createSeasonAction}>
          <div className="field"><label>ชื่อช่วง <span className="req">*</span></label><input name="label" placeholder="ไฮซีซั่น" required /></div>
          <DateRangePicker mode="range" fromName="start_date" toName="end_date" labelFrom="เริ่ม" labelTo="ถึง" allowPast />
          <label className="check"><input type="checkbox" name="recurs_yearly" defaultChecked /> ใช้ช่วงนี้ทุกปี</label>
          <button className="btn btn-primary" type="submit">+ เพิ่มช่วง</button>
        </form>
      </section>

      {types.length === 0 ? (
        <p className="note">ยังไม่มีรูปแบบห้อง — สร้างที่เมนู “ห้องพัก” ก่อน แล้วค่อยตั้งราคาตามช่วง</p>
      ) : types.map((t) => {
        const per = t.rental_mode === 'monthly' ? 'เดือน' : 'คืน';
        const rs = ratesByUnit[t.id] || [];
        return (
          <section className="fsec" key={t.id}>
            <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> {i18n(t.name_i18n)}</div>
            <div className="mrow" style={{ cursor: 'default' }}>
              <span className="mrow-body"><span className="mrow-nm">ราคาปกติ</span><span className="mrow-meta">ราคาฐาน — แก้ที่หน้าแก้ไขห้องพัก</span></span>
              <span className="mrow-tags"><b>{t.price_minor != null ? `${baht(t.price_minor)}/${per}` : 'ยังไม่ตั้ง'}</b></span>
            </div>
            {rs.map((r) => (
              <div className="mrow" key={r.id} style={{ cursor: 'default' }}>
                <span className="mrow-body">
                  <span className="mrow-nm">{r.season_id ? i18n(r.season_label) : `${fmt(r.start_date)}–${fmt(r.end_date)}`}</span>
                  <span className="mrow-meta">{baht(r.price_minor)}/{r.price_period === 'month' ? 'เดือน' : 'คืน'}</span>
                </span>
                <form action={deleteRateAction.bind(null, r.id)}><ConfirmSubmit message="ลบราคาช่วงนี้?" className="dbtn sm danger"><Icon n="trash" size={14} /></ConfirmSubmit></form>
              </div>
            ))}
            <form className="pricesub" action={createRateAction}>
              <input type="hidden" name="stay_unit_id" value={t.id} />
              <div className="fgrid">
                <div className="field"><label>ช่วง</label>
                  <select name="season_id" defaultValue="">
                    <option value="">— ระบุวันที่เอง —</option>
                    {seasons.map((se) => <option key={se.id} value={se.id}>{i18n(se.label_i18n)}</option>)}
                  </select>
                </div>
                <div className="field"><label>ราคา/{per} <span className="req">*</span></label><input name="price" type="number" min="0" placeholder="1500" required /></div>
              </div>
              <DateRangePicker mode="range" fromName="start_date" toName="end_date" labelFrom="เริ่ม (ถ้าไม่เลือกช่วง)" labelTo="ถึง" allowPast />
              <button className="btn btn-primary" type="submit">+ เพิ่มราคาช่วงนี้</button>
            </form>
          </section>
        );
      })}
    </>
  );
}
