import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { ConfirmSubmit } from '../ConfirmSubmit';
import { setDealStatusAction } from '../../actions';

export const dynamic = 'force-dynamic';

const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
const ST_TH: Record<string, string> = { active: 'กำลังใช้งาน', paused: 'พักไว้', scheduled: 'ตั้งเวลา', expired: 'จบแล้ว' };
const fmtEnds = (e: any) => (e ? new Date(e).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : null);

export default async function Deals({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');

  if (!acc.verified) {
    return (
      <>
        <h1 className="phead"><span className="phead-ic"><Icon n="lock" size={17} /></span> ดีล / โปรโมชั่น</h1>
        <div className="banner-err">ฟีเจอร์นี้ล็อกอยู่ — ต้องยืนยันความเป็นเจ้าของร้านก่อน</div>
        <Link className="bigcta" href="/merchant/verify?need=deals" style={{ marginTop: 12 }}><Icon n="lock" size={18} /> ยืนยันความเป็นเจ้าของร้าน</Link>
      </>
    );
  }

  const deals = await q<any>(
    `SELECT id, title_i18n, terms_i18n, deal_type::text deal_type, value_pct, value_minor, status::text status,
            ends_at, quota_total, quota_used
       FROM deals WHERE place_id=$1 ORDER BY (status='active') DESC, ends_at DESC NULLS LAST, created_at DESC`,
    [acc.place_id]);

  return (
    <>
      <div className="listhead"><h1>ดีล / โปรโมชั่น</h1>
        <Link className="addbtn" href="/merchant/deals/new"><Icon n="plus" size={15} /> ดีล</Link>
      </div>
      {searchParams?.ok === 'created' && <div className="banner-ok">✓ สร้างดีลแล้ว — ลูกค้าเห็นในแอปทันที</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ อัปเดตสถานะดีลแล้ว</div>}
      <p className="note" style={{ margin: '.1rem 0 .8rem' }}>ดีลจะโชว์บนหน้าร้านและแถบ “ดีลเด็ดใกล้คุณ” ในแอปลูกค้า (ใช้สิทธิ์/แลกที่หน้าร้านโดยตรง)</p>

      {deals.length === 0 ? (
        <p className="empty">ยังไม่มีดีล — กด “+ ดีล” เพื่อสร้างโปรโมชั่นแรก</p>
      ) : (
        <div className="mlist">
          {deals.map((d) => {
            const left = d.quota_total ? d.quota_total - d.quota_used : null;
            const ends = fmtEnds(d.ends_at);
            const live = d.status === 'active';
            return (
              <div className="mrow" key={d.id}>
                <span className="mrow-img"><span className="ph"><Icon n="tag" size={22} /></span></span>
                <div className="mrow-body">
                  <div className="mrow-nm">{dealLabel(d.deal_type, d.value_pct, d.value_minor)} · {i18n(d.title_i18n)}</div>
                  <div className="mrow-meta">
                    <span className={`pill ${live ? 'ok' : ''}`}>{ST_TH[d.status] || d.status}</span>
                    {ends && <> · ถึง {ends}</>}
                    {left != null && <> · เหลือ {left} สิทธิ์</>}
                    {d.quota_used > 0 && <> · ใช้ไป {d.quota_used}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {d.status !== 'expired' && (
                    <form action={setDealStatusAction.bind(null, d.id, live ? 'paused' : 'active')}>
                      <button className="dbtn sm" type="submit">{live ? 'พัก' : 'เปิด'}</button>
                    </form>
                  )}
                  <form action={setDealStatusAction.bind(null, d.id, 'expired')}>
                    <ConfirmSubmit message="จบดีลนี้ถาวร? ลูกค้าจะใช้ดีลนี้ไม่ได้อีก และเปิดกลับไม่ได้" className="dbtn danger sm" aria-label="จบดีล"><Icon n="trash" size={15} /></ConfirmSubmit>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
