import { i18n } from '@/lib/db';
import { Icon } from '../ui';

export const SUBTYPES: [string, string][] = [
  ['fruit', 'ผลไม้'], ['vegetable', 'ผัก'], ['bakery', 'เบเกอรี'], ['menu_item', 'เมนูร้าน'],
  ['craft', 'งานคราฟต์'], ['souvenir', 'ของฝาก'], ['grocery', 'ของชำ'], ['other', 'อื่นๆ'],
];
const UNITS: [string, string][] = [['', '—'], ['kg', 'กก.'], ['piece', 'ชิ้น'], ['bag', 'ถุง'], ['box', 'กล่อง'], ['cup', 'แก้ว'], ['jar', 'กระปุก']];

/** Add/edit product form — `action` is createMerchantProductAction or updateMerchantProductAction.bind(id).
 *  `sections` = the shop's own menu sections (0066); managed on the products list page. */
export function ProductForm({ action, p, submitLabel, sections = [] }: {
  action: (fd: FormData) => void; p?: any; submitLabel: string; sections?: { id: string; name: string }[];
}) {
  return (
    <form className="form mform" action={action}>
      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="tag" size={15} /></span> ข้อมูลสินค้า</div>
        <div className="field"><label>ชื่อสินค้า <span className="req">*</span></label><input name="name_th" required defaultValue={p ? i18n(p.name_i18n) : ''} placeholder="เช่น มะม่วงน้ำดอกไม้สุก" /></div>
        <div className="field"><label>หมวดสินค้า</label><select name="subtype" defaultValue={p?.subtype || 'fruit'}>{SUBTYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        {sections.length > 0 ? (
          <div className="field"><label>หมวดในเมนูร้าน</label>
            <select name="section_id" defaultValue={p?.section_id || ''}>
              <option value="">— ไม่จัดหมวด —</option>
              {sections.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
          </div>
        ) : (
          <p className="fhint">อยากจัดเมนูเป็นหมวด (เช่น กาแฟ / เมนูข้าว / ของหวาน)? สร้างหมวดได้ที่หน้า “สินค้า”</p>
        )}
        <label className="check"><input type="checkbox" name="is_recommended" defaultChecked={!!p?.is_recommended} /> เมนูแนะนำของร้าน — ขึ้นป้าย “แนะนำ” และแสดงก่อน</label>
        <div className="fgrid">
          <div className="field"><label>ราคา (บาท)</label><input name="price" type="number" min="0" step="1" defaultValue={p?.price_minor != null ? Math.round(p.price_minor / 100) : ''} placeholder="80" /></div>
          <div className="field"><label>ต่อหน่วย</label><select name="price_unit" defaultValue={p?.price_unit || ''}>{UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <p className="fhint">เว้นว่างราคาได้ถ้าต้องการให้ลูกค้าทักมาสอบถาม</p>
        <label className="check"><input type="checkbox" name="in_season" defaultChecked={!!p?.in_season} /> สินค้าตามฤดูกาล — แสดงป้าย “ในฤดู” ให้ลูกค้า</label>
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> รูปสินค้า</div>
        <div className="field">
          <div className="filewrap"><span className="fw-ic"><Icon n="image" size={18} /></span><input type="file" name="photos" accept="image/*" multiple /></div>
          <p className="fhint">เลือกได้หลายรูป · JPG/PNG/WEBP ไม่เกิน 6MB ต่อรูป{p && p.image_urls?.length ? ` · มีอยู่แล้ว ${p.image_urls.length} รูป (อัปโหลดใหม่เพื่อแทนที่)` : ''}</p>
        </div>
        <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 44 }} /></div>
      </section>

      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
