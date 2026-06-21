import { Icon } from '../../icons';
import { q, i18n, demoUserId } from '@/lib/db';
import { STAY_KIND_TH } from '@/lib/facets';
import { withdrawBookingRequestAction } from '../../actions';

export const dynamic = 'force-dynamic';

const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmt = (d: any) => { if (!d) return ''; const [y, m, da] = String(d).slice(0, 10).split('-'); return `${Number(da)} ${TH[Number(m) - 1]}`; };

const KIND_TH: Record<string, string> = { viewing: 'ขอเข้าชมห้อง', booking: 'ขอจอง/กันห้อง', enquiry: 'สอบถามข้อมูล' };

// Renter-side view of the contact-leads they submitted (closes the lead loop — no money, just status + follow-up).
export default async function MyStayRequests({ searchParams }: { searchParams: { cancelled?: string } }) {
  const uid = await demoUserId();
  const rows = uid ? await q<any>(
    `SELECT r.id, r.request_kind, r.rental_mode, r.desired_from, r.desired_to, r.desired_months,
            r.status, r.created_at, r.expires_at, r.converted_block_id,
            p.id place_id, p.name_i18n place_name, p.stay_kind, p.phone, p.line_id,
            su.id unit_id, su.name_i18n unit_name
       FROM stay_booking_request r
       JOIN places p ON p.id = r.place_id
       LEFT JOIN stay_units su ON su.id = r.stay_unit_id AND su.deleted_at IS NULL
      WHERE r.requester_user_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC LIMIT 50`, [uid]) : [];

  const now = Date.now();
  const statusOf = (r: any) => {
    const expired = r.status !== 'converted' && r.expires_at && Date.parse(r.expires_at) < now;
    if (r.status === 'converted') return { label: 'ยืนยันการเข้าพักแล้ว', cls: 'ok', ic: 'check' };
    if (r.status === 'declined') return { label: 'ที่พักไม่สะดวกรับ', cls: 'muted', ic: 'x' };
    if (expired) return { label: 'หมดอายุแล้ว', cls: 'muted', ic: 'clock' };
    if (r.status === 'contacted') return { label: 'ที่พักติดต่อกลับแล้ว', cls: 'ok', ic: 'phone' };
    return { label: 'ส่งแล้ว · รอที่พักติดต่อกลับ', cls: 'pending', ic: 'clock' };
  };

  return (
    <div className="staybg">
      <div className="staytop">
        <a className="back" href="/stay"><Icon n="back" size={18} /> ที่พัก</a>
      </div>
      <h1 style={{ padding: '0 16px', margin: '6px 0 2px', fontSize: '1.5rem' }}>คำขอที่พักของฉัน</h1>
      <p className="shopnote" style={{ margin: '2px 16px 12px' }}><Icon n="chat" size={13} /> คำขอติดต่อที่คุณส่งให้ที่พัก — ไม่ใช่การจอง/ชำระเงิน ที่พักจะติดต่อกลับโดยตรง</p>

      {searchParams?.cancelled && <div className="booksent" style={{ margin: '0 16px 12px' }}><Icon n="check" size={16} /> ถอนคำขอแล้ว</div>}

      {rows.length === 0 ? (
        <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <p>ยังไม่มีคำขอที่พัก</p>
          <a className="staymaplink" href="/stay" style={{ marginTop: 10 }}><Icon n="bed" size={16} /> ค้นหาที่พัก</a>
        </div>
      ) : (
        <div className="reqlist">
          {rows.map((r) => {
            const st = statusOf(r);
            const href = r.unit_id ? `/stay/${r.unit_id}` : `/place/${r.place_id}`;
            const dates = r.rental_mode === 'monthly'
              ? `${r.desired_months ? `${r.desired_months} เดือน` : 'รายเดือน'}${r.desired_from ? ` · เข้าพัก ${fmt(r.desired_from)}` : ''}`
              : (r.desired_from && r.desired_to ? `${fmt(r.desired_from)} – ${fmt(r.desired_to)}` : 'รายวัน');
            const canWithdraw = st.cls !== 'ok' && st.label !== 'หมดอายุแล้ว' && r.status !== 'converted';
            return (
              <div className="reqcard" key={r.id}>
                <a className="reqcard-h" href={href}>
                  <span className="reqkind-ic"><Icon n="bed" size={16} /></span>
                  <span className="reqcard-tx">
                    <b>{i18n(r.place_name)}</b>
                    <span>{STAY_KIND_TH[r.stay_kind] || 'ที่พัก'}{r.unit_name ? ` · ${i18n(r.unit_name)}` : ''}</span>
                  </span>
                  <Icon n="chevR" size={16} className="reqcard-go" />
                </a>
                <div className="reqmeta">{KIND_TH[r.request_kind] || 'สอบถามข้อมูล'} · {dates}</div>
                <div className={`reqbadge ${st.cls}`}><Icon n={st.ic} size={13} /> {st.label}</div>
                <div className="reqfoot">
                  <span className="muted">ส่งเมื่อ {fmt(r.created_at)}</span>
                  <span className="reqfoot-act">
                    {r.phone && <a href={`tel:${r.phone}`} className="reqlink"><Icon n="phone" size={13} /> โทร</a>}
                    {r.line_id && <span className="reqlink muted">LINE: {r.line_id}</span>}
                    {canWithdraw && (
                      <form action={withdrawBookingRequestAction.bind(null, r.id)}>
                        <button type="submit" className="reqwithdraw">ถอนคำขอ</button>
                      </form>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
