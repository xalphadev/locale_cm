import { Icon } from '../ui';
import { createMerchantPostAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default function Post({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  return (
    <>
      <h1 className="phead"><span className="phead-ic"><Icon n="feed" size={18} /></span> โพสต์ลงฟีด</h1>
      <p className="note">โพสต์ข่าวสาร/โปรของร้านลงฟีดลูกค้า — กดถูกใจและคอมเมนต์ได้ทันที</p>
      {searchParams?.ok && <div className="banner-ok">✓ โพสต์แล้ว — ไปดูในแอปลูกค้าแท็บ “อัปเดต”</div>}
      {searchParams?.error === 'body' && <div className="banner-err">กรุณาพิมพ์ข้อความโพสต์</div>}
      <form className="form" action={createMerchantPostAction}>
        <div className="field"><label>ข้อความ *</label>
          <textarea name="body" required style={{ minHeight: 90 }} placeholder="เช่น เมล็ดกาแฟล็อตใหม่มาแล้ว! วันนี้ดริปให้ลองฟรี" /></div>
        <div className="grid2">
          <div className="field"><label>จำนวนรูป (ไม่ใส่ลิงก์ = ใช้รูปตัวอย่าง)</label>
            <select name="image_count" defaultValue="1"><option>1</option><option>2</option><option>3</option><option>4</option></select></div>
        </div>
        <div className="field"><label>อัปโหลดรูป (เลือกได้หลายรูป)</label><input type="file" name="photos" accept="image/*" multiple /></div>
        <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" style={{ minHeight: 44 }} placeholder="https://...jpg" /></div>
        <button className="btn btn-primary" type="submit">โพสต์เลย →</button>
      </form>
    </>
  );
}
