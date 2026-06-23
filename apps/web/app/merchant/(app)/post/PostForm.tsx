import { i18n } from '@/lib/db';
import { Icon } from '../ui';

/** Add/edit feed post form — `action` is createMerchantPostAction or updateMerchantPostAction.bind(id). */
export function PostForm({ action, post, submitLabel }: { action: (fd: FormData) => void; post?: any; submitLabel: string }) {
  return (
    <form className="form mform" action={action}>
      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="feed" size={15} /></span> ข้อความโพสต์</div>
        <div className="field"><label>ข้อความ <span className="req">*</span></label>
          <textarea name="body" required maxLength={500} defaultValue={post ? i18n(post.body_i18n) : ''} style={{ minHeight: 130 }} placeholder="เช่น เมล็ดกาแฟล็อตใหม่มาแล้ว! วันนี้ดริปให้ลองฟรี ☕" /></div>
        <p className="fhint">บอกข่าวสาร โปรโมชัน หรือเมนูใหม่ของร้าน · สูงสุด 500 ตัวอักษร</p>
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> รูปภาพ</div>
        <div className="field">
          <div className="filewrap"><span className="fw-ic"><Icon n="image" size={18} /></span><input type="file" name="photos" accept="image/*" multiple /></div>
          <p className="fhint">เลือกได้หลายรูป · JPG/PNG/WEBP ไม่เกิน 6MB ต่อรูป{post && post.image_urls?.length ? ` · มีอยู่แล้ว ${post.image_urls.length} รูป (อัปโหลดใหม่เพื่อแทนที่)` : ''}</p>
        </div>
        <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 44 }} /></div>
      </section>

      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
