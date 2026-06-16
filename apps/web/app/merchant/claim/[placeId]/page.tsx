import { q, i18n } from '@/lib/db';
import { claimPlaceAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function ClaimForm({
  params, searchParams,
}: { params: { placeId: string }; searchParams: { error?: string } }) {
  const [pl] = await q<any>(
    `SELECT id, name_i18n, subcategory, category::text category FROM places WHERE id=$1 AND brand_id IS NULL`, [params.placeId]);

  return (
    <div className="portal-auth">
      <div className="pa-brand">Soi Hop · ร้านค้า</div>
      {!pl ? (
        <>
          <h1>เคลมไม่ได้</h1>
          <p className="note">ร้านนี้ถูกเคลมไปแล้ว หรือไม่พบ</p>
          <p className="note"><a href="/merchant/claim">← ค้นหาร้านอื่น</a></p>
        </>
      ) : (
        <>
          <h1>เคลม “{i18n(pl.name_i18n)}”</h1>
          <p className="note">สร้างบัญชีเพื่อดูแลร้านนี้ — หลังเคลมจะลงสินค้า โพสต์ และเปิดแต้มสะสมได้ทันที</p>
          {searchParams?.error && <div className="banner-err">{searchParams.error}</div>}
          <form className="form" action={claimPlaceAction}>
            <input type="hidden" name="place_id" value={pl.id} />
            <div className="field"><label>อีเมล *</label><input name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label>รหัสผ่าน * (อย่างน้อย 8 ตัวอักษร)</label><input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
            <button className="btn btn-primary mform-save" type="submit">เคลมร้านนี้ →</button>
          </form>
          <p className="note">ไม่ใช่ร้านของคุณ? <a href="/merchant/claim">ค้นหาใหม่</a></p>
        </>
      )}
    </div>
  );
}
