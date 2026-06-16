import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setActiveContextAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Portfolio view: every brand ("ร้าน") this account owns + its branches/accommodations ("สาขา"/"ที่พัก").
export default async function ShopsPage() {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const rows = await q<any>(
    `SELECT b.id brand_id, b.name_i18n brand_name,
            p.id place_id, p.name_i18n place_name, p.status::text place_status,
            p.offers_stay, p.sells_products,
            (SELECT count(*) FROM shop_products sp WHERE sp.place_id=p.id AND sp.status='published') nprod,
            (SELECT count(*) FROM stay_units    su WHERE su.place_id=p.id AND su.status='published') nroom,
            (SELECT count(*) FROM feed_posts    fp WHERE fp.place_id=p.id AND fp.status='published') npost
       FROM brands b LEFT JOIN places p ON p.brand_id = b.id
      WHERE b.owner_account_id = $1 AND b.status = 'active'
      ORDER BY b.created_at, p.created_at`, [acc.id]);

  const brands: { id: string; name: string; branches: any[] }[] = [];
  const at = new Map<string, number>();
  for (const r of rows) {
    if (!at.has(r.brand_id)) { at.set(r.brand_id, brands.length); brands.push({ id: r.brand_id, name: i18n(r.brand_name), branches: [] }); }
    if (r.place_id) brands[at.get(r.brand_id)!].branches.push(r);
  }

  return (
    <>
      <h1 className="phead"><span className="phead-ic"><Icon n="store" size={18} /></span> ร้านของฉัน</h1>
      <p className="note">บัญชีเดียวดูแลได้หลายร้าน แต่ละร้านมีได้หลายสาขา/ที่พัก — เลือก “เปิดจัดการ” เพื่อสลับไปแก้ร้านนั้น</p>
      <a className="btn btn-primary" href="/merchant/shops/new" style={{ marginBottom: 14 }}><Icon n="plus" size={17} /> เพิ่มร้านใหม่</a>

      {brands.map((br) => (
        <section className="shopcard" key={br.id}>
          <div className="shopcard-h">
            <div className="shopcard-t"><Icon n="store" size={15} /> {br.name}</div>
            <a className="shopcard-add" href={`/merchant/shops/${br.id}/new`}><Icon n="plus" size={14} /> สาขา</a>
          </div>
          {br.branches.length === 0 && <p className="shopcard-empty">ยังไม่มีสาขา</p>}
          {br.branches.map((b) => {
            const on = b.place_id === acc.place_id;
            const live = b.place_status === 'published';
            const kind = b.offers_stay ? 'ที่พัก' : b.sells_products ? 'ร้านขายของ' : 'ร้านทั่วไป';
            return (
              <div className={`branch ${on ? 'on' : ''}`} key={b.place_id}>
                <div className="branch-l">
                  <div className="branch-n">{i18n(b.place_name)} {on && <span className="branch-cur">กำลังจัดการ</span>}</div>
                  <div className="branch-m">
                    <span className={`branch-st ${live ? 'on' : ''}`}>{live ? '● เผยแพร่' : '○ รอตรวจ'}</span>
                    <span>· {kind}</span>
                    {b.sells_products ? <span>· {b.nprod} สินค้า</span> : null}
                    {b.offers_stay ? <span>· {b.nroom} ห้อง</span> : null}
                    <span>· {b.npost} โพสต์</span>
                  </div>
                </div>
                {on ? (
                  <a className="btn sm" href="/merchant"><Icon n="edit" size={14} /> จัดการ</a>
                ) : (
                  <form action={setActiveContextAction.bind(null, b.place_id)}>
                    <button className="btn sm" type="submit">เปิดจัดการ →</button>
                  </form>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
