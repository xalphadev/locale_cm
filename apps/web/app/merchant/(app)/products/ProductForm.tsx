import { i18n } from '@/lib/db';

export const SUBTYPES: [string, string][] = [
  ['fruit', 'ผลไม้'], ['vegetable', 'ผัก'], ['bakery', 'เบเกอรี'], ['menu_item', 'เมนูร้าน'],
  ['craft', 'งานคราฟต์'], ['souvenir', 'ของฝาก'], ['grocery', 'ของชำ'], ['other', 'อื่นๆ'],
];
const UNITS: [string, string][] = [['', '—'], ['kg', 'กก.'], ['piece', 'ชิ้น'], ['bag', 'ถุง'], ['box', 'กล่อง'], ['cup', 'แก้ว'], ['jar', 'กระปุก']];

/** Add/edit product form — `action` is createMerchantProductAction or updateMerchantProductAction.bind(id). */
export function ProductForm({ action, p, submitLabel }: { action: (fd: FormData) => void; p?: any; submitLabel: string }) {
  return (
    <form className="form mform" action={action}>
      <div className="field"><label>ชื่อสินค้า *</label><input name="name_th" required defaultValue={p ? i18n(p.name_i18n) : ''} placeholder="เช่น มะม่วงน้ำดอกไม้สุก" /></div>
      <div className="grid3">
        <div className="field"><label>หมวด</label><select name="subtype" defaultValue={p?.subtype || 'fruit'}>{SUBTYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label>ราคา (บาท)</label><input name="price" type="number" min="0" step="1" defaultValue={p?.price_minor != null ? Math.round(p.price_minor / 100) : ''} placeholder="80" /></div>
        <div className="field"><label>ต่อหน่วย</label><select name="price_unit" defaultValue={p?.price_unit || ''}>{UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      </div>
      <label className="check"><input type="checkbox" name="in_season" defaultChecked={!!p?.in_season} /> สินค้าตามฤดูกาล (แสดงป้าย “ในฤดู”)</label>
      <div className="field"><label>รูปสินค้า (อัปโหลดได้หลายรูป)</label><input type="file" name="photos" accept="image/*" multiple /></div>
      <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 44 }} /></div>
      {p && p.image_urls?.length ? <p className="note">มีรูปอยู่แล้ว {p.image_urls.length} รูป — อัปโหลด/วางลิงก์ใหม่เพื่อแทนที่</p> : null}
      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
