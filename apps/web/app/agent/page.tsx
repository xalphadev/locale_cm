import { createPlaceAction } from '../actions';
import { PageHead } from '../adm-ui';

export const dynamic = 'force-dynamic';

const SUBCATS: Record<string, string[]> = {
  eat: ['cafe', 'restaurant', 'street_food', 'dessert', 'bar'],
  see: ['temple', 'viewpoint', 'market', 'museum'],
  do: ['cooking_class', 'spa', 'muay_thai', 'workshop'],
};

export default function AgentNewPlace({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <PageHead icon="plus" title="เพิ่มร้าน / สถานที่ใหม่"
        sub="ส่งเป็น change-proposal → ขึ้นคิวให้แอดมินตรวจ (คนละคนกับผู้เสนอ) แล้วค่อยขึ้นจริงในแคตตาล็อก" />
      {searchParams?.error && <p className="bad" style={{ padding: '.6rem .9rem', borderRadius: 8 }}>⚠ {searchParams.error}</p>}

      <form className="form" action={createPlaceAction}>
        <div className="grid2">
          <div className="field"><label>ชื่อร้าน (ไทย) *</label><input name="name_th" required placeholder="เช่น ร้านกาแฟนิมมาน" /></div>
          <div className="field"><label>Name (EN)</label><input name="name_en" placeholder="e.g. Nimman Slow Bar" /></div>
        </div>
        <div className="field"><label>คำอธิบาย (ไทย)</label><textarea name="desc_th" placeholder="สโลว์บาร์ คั่วอ่อน ที่นั่งสบาย" /></div>
        <div className="grid2">
          <div className="field"><label>ประเภท *</label>
            <select name="category" required defaultValue="eat">
              <option value="eat">eat · ที่กิน</option>
              <option value="see">see · ที่เที่ยว</option>
              <option value="do">do · กิจกรรม</option>
            </select>
          </div>
          <div className="field"><label>หมวดย่อย *</label>
            <select name="subcategory" required defaultValue="cafe">
              {Object.values(SUBCATS).flat().map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label>ละติจูด (lat) *</label><input name="lat" required type="number" step="any" defaultValue="18.7975" /></div>
          <div className="field"><label>ลองจิจูด (lng) *</label><input name="lng" required type="number" step="any" defaultValue="98.9665" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>โทรศัพท์</label><input name="phone" placeholder="053-xxxxxx" /></div>
          <div className="field"><label>ระดับราคา</label>
            <select name="price_band" defaultValue="2">
              <option value="">—</option>
              <option value="1">฿</option><option value="2">฿฿</option>
              <option value="3">฿฿฿</option><option value="4">฿฿฿฿</option>
            </select>
          </div>
        </div>
        <div className="field"><label>สิ่งอำนวยความสะดวก (คั่นด้วย ,)</label><input name="amenities" placeholder="wifi, power_outlet, parking" /></div>
        <button className="btn btn-primary" type="submit">ส่งให้แอดมินตรวจ →</button>
      </form>
    </>
  );
}
