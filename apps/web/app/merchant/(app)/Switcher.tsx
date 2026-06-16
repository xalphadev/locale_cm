// Brand/branch context switcher (server component, no client JS — a native <details> dropdown).
// One account owns many brands ("ร้าน"), each many branches/accommodations ("สาขา"/"ที่พัก").
// Selecting a branch posts setActiveContextAction (ownership re-checked server-side).
import { q, i18n } from '@/lib/db';
import { setActiveContextAction } from '../actions';

type Row = {
  brand_id: string; brand_name: any; place_id: string; place_name: any;
  place_status: string; offers_stay: boolean; sells_products: boolean;
};

export default async function Switcher({
  accountId, activePlaceId, activeBrandName, activePlaceName,
}: {
  accountId: string; activePlaceId: string | null; activeBrandName: string; activePlaceName: string;
}) {
  const rows = await q<Row>(
    `SELECT b.id brand_id, b.name_i18n brand_name, p.id place_id, p.name_i18n place_name,
            p.status::text place_status, p.offers_stay, p.sells_products
       FROM brands b JOIN places p ON p.brand_id = b.id
      WHERE b.owner_account_id = $1 AND b.status = 'active'
      ORDER BY b.created_at, p.created_at`, [accountId]);

  // group branches under their brand, preserving query order
  const brands: { id: string; name: string; branches: Row[] }[] = [];
  const at = new Map<string, number>();
  for (const r of rows) {
    if (!at.has(r.brand_id)) { at.set(r.brand_id, brands.length); brands.push({ id: r.brand_id, name: i18n(r.brand_name), branches: [] }); }
    brands[at.get(r.brand_id)!].branches.push(r);
  }
  const multiBrand = brands.length > 1;
  const showBranchLine = (multiBrand || rows.length > 1) && activePlaceName && activePlaceName !== activeBrandName;

  return (
    <details className="mswitch">
      <summary className="mswitch-cur" title="สลับร้าน / สาขา">
        <span className="mswitch-names">
          <b>{activeBrandName || activePlaceName || 'ร้านของฉัน'}</b>
          {showBranchLine ? <i>{activePlaceName}</i> : null}
        </span>
        <svg className="mswitch-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="mswitch-pop">
        {brands.map((br) => (
          <div className="mswitch-grp" key={br.id}>
            <div className="mswitch-bh">
              <span className="mswitch-bav">{(br.name || 'ร').trim().charAt(0)}</span>
              <span className="mswitch-bhn">{br.name}</span>
              <a className="mswitch-addbr" href={`/merchant/shops/${br.id}/new`}>+ สาขา</a>
            </div>
            {br.branches.map((b) => {
              const on = b.place_id === activePlaceId;
              const live = b.place_status === 'published';
              const kind = b.offers_stay ? 'ที่พัก' : b.sells_products ? 'ร้านขายของ' : 'ร้าน';
              return (
                <form action={setActiveContextAction.bind(null, b.place_id)} key={b.place_id}>
                  <button type="submit" className={`mswitch-b ${on ? 'on' : ''}`}>
                    <span className="mswitch-bn">{i18n(b.place_name)}</span>
                    <span className="mswitch-bt">{kind} · {live ? 'เผยแพร่' : 'รอตรวจ'}</span>
                    {on ? <span className="mswitch-ok" aria-hidden>✓</span> : null}
                  </button>
                </form>
              );
            })}
          </div>
        ))}
        <div className="mswitch-foot">
          <a className="mswitch-add" href="/merchant/shops/new">+ เพิ่มร้านใหม่</a>
          <a className="mswitch-mng" href="/merchant/shops">จัดการทั้งหมด</a>
        </div>
      </div>
    </details>
  );
}
