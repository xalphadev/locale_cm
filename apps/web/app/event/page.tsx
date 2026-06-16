import { createEventAction } from '../actions';
import { PageHead } from '../adm-ui';

export const dynamic = 'force-dynamic';

export default function ProposeEvent({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <PageHead icon="calendar" title="เพิ่มกิจกรรม / เทศกาลใหม่"
        sub="ส่งเป็น change-proposal ผ่านท่อเดียวกับร้าน → แอดมินอนุมัติ (คนละคน, SoD) → ขึ้นใน Discover" />
      {searchParams?.error && <p className="bad" style={{ padding: '.6rem .9rem', borderRadius: 8 }}>⚠ {searchParams.error}</p>}

      <form className="form" action={createEventAction}>
        <div className="grid2">
          <div className="field"><label>ชื่อกิจกรรม (ไทย) *</label><input name="title_th" required placeholder="เช่น นิมมาน แจ๊ส ไนต์" /></div>
          <div className="field"><label>Title (EN)</label><input name="title_en" placeholder="e.g. Nimman Jazz Night" /></div>
        </div>
        <div className="field"><label>รายละเอียด (ไทย)</label><textarea name="desc_th" placeholder="ดนตรีแจ๊สสดริมถนน เริ่มทุ่มหนึ่ง" /></div>
        <div className="field"><label>ประเภท *</label>
          <select name="kind" required defaultValue="market">
            <option value="festival">festival · เทศกาล</option>
            <option value="market">market · ตลาด/มาร์เก็ต</option>
            <option value="performance">performance · การแสดง</option>
            <option value="workshop">workshop · เวิร์กช็อป</option>
            <option value="seasonal">seasonal · ตามฤดูกาล</option>
          </select>
        </div>
        <div className="grid2">
          <div className="field"><label>เริ่ม *</label><input name="starts_at" required type="datetime-local" /></div>
          <div className="field"><label>สิ้นสุด</label><input name="ends_at" type="datetime-local" /></div>
        </div>
        <div className="grid2">
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '.5rem' }}>
            <input id="feat" name="is_featured" type="checkbox" style={{ width: 'auto' }} /><label htmlFor="feat" style={{ margin: 0 }}>แนะนำ (featured)</label></div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '.5rem' }}>
            <input id="rec" name="is_recurring" type="checkbox" style={{ width: 'auto' }} /><label htmlFor="rec" style={{ margin: 0 }}>จัดประจำ (recurring)</label></div>
        </div>
        <button className="btn btn-primary" type="submit">ส่งให้แอดมินตรวจ →</button>
      </form>
    </>
  );
}
