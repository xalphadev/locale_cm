import { i18n } from '@/lib/db';

/** Add/edit feed post form — `action` is createMerchantPostAction or updateMerchantPostAction.bind(id). */
export function PostForm({ action, post, submitLabel }: { action: (fd: FormData) => void; post?: any; submitLabel: string }) {
  return (
    <form className="form mform" action={action}>
      <div className="field"><label>ข้อความ *</label>
        <textarea name="body" required maxLength={500} defaultValue={post ? i18n(post.body_i18n) : ''} style={{ minHeight: 120 }} placeholder="เช่น เมล็ดกาแฟล็อตใหม่มาแล้ว! วันนี้ดริปให้ลองฟรี ☕" /></div>
      <div className="field"><label>รูปภาพ (อัปโหลดได้หลายรูป)</label><input type="file" name="photos" accept="image/*" multiple /></div>
      <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" style={{ minHeight: 44 }} placeholder="https://...jpg" /></div>
      {post && post.image_urls?.length ? <p className="note">มีรูปอยู่แล้ว {post.image_urls.length} รูป — อัปโหลด/วางลิงก์ใหม่เพื่อแทนที่</p> : null}
      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
