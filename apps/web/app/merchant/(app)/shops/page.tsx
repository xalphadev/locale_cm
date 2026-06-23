import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setActiveContextAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Portfolio: every brand ("ร้าน") this account owns + its branches/accommodations ("สาขา"/"ที่พัก").
export default async function ShopsPage() {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const rows = await q<any>(
    `SELECT b.id brand_id, b.name_i18n brand_name, b.logo_url,
            p.id place_id, p.name_i18n place_name, p.status::text place_status,
            p.offers_stay, p.sells_products,
            (SELECT count(*) FROM shop_products sp WHERE sp.place_id=p.id AND sp.status='published' AND sp.deleted_at IS NULL) nprod,
            (SELECT count(*) FROM stay_units    su WHERE su.place_id=p.id AND su.status='published' AND su.deleted_at IS NULL) nroom,
            (SELECT count(*) FROM feed_posts    fp WHERE fp.place_id=p.id AND fp.status='published' AND fp.deleted_at IS NULL) npost
       FROM brands b LEFT JOIN places p ON p.brand_id = b.id
      WHERE b.owner_account_id = $1 AND b.status = 'active' AND b.deleted_at IS NULL
      ORDER BY b.created_at, p.created_at`, [acc.id]);

  const brands: { id: string; name: string; logo: string | null; branches: any[] }[] = [];
  const at = new Map<string, number>();
  for (const r of rows) {
    if (!at.has(r.brand_id)) { at.set(r.brand_id, brands.length); brands.push({ id: r.brand_id, name: i18n(r.brand_name), logo: r.logo_url, branches: [] }); }
    if (r.place_id) brands[at.get(r.brand_id)!].branches.push(r);
  }

  return (
    <>
      <div className="listhead">
        <h1>ร้านของฉัน</h1>
        <Link className="addbtn" href="/merchant/shops/new"><Icon n="plus" size={15} /> เพิ่มร้าน</Link>
      </div>
      <p className="note" style={{ margin: '-.3rem 0 .9rem' }}>บัญชีเดียวดูแลได้หลายร้าน แต่ละร้านมีหลายสาขา/ที่พักได้ — แตะสาขาเพื่อสลับไปจัดการ</p>

      {brands.map((br) => (
        <section className="bcard" key={br.id}>
          <div className="bcard-h">
            <span className="bcard-av">{br.logo ? <img src={br.logo} alt="" /> : (br.name || 'ร').trim().charAt(0)}</span>
            <div className="bcard-tx">
              <div className="bcard-nm">{br.name}</div>
              <div className="bcard-sub">{br.branches.length ? `${br.branches.length} สาขา` : 'ยังไม่มีสาขา'}</div>
            </div>
            <Link className="bcard-edit" href={`/merchant/shops/${br.id}/edit`} aria-label="แก้ไขข้อมูลร้าน"><Icon n="edit" size={15} /></Link>
            <Link className="bcard-add" href={`/merchant/shops/${br.id}/new`} aria-label="เพิ่มสาขา"><Icon n="plus" size={16} /></Link>
          </div>

          <div className="bcard-branches">
            {br.branches.map((b) => {
              const on = b.place_id === acc.place_id;
              const live = b.place_status === 'published';
              const kind = b.offers_stay ? 'ที่พัก' : b.sells_products ? 'ร้านขายของ' : 'ร้านทั่วไป';
              const icon = b.offers_stay ? 'bed' : b.sells_products ? 'tag' : 'store';
              const counts = [
                b.sells_products ? `${b.nprod} สินค้า` : null,
                b.offers_stay ? `${b.nroom} ห้อง` : null,
                `${b.npost} โพสต์`,
              ].filter(Boolean).join(' · ');
              const inner = (
                <>
                  <span className="brow-ic"><Icon n={icon} size={18} /></span>
                  <span className="brow-tx">
                    <span className="brow-nm">{i18n(b.place_name)}{on && <span className="brow-cur">กำลังจัดการ</span>}</span>
                    <span className="brow-meta">
                      <span className={`t ${live ? 'season' : 'off'}`}>{live ? 'เผยแพร่' : 'รอตรวจ'}</span>
                      <span className="brow-sub">{kind} · {counts}</span>
                    </span>
                  </span>
                  <Icon n="chevR" className="brow-go" size={18} />
                </>
              );
              return on ? (
                <Link className="brow on" href="/merchant" key={b.place_id}>{inner}</Link>
              ) : (
                <form action={setActiveContextAction.bind(null, b.place_id)} key={b.place_id}>
                  <button className="brow" type="submit">{inner}</button>
                </form>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
