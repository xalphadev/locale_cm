import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { createMerchantProductAction, setProductFlagAction, deleteProductAction } from '../../actions';

export const dynamic = 'force-dynamic';

const SUBTYPES: [string, string][] = [
  ['fruit', 'ผลไม้'], ['vegetable', 'ผัก'], ['bakery', 'เบเกอรี'], ['menu_item', 'เมนูร้าน'],
  ['craft', 'งานคราฟต์'], ['souvenir', 'ของฝาก'], ['grocery', 'ของชำ'], ['other', 'อื่นๆ'],
];
const subLabel = (k: string) => (SUBTYPES.find(([s]) => s === k) || [, ''])[1];

export default async function Products({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const rows = await q<any>(
    `SELECT id, name_i18n, subtype, price_minor, price_unit, status, sold_out, in_season
       FROM shop_products WHERE place_id=$1 ORDER BY created_at DESC`, [acc.place_id]);
  return (
    <>
      <h1>สินค้าของร้าน</h1>
      {searchParams?.ok && <div className="banner-ok">✓ เพิ่มสินค้าแล้ว — ลูกค้าเห็นได้ทันทีถ้าร้านเผยแพร่อยู่</div>}
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อสินค้า</div>}

      <form className="form pform" action={createMerchantProductAction}>
        <div className="field"><label>ชื่อสินค้า *</label><input name="name_th" required placeholder="เช่น มะม่วงน้ำดอกไม้สุก" /></div>
        <div className="grid3">
          <div className="field"><label>หมวด</label><select name="subtype" defaultValue="fruit">{SUBTYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>ราคา (บาท)</label><input name="price" type="number" min="0" step="1" placeholder="80" /></div>
          <div className="field"><label>ต่อหน่วย</label>
            <select name="price_unit" defaultValue=""><option value="">—</option><option value="kg">กก.</option><option value="piece">ชิ้น</option><option value="bag">ถุง</option><option value="box">กล่อง</option><option value="cup">แก้ว</option><option value="jar">กระปุก</option></select></div>
        </div>
        <label className="check"><input type="checkbox" name="in_season" /> สินค้าตามฤดูกาล (แสดงป้าย “ในฤดู”)</label>
        <div className="field"><label>ลิงก์รูป (ถ้าไม่ใส่ ระบบใช้รูปตัวอย่าง — ทีละบรรทัด)</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 50 }} /></div>
        <button className="btn btn-primary" type="submit">+ เพิ่มสินค้า</button>
      </form>

      <h2>รายการสินค้า ({rows.length})</h2>
      {rows.length === 0 && <p className="note">ยังไม่มีสินค้า — เพิ่มได้จากฟอร์มด้านบน</p>}
      <div className="ptable">
        {rows.map((r) => (
          <div className={`prow ${r.status === 'hidden' ? 'off' : ''}`} key={r.id}>
            <div className="pr-main">
              <b>{i18n(r.name_i18n)}</b>
              <span className="pr-meta">{subLabel(r.subtype)}{r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100)}${r.price_unit ? '/' + r.price_unit : ''}` : ' · สอบถามราคา'}</span>
              <span className="pr-tags">
                {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                {r.sold_out && <span className="t sold">หมด</span>}
                {r.in_season && <span className="t season">ในฤดู</span>}
              </span>
            </div>
            <div className="pr-acts">
              <form action={setProductFlagAction.bind(null, r.id, 'sold_out')}><button className="mini" type="submit">{r.sold_out ? 'มีของแล้ว' : 'ทำเป็นหมด'}</button></form>
              <form action={setProductFlagAction.bind(null, r.id, r.status === 'hidden' ? 'show' : 'hide')}><button className="mini" type="submit">{r.status === 'hidden' ? 'แสดง' : 'ซ่อน'}</button></form>
              <form action={deleteProductAction.bind(null, r.id)}><button className="mini danger" type="submit">ลบ</button></form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
