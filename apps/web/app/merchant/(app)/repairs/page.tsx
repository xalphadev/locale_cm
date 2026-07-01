import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../ui';
import { MTopbar } from '../MTopbar';
import { setMaintenanceStatusAction, createMaintenanceAction, setMaintenanceNoteAction } from '../../actions';

export const dynamic = 'force-dynamic';

// แจ้งซ่อม owner inbox (0063): repair requests the tenant submitted from /my, across the property. Move each
// new → in_progress (รับเรื่อง) → done (เสร็จ) or cancelled; reopen if needed. Operational log, not money.
const RP: Record<string, string> = { new: 'รอรับเรื่อง', in_progress: 'กำลังซ่อม', done: 'เสร็จแล้ว', cancelled: 'ยกเลิก' };
const FILTERS = [{ k: 'open', label: 'ค้างอยู่' }, { k: 'done', label: 'เสร็จ/ยกเลิก' }, { k: 'all', label: 'ทั้งหมด' }];

export default async function Repairs({ searchParams }: { searchParams: { f?: string; ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const f = ['open', 'done', 'all'].includes(searchParams?.f || '') ? searchParams!.f! : 'open';
  const cond = f === 'done' ? `m.status IN ('done','cancelled')` : f === 'all' ? `TRUE` : `m.status IN ('new','in_progress')`;
  const [sm] = await q<any>(`SELECT count(*) FILTER (WHERE status='new')::int newn, count(*) FILTER (WHERE status IN ('new','in_progress'))::int openn FROM stay_maintenance WHERE place_id=$1 AND deleted_at IS NULL`, [acc.place_id]);
  const rows = await q<any>(
    `SELECT m.id, m.detail, m.photos, m.status, m.source, m.owner_note, to_char(m.created_at,'DD/MM/YY') at, r.code room_code, t.full_name tenant_name
       FROM stay_maintenance m
       LEFT JOIN stay_room r ON r.id=m.room_id
       LEFT JOIN stay_lease l ON l.id=m.lease_id
       LEFT JOIN stay_tenant t ON t.id=l.tenant_id AND t.deleted_at IS NULL
      WHERE m.place_id=$1 AND m.deleted_at IS NULL AND ${cond}
      ORDER BY (m.status='new') DESC, m.created_at DESC LIMIT 200`, [acc.place_id]);
  // room picker for the owner-logged repair form (a corridor light has no room → optional)
  const rooms = await q<any>(`SELECT id, code FROM stay_room WHERE place_id=$1 AND status='active' AND deleted_at IS NULL ORDER BY code LIMIT 500`, [acc.place_id]);

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="แจ้งซ่อม" />
      {searchParams?.ok && <div className="banner-ok">✓ อัปเดตแล้ว</div>}
      <div className="bk-summary"><div className="bk-sum-stats">
        <div className="bk-stat"><span className={`bk-stat-n ${(sm?.newn || 0) > 0 ? 'bk-amber' : ''}`}>{sm?.newn || 0}</span><span className="bk-stat-l">เรื่องใหม่</span></div>
        <div className="bk-stat"><span className="bk-stat-n">{sm?.openn || 0}</span><span className="bk-stat-l">ค้างอยู่</span></div>
      </div></div>
      {searchParams && (searchParams as any).error === 'detail' && <div className="banner-err">กรุณาระบุรายละเอียดงานซ่อม</div>}

      {/* owner logs a repair themselves — the tenant who told them at the counter/LINE, or a fault they spotted */}
      <details className="field" style={{ margin: '10px 0' }}>
        <summary className="dbtn sm primary" style={{ display: 'inline-block', cursor: 'pointer', listStyle: 'none' }}>+ แจ้งซ่อมเอง</summary>
        <form className="form" action={createMaintenanceAction} style={{ marginTop: 8 }}>
          <div className="field"><label>รายละเอียด <span className="req">*</span></label>
            <input name="detail" required maxLength={500} placeholder="เช่น แอร์ห้อง 203 ไม่เย็น / ไฟทางเดินชั้น 2 เสีย" /></div>
          <div className="grid2">
            <div className="field"><label>ห้อง (ถ้ามี)</label>
              <select name="room_id" defaultValue=""><option value="">— ส่วนกลาง / ไม่ระบุ —</option>
                {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.code}</option>)}</select></div>
            <div className="field"><label>โน้ต (นัดช่าง/ค่าซ่อม)</label>
              <input name="owner_note" maxLength={300} placeholder="เช่น ช่างเข้าพรุ่งนี้ 10:00" /></div>
          </div>
          <div className="field"><label>รูป (ถ้ามี)</label><input type="file" name="photos" accept="image/*" multiple /></div>
          <button className="dbtn sm primary" type="submit">บันทึกงานซ่อม</button>
        </form>
      </details>

      <div className="segtabs">{FILTERS.map((t) => <Link key={t.k} href={`/merchant/repairs?f=${t.k}`} className={`segtab ${f === t.k ? 'on' : ''}`}>{t.label}</Link>)}</div>
      {rows.length === 0 ? <p className="note">{f === 'open' ? 'ไม่มีงานซ่อมค้าง 🎉' : 'ยังไม่มีรายการ'}</p> : (
        <div className="mlist">
          {rows.map((m: any) => (
            <div key={m.id} style={{ borderBottom: '1px solid var(--m-line)', padding: '8px 0' }}>
              <div className="mrow" style={{ cursor: 'default', borderBottom: 'none' }}>
                <span className="mrow-body">
                  <span className="mrow-nm">{m.room_code ? `ห้อง ${m.room_code} · ` : ''}{m.detail}</span>
                  <span className="mrow-meta">{m.source === 'owner' ? 'บันทึกเอง · ' : m.tenant_name ? `${m.tenant_name} · ` : 'ผู้เช่าแจ้ง · '}{m.at}</span>
                </span>
                <span className={`t ${m.status === 'done' ? 'sold' : m.status === 'in_progress' ? 'cat' : m.status === 'cancelled' ? 'off' : 'season'}`}>{RP[m.status] || m.status}</span>
              </div>
              {m.photos?.length ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '2px 0 6px' }}>{m.photos.map((u: string, j: number) => <a key={j} href={u} target="_blank" rel="noopener"><img src={u} alt={`รูปแจ้งซ่อม ${j + 1}`} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} /></a>)}</div> : null}
              <div className="lead-acts">
                {m.status === 'new' && <form action={setMaintenanceStatusAction.bind(null, m.id, 'in_progress')}><button className="dbtn sm primary" type="submit">รับเรื่อง</button></form>}
                {(m.status === 'new' || m.status === 'in_progress') && <form action={setMaintenanceStatusAction.bind(null, m.id, 'done')}><button className="dbtn sm primary" type="submit"><Icon n="check" size={14} /> เสร็จ</button></form>}
                {(m.status === 'new' || m.status === 'in_progress') && <form action={setMaintenanceStatusAction.bind(null, m.id, 'cancelled')}><button className="dbtn sm" type="submit">ยกเลิก</button></form>}
                {(m.status === 'done' || m.status === 'cancelled') && <form action={setMaintenanceStatusAction.bind(null, m.id, 'new')}><button className="dbtn sm" type="submit">เปิดใหม่</button></form>}
              </div>
              {(m.status === 'new' || m.status === 'in_progress') ? (
                <form action={setMaintenanceNoteAction.bind(null, m.id)} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input name="owner_note" defaultValue={m.owner_note || ''} maxLength={300}
                    placeholder="โน้ต: นัดช่าง / อะไหล่ / ค่าซ่อมโดยประมาณ" style={{ flex: 1 }} />
                  <button className="dbtn sm" type="submit">บันทึก</button>
                </form>
              ) : m.owner_note ? <div className="mrow-meta" style={{ marginTop: 4 }}>โน้ต: {m.owner_note}</div> : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
