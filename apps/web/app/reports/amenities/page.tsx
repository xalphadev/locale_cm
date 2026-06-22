import { q, i18n } from '@/lib/db';
import { addAmenityAction, toggleAmenityAction } from '../../actions';
import { PageHead, H2 } from '../../adm-ui';

export const dynamic = 'force-dynamic';

const GRP_TH: Record<string, string> = { amenity: 'สิ่งอำนวยความสะดวกในห้อง', building: 'ส่วนกลาง / อาคาร', bills: 'ค่าใช้จ่ายที่รวมในค่าเช่า' };

// Admin-managed amenity catalog (stay_amenity, 0044). Adding/editing here flows to the merchant room form,
// the consumer /stay filter, and both detail pages — no deploy. Hidden (inactive) keys stop being offered but
// still render on listings that already selected them.
export default async function AmenitiesAdmin({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  let rows: any[] = []; let err: string | null = null;
  try {
    rows = await q<any>(`SELECT grp, key, label_i18n, sort, active FROM stay_amenity ORDER BY grp, sort, key`);
  } catch (e: any) { err = String(e?.message ?? e); }
  const groups: ('amenity' | 'building' | 'bills')[] = ['amenity', 'building', 'bills'];

  return (
    <>
      <PageHead icon="grid" title="สิ่งอำนวยความสะดวก (catalog)" count={rows.filter((r) => r.active).length}
        sub="ลิสต์กลางที่ร้านเลือก + ลูกค้าใช้กรอง — เพิ่ม/แก้ที่นี่ ไม่ต้อง deploy · คีย์ที่ปิดจะไม่ถูกเสนอ แต่รายการเดิมยังแสดง" />
      {searchParams?.ok && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      {searchParams?.err && <div className="banner-err">กรอกไม่ครบ — ต้องมีกลุ่ม / คีย์ (a–z,0–9,_) / ชื่อไทย</div>}
      {err && <p className="note">DB error: {err}</p>}

      <H2 icon="plus">เพิ่ม / แก้ไข</H2>
      <form action={addAmenityAction} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', margin: '0 0 1.4rem' }}>
        <label style={{ fontSize: '.8rem' }}>กลุ่ม<br />
          <select name="grp" required defaultValue="amenity">
            {groups.map((g) => <option key={g} value={g}>{GRP_TH[g]}</option>)}
          </select></label>
        <label style={{ fontSize: '.8rem' }}>คีย์ (a–z,0–9,_)<br /><input name="key" required placeholder="tv" pattern="[a-z0-9_]+" /></label>
        <label style={{ fontSize: '.8rem' }}>ชื่อ (ไทย)<br /><input name="label" required placeholder="ทีวี" /></label>
        <label style={{ fontSize: '.8rem' }}>ลำดับ<br /><input name="sort" type="number" defaultValue={100} style={{ width: 80 }} /></label>
        <button className="btn btn-primary" type="submit">บันทึก</button>
      </form>
      <p className="note" style={{ marginTop: '-1rem' }}>ใส่คีย์เดิมซ้ำ = แก้ชื่อ/ลำดับ และเปิดใช้งานกลับ</p>

      {groups.map((g) => {
        const list = rows.filter((r) => r.grp === g);
        return (
          <div key={g}>
            <H2 icon="tag">{GRP_TH[g]} ({list.filter((r) => r.active).length})</H2>
            {list.length === 0 ? <p className="note">ยังไม่มี</p> : (
              <table>
                <thead><tr><th>คีย์</th><th>ชื่อ</th><th>ลำดับ</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.key} style={{ opacity: r.active ? 1 : 0.5 }}>
                      <td><code>{r.key}</code></td>
                      <td>{i18n(r.label_i18n)}</td>
                      <td>{r.sort}</td>
                      <td>{r.active ? '✓ ใช้งาน' : '— ปิด'}</td>
                      <td>
                        <form action={toggleAmenityAction.bind(null, r.grp, r.key)}>
                          <button className="btn" type="submit">{r.active ? 'ปิด' : 'เปิด'}</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </>
  );
}
