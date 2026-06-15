import { q, i18n } from '@/lib/db';
import { createPostAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function PostComposer({ searchParams }: { searchParams: { posted?: string } }) {
  let places: any[] = [];
  try {
    places = await q<any>(`SELECT id, name_i18n FROM places WHERE status='published' ORDER BY name_i18n->>'th' LIMIT 100`);
  } catch { /* db down */ }

  return (
    <>
      <h1>โพสต์ลงฟีด <span className="note">(ร้านค้า)</span></h1>
      <p className="note">โพสต์รูป/ข่าวสารของร้านลงฟีดลูกค้าแบบเร็วๆ — ลูกค้าเห็น กดถูกใจ คอมเมนต์ได้ทันที (MVP: เผยแพร่เลย; โปรดักชันผ่านการกลั่นกรองรูป)</p>
      {searchParams?.posted && <div className="banner-ok">✓ โพสต์แล้ว — ไปดูในแอปลูกค้าแท็บ “อัปเดต” (http://127.0.0.1:3003/feed)</div>}

      <form className="form" action={createPostAction}>
        <div className="field"><label>ร้าน *</label>
          <select name="placeId" required defaultValue="">
            <option value="" disabled>— เลือกร้าน —</option>
            {places.map((p) => <option key={p.id} value={p.id}>{i18n(p.name_i18n)}</option>)}
          </select>
        </div>
        <div className="field"><label>ข้อความโพสต์ *</label>
          <textarea name="body" required placeholder="เช่น เมล็ดกาแฟใหม่มาแล้ว! วันนี้ดริปให้ลองฟรี ☕" style={{ minHeight: 90 }} /></div>
        <div className="grid2">
          <div className="field"><label>จำนวนรูป (ใช้รูปตัวอย่างถ้าไม่ใส่ลิงก์)</label>
            <select name="image_count" defaultValue="3"><option>1</option><option>2</option><option>3</option><option>4</option></select></div>
        </div>
        <div className="field"><label>ลิงก์รูป (ถ้ามี — ทีละบรรทัด/คั่นด้วย ,)</label>
          <textarea name="image_urls" placeholder="https://...jpg&#10;https://...jpg" style={{ minHeight: 60 }} /></div>
        <button className="btn btn-primary" type="submit">โพสต์เลย →</button>
      </form>
    </>
  );
}
