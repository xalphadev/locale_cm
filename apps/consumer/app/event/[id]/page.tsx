import Link from 'next/link';
import { q, i18n, cover } from '@/lib/db';
import { Icon, KIND_ICON } from '../../icons';

export const dynamic = 'force-dynamic';

const eLabel = (k: string) => ({ festival: 'เทศกาล', market: 'ตลาด/มาร์เก็ต', performance: 'การแสดง', workshop: 'เวิร์กช็อป', seasonal: 'ตามฤดูกาล' } as any)[k] ?? k;
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmt = (d: number, m: number, hm: string) => `${d} ${THM[m - 1]} ${hm}`;

export default async function EventDetail({ params }: { params: { id: string } }) {
  let e: any = null;
  try {
    [e] = await q<any>(
      `SELECT ev.id, ev.title_i18n, ev.description_i18n, ev.kind, ev.is_recurring, ev.recurrence,
              EXTRACT(DAY FROM ev.starts_at)::int sd, EXTRACT(MONTH FROM ev.starts_at)::int sm, to_char(ev.starts_at,'HH24:MI') sh,
              EXTRACT(DAY FROM ev.ends_at)::int ed, EXTRACT(MONTH FROM ev.ends_at)::int em, to_char(ev.ends_at,'HH24:MI') eh,
              ev.place_id, pl.name_i18n place_name, d.name_i18n district_name
       FROM events ev LEFT JOIN places pl ON pl.id=ev.place_id LEFT JOIN districts d ON d.id=ev.district_id
       WHERE ev.id=$1 AND ev.status='published'`, [params.id]);
  } catch { /* db down */ }

  if (!e) {
    return (<><div className="top"><Link className="back" href="/"><Icon n="back" size={18} /> กลับ</Link><h1>ไม่พบกิจกรรม</h1></div>
      <div className="body"><p className="empty">กิจกรรมนี้อาจจบแล้วหรือยังไม่เผยแพร่</p></div></>);
  }

  return (
    <>
      <div className="detail-hero">
        <img src={cover('event' + e.id, e.kind, 'see', 760, 500)} alt="" />
        <div className="scrim" />
        <Link className="back-fab" href="/"><Icon n="back" size={20} /></Link>
        <div className="dtitle">
          <span className="frost" style={{ marginBottom: 8 }}><Icon n={KIND_ICON[e.kind] || 'sparkles'} size={13} /> {eLabel(e.kind)}{e.is_recurring ? ' · จัดประจำ' : ''}</span>
          <h1>{i18n(e.title_i18n)}</h1>
        </div>
      </div>

      <div className="dbody">
        <div className="info">
          <div className="info-row"><Icon n="calendar" size={18} className="flat-ico" /><span>{fmt(e.sd, e.sm, e.sh)}{e.ed ? ` → ${e.ed === e.sd && e.em === e.sm ? e.eh : fmt(e.ed, e.em, e.eh)}` : ''} น.</span></div>
          {e.is_recurring && <div className="info-row"><Icon n="clock" size={18} className="flat-ico" /><span>จัดเป็นประจำ{e.recurrence ? ` (${e.recurrence})` : ''}</span></div>}
          {e.district_name && <div className="info-row"><Icon n="pin" size={18} className="flat-ico" /><span>{i18n(e.district_name)} · เชียงใหม่</span></div>}
        </div>

        {i18n(e.description_i18n) && <p className="desc">{i18n(e.description_i18n)}</p>}

        {e.place_id && (<>
          <h2>สถานที่จัด</h2>
          <Link className="erow" href={`/place/${e.place_id}`}>
            <div className="ethumb" style={{ background: 'linear-gradient(135deg,#1E8E7E,#0F6E5F)' }}><Icon n="pin" size={24} /></div>
            <div><div className="nm">{i18n(e.place_name)}</div><div className="meta">ดูรายละเอียดสถานที่</div></div>
            <span className="chev"><Icon n="chevR" size={18} /></span>
          </Link>
        </>)}
      </div>
    </>
  );
}
