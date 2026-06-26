import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { ConfirmSubmit } from '../../ConfirmSubmit';
import { setLeadStatusAction, scheduleLeadAction, markNoShowAction, deleteLeadAction, convertLeadToBlockAction, convertMonthlyLeadAction, cancelBookingAction, checkInAction, checkOutAction, verifySlipAction, rejectSlipAction, markRefundedAction, collectBalanceAction } from '../../../actions';

const PAY_TH: Record<string, string> = { submitted: 'รอตรวจสลิป', verified: 'ชำระแล้ว', rejected: 'สลิปไม่ผ่าน', refunded: 'คืนเงินแล้ว' };

export const dynamic = 'force-dynamic';

const KIND_TH: Record<string, string> = { viewing: 'นัดดูห้อง', booking: 'ขอจอง', enquiry: 'สอบถาม' };
const CH_TH: Record<string, string> = { app: 'ในแอป', walk_in: 'Walk-in', phone: 'โทร', line: 'ไลน์' };
const ST: Record<string, { cls: string; label: string }> = {
  new: { cls: 'season', label: 'ใหม่' },
  contacted: { cls: 'cat', label: 'ติดต่อแล้ว' },
  scheduled: { cls: 'cat', label: 'นัดแล้ว' },
  confirmed: { cls: 'cat', label: 'ตกลงแล้ว · ยังไม่กันห้อง' },
  declined: { cls: 'off', label: 'ปฏิเสธ' },
  expired: { cls: 'off', label: 'หมดอายุ' },
  converted: { cls: 'sold', label: 'จองในปฏิทินแล้ว' },
  no_show: { cls: 'off', label: 'ไม่มาเข้าพัก' },
  cancelled: { cls: 'off', label: 'ยกเลิกแล้ว' },
};
const EV_TH: Record<string, string> = {
  move_in: 'ย้ายเข้า', move_out: 'ย้ายออก', check_in: 'เช็คอิน', check_out: 'เช็คเอาท์',
  block: 'กันห้อง', unblock: 'ปลดห้อง', status_change: 'เปลี่ยนสถานะ', maintenance_open: 'ปิดซ่อม', maintenance_close: 'เปิดใช้',
};
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
const fmtDT = (d: any) => (d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const lineHref = (id: string) => `https://line.me/R/ti/p/~${String(id).trim().replace(/^@/, '')}`;

function Fact({ ic, l, v }: { ic: string; l: string; v: string }) {
  return (
    <div className="factitem">
      <span className="factitem-ic"><Icon n={ic} size={17} /></span>
      <div className="factitem-tx"><div className="factitem-l">{l}</div><div className="factitem-v">{v}</div></div>
    </div>
  );
}

export default async function BookingDetail({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay && !acc.manages_stay) redirect('/merchant');

  const [b] = isUuid(params.id) ? await q<any>(
    `SELECT b.id, b.stay_unit_id, b.request_kind, b.rental_mode, b.desired_months, b.channel, b.party_size,
            COALESCE(bk.start_date, b.desired_from) AS from_d,
            COALESCE(bk.end_date, b.desired_to) AS to_d,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_name END contact_name,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_phone END contact_phone,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_line END contact_line,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.message END message,
            (b.expires_at < now() AND b.status <> 'converted') expired_pii,
            b.status, b.scheduled_at, b.created_at, b.converted_block_id, b.checked_in_at, b.checked_out_at,
            b.ref, b.payment_status, b.amount_minor, b.deposit_minor, b.paid_minor, b.payment_method, b.slip_url, b.refunded_at, b.refunded_minor,
            su.name_i18n unit_name, su.managed, r.code AS room_code, bk.note AS block_note
       FROM stay_booking_request b
       LEFT JOIN stay_units su ON su.id = b.stay_unit_id
       LEFT JOIN stay_occupancy_block bk ON bk.id = b.converted_block_id AND bk.deleted_at IS NULL
       LEFT JOIN stay_room r ON r.id = COALESCE(bk.room_id, b.room_id)
      WHERE b.id = $1 AND b.place_id = $2 AND b.deleted_at IS NULL`, [params.id, acc.place_id]) : [];

  if (!b) return (<MTopbar back="/merchant/bookings" backLabel="การจอง" title="ไม่พบการจอง" />);

  // booking timeline — append-only room events for the linked block (0033)
  const events = b.converted_block_id ? await q<any>(
    `SELECT event_kind, effective_at FROM stay_room_event WHERE block_id = $1 ORDER BY effective_at DESC LIMIT 20`, [b.converted_block_id]) : [];

  const st = ST[b.status] || ST.new;
  const canConvertDaily = b.managed && b.rental_mode === 'daily' && b.from_d && b.to_d && b.status !== 'converted' && b.status !== 'declined';
  const canConvertMonthly = b.rental_mode === 'monthly' && b.stay_unit_id && b.status !== 'converted' && b.status !== 'declined';
  // group the จัดการ buttons by lifecycle stage: a lead's request actions vs a booking's stay actions
  const reqActs = b.status !== 'converted' && b.status !== 'declined';   // contact/schedule/confirm/convert/decline
  const stayActs = b.status === 'converted' && !b.checked_out_at;        // check-in/out/no-show/cancel (none left once checked out)

  return (
    <>
      <MTopbar back="/merchant/bookings" backLabel="การจอง" title={b.contact_name || 'การจอง'} />

      <div className="bk-detail">
        {searchParams?.ok === 'verified' && <div className="banner-ok">✓ ยืนยันการชำระแล้ว — กันห้องในปฏิทินเรียบร้อย</div>}
        {searchParams?.ok === 'rejected' && <div className="banner-ok">บันทึกว่าสลิปไม่ผ่านแล้ว</div>}
        {searchParams?.ok === 'collected' && <div className="banner-ok">✓ บันทึกรับเงินที่เหลือแล้ว</div>}
        {searchParams?.error === 'full' && <div className="banner-err">ห้องเต็มในช่วงวันนี้แล้ว — ติดต่อลูกค้าเพื่อเปลี่ยนวัน/คืนเงิน (กดสลิปไม่ผ่าน)</div>}
        <div className="bk-head">
          <span className={`t ${st.cls}`}>{st.label}</span>
          {b.checked_out_at ? <span className="t off">เช็คเอาท์แล้ว</span> : b.checked_in_at ? <span className="t season">กำลังเข้าพัก</span> : null}
          {b.status === 'confirmed' && <span className="note" style={{ margin: 0 }}>ตกลงด้วยวาจา — ห้องยังไม่ถูกกัน กด “ยืนยันการจอง” เพื่อกันห้องจริงในปฏิทิน</span>}
        </div>

        <h2 className="rsec"><span className="rsec-ic"><Icon n="chat" size={15} /></span> ผู้จอง</h2>
        <div className="factgrid">
          <Fact ic="chat" l="ชื่อ" v={b.contact_name || 'ผู้สนใจ'} />
          {b.party_size ? <Fact ic="users" l="จำนวนคน" v={String(b.party_size)} /> : null}
          <Fact ic="phone" l="ช่องทาง" v={CH_TH[b.channel] || b.channel || 'ในแอป'} />
        </div>
        {b.expired_pii && <p className="note">ข้อมูลติดต่อถูกลบอัตโนมัติตามนโยบายความเป็นส่วนตัว (เกิน 60 วัน)</p>}
        <div className="lead-contact">
          {b.contact_phone && <a className="dbtn sm" href={`tel:${b.contact_phone}`}><Icon n="chat" size={14} /> โทร {b.contact_phone}</a>}
          {b.contact_line && <a className="dbtn sm" href={lineHref(b.contact_line)} target="_blank" rel="noopener"><Icon n="chat" size={14} /> ไลน์ {b.contact_line}</a>}
        </div>
        {b.message && <div className="lead-msg">“{b.message}”</div>}

        <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span> รายละเอียดการจอง</h2>
        <div className="factgrid">
          <Fact ic="tag" l="ประเภทคำขอ" v={KIND_TH[b.request_kind] || 'สอบถาม'} />
          {b.unit_name ? <Fact ic="store" l="ที่พัก" v={i18n(b.unit_name)} /> : null}
          {b.room_code ? <Fact ic="bed" l="ห้อง" v={b.room_code} /> : null}
          <Fact ic="calendar" l={b.rental_mode === 'monthly' ? 'เข้าพัก' : 'เช็คอิน'} v={fmtDate(b.from_d)} />
          {b.rental_mode === 'monthly'
            ? (b.desired_months ? <Fact ic="clock" l="ระยะเวลา" v={`${b.desired_months} เดือน`} /> : null)
            : <Fact ic="calendar" l="เช็คเอาท์" v={fmtDate(b.to_d)} />}
          {b.scheduled_at ? <Fact ic="clock" l="นัดดูห้อง" v={fmtDT(b.scheduled_at)} /> : null}
        </div>

        {b.payment_status && b.payment_status !== 'none' && (
          <>
            <h2 className="rsec"><span className="rsec-ic"><Icon n="wallet" size={15} /></span> การชำระเงิน {b.ref ? <span className="bk-ref">{b.ref}</span> : null}</h2>
            <div className="factgrid">
              <Fact ic="wallet" l={b.deposit_minor ? 'ยอดเต็ม' : 'ยอด'} v={b.amount_minor ? `฿${Math.round(Number(b.amount_minor) / 100).toLocaleString()}` : '—'} />
              {b.deposit_minor ? <Fact ic="wallet" l="จ่ายมัดจำ" v={`฿${Math.round(Number(b.paid_minor) / 100).toLocaleString()}`} /> : null}
              {b.deposit_minor ? <Fact ic="clock" l="ค้างชำระ" v={`฿${Math.round((Number(b.amount_minor) - Number(b.paid_minor)) / 100).toLocaleString()}`} /> : null}
              <Fact ic="tag" l="ช่องทาง" v={b.payment_method === 'promptpay' ? 'PromptPay' : b.payment_method === 'cash' ? 'รับที่เคาน์เตอร์' : 'โอนธนาคาร'} />
              <Fact ic="check" l="สถานะ" v={PAY_TH[b.payment_status] || b.payment_status} />
            </div>
            {b.slip_url && <a className="bk-slip" href={b.slip_url} target="_blank" rel="noopener"><img src={b.slip_url} alt="สลิปการโอน" /><span>ดูสลิปเต็ม</span></a>}
            {b.payment_status === 'submitted' && (
              <div className="lead-acts">
                <form action={verifySlipAction.bind(null, b.id)}><button className="dbtn primary" type="submit"><Icon n="check" size={16} /> ยืนยันการชำระ (กันห้อง)</button></form>
                <form action={rejectSlipAction.bind(null, b.id)}><ConfirmSubmit message="ปฏิเสธสลิปนี้? ลูกค้าจะเห็นว่า “สลิปไม่ผ่าน”" className="dbtn danger">สลิปไม่ผ่าน</ConfirmSubmit></form>
              </div>
            )}
            {b.payment_status === 'verified' && b.amount_minor && Number(b.amount_minor) > Number(b.paid_minor || 0) && (
              <form className="balcollect" action={collectBalanceAction.bind(null, b.id)}>
                <div className="balcollect-h">รับเงินที่เหลือ <b>฿{Math.round((Number(b.amount_minor) - Number(b.paid_minor || 0)) / 100).toLocaleString()}</b> (เก็บที่เคาน์เตอร์/โอน)</div>
                <div className="balcollect-row">
                  <input name="amount" type="number" min={1} inputMode="numeric" defaultValue={Math.round((Number(b.amount_minor) - Number(b.paid_minor || 0)) / 100)} aria-label="ยอดที่รับ (บาท)" />
                  <button type="submit" className="dbtn sm primary">บันทึกรับเงิน</button>
                </div>
              </form>
            )}
            {b.refunded_at && <p className="note" style={{ margin: 0 }}>✓ คืนเงินแล้ว ฿{Math.round(Number(b.refunded_minor || 0) / 100).toLocaleString()} · {fmtDate(b.refunded_at)}</p>}
            {b.amount_minor && b.payment_status !== 'refunded' && (b.payment_status === 'rejected' || b.status === 'cancelled' || b.status === 'declined') && (
              <div className="lead-acts">
                <form action={markRefundedAction.bind(null, b.id)}><ConfirmSubmit message="ยืนยันว่าได้คืนเงินให้ลูกค้าแล้ว? (คุณโอนคืนเอง — ระบบแค่บันทึก)" className="dbtn sm">บันทึกคืนเงิน ฿{Math.round(Number(b.paid_minor || b.amount_minor) / 100).toLocaleString()}</ConfirmSubmit></form>
              </div>
            )}
          </>
        )}

        {(reqActs || stayActs) && <h2 className="rsec"><span className="rsec-ic"><Icon n="store" size={15} /></span> จัดการ</h2>}

        {reqActs && (
          <div className="actgroup">
            <span className="actgroup-l">คำขอจอง</span>
            <div className="lead-acts">
              {canConvertDaily && <form action={convertLeadToBlockAction.bind(null, b.id)}><button className="dbtn primary" type="submit"><Icon n="calendar" size={16} /> ยืนยันการจอง (กันห้อง)</button></form>}
              {canConvertMonthly && <form action={convertMonthlyLeadAction.bind(null, b.id)}><ConfirmSubmit message="รับลูกค้าเข้าพักรายเดือนและตั้งห้องเป็นไม่ว่าง? จำนวนห้องว่างจะลดลง (แก้ไขได้จากผังห้อง)" className="dbtn primary"><Icon n="calendar" size={16} /> รับเข้าพัก</ConfirmSubmit></form>}
              {b.status === 'new' && <form action={setLeadStatusAction.bind(null, b.id, 'contacted')}><button className="dbtn" type="submit">ติดต่อแล้ว</button></form>}
              <details className="lead-sched-f">
                <summary className="dbtn"><Icon n="calendar" size={15} /> นัดดูห้อง</summary>
                <form action={scheduleLeadAction.bind(null, b.id)}>
                  <input type="datetime-local" name="scheduled_at" required />
                  <button className="dbtn sm primary" type="submit">บันทึกนัด</button>
                </form>
              </details>
              {b.status !== 'confirmed' && <form action={setLeadStatusAction.bind(null, b.id, 'confirmed')}><button className="dbtn" type="submit">ตกลง (ยังไม่กันห้อง)</button></form>}
              <form action={setLeadStatusAction.bind(null, b.id, 'declined')}><button className="dbtn" type="submit">ปฏิเสธ</button></form>
            </div>
          </div>
        )}

        {stayActs && (
          <div className="actgroup">
            <span className="actgroup-l">การเข้าพัก</span>
            <div className="lead-acts">
              {b.converted_block_id && !b.checked_in_at && <form action={checkInAction.bind(null, b.id)}><button className="dbtn primary" type="submit"><Icon n="check" size={16} /> เช็คอิน</button></form>}
              {b.checked_in_at && <form action={checkOutAction.bind(null, b.id)}><ConfirmSubmit message="เช็คเอาท์ผู้เข้าพักนี้? ห้องจะถูกปล่อยคืนให้ว่างทันที" className="dbtn primary"><Icon n="check" size={16} /> เช็คเอาท์</ConfirmSubmit></form>}
              {b.rental_mode === 'daily' && !b.checked_in_at && <form action={markNoShowAction.bind(null, b.id)}><ConfirmSubmit message="บันทึกว่าลูกค้าไม่มาเข้าพัก? ห้องที่กันไว้จะถูกปล่อยคืนให้จองใหม่ได้ทันที" className="dbtn">ไม่มาเข้าพัก</ConfirmSubmit></form>}
              <form action={cancelBookingAction.bind(null, b.id)}><ConfirmSubmit message="ยกเลิกการจองนี้? ห้องที่กันไว้จะถูกปล่อยคืนให้ว่างทันที" className="dbtn">ยกเลิกการจอง</ConfirmSubmit></form>
            </div>
          </div>
        )}

        {events.length > 0 && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="clock" size={15} /></span> ประวัติ</h2>
          <ul className="bk-timeline">
            {events.map((e: any, i: number) => <li key={i}><span>{EV_TH[e.event_kind] || e.event_kind}</span><span className="muted">{fmtDT(e.effective_at)}</span></li>)}
          </ul>
        </>)}

        <form className="delwrap" action={deleteLeadAction.bind(null, b.id)}>
          <ConfirmSubmit message="ลบการจองนี้? ข้อมูลติดต่อของลูกค้า (เบอร์/LINE) จะหายจากกล่องคำขอ — กู้คืนเองไม่ได้" className="dbtn danger"><Icon n="trash" size={16} /> ลบการจองนี้</ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
