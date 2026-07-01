import Link from 'next/link';
import { q } from '@/lib/db';
import { setUserStatusAction } from '../actions';
import { PageHead, H2 } from '../adm-ui';

export const dynamic = 'force-dynamic';

// Customer accounts console — the staff view the platform never had: who signed up, how active they
// are, and a reversible suspend switch (users.status). Enforcement lives in the consumer app's
// demoUserId()/login (status='active' check) — this page only flips the flag. 'banned' is reserved
// for the fraud pipeline and is shown but not settable here.
const ST_TH: Record<string, string> = { active: 'ปกติ', suspended: 'ระงับ', banned: 'แบน (fraud)' };
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'active', l: 'ปกติ' }, { k: 'suspended', l: 'ระงับ/แบน' }];

export default async function Users({ searchParams }: { searchParams: { q?: string; f?: string; ok?: string } }) {
  const qtext = String(searchParams?.q || '').slice(0, 80).trim();
  const f = ['active', 'suspended'].includes(searchParams?.f || '') ? searchParams!.f! : '';
  let rows: any[] = [];
  try {
    const where = ['TRUE'];
    const params: any[] = [];
    if (qtext) { params.push('%' + qtext + '%'); where.push(`(pr.display_name ILIKE $${params.length} OR uc.email ILIKE $${params.length})`); }
    if (f === 'active') where.push(`u.status='active'`);
    if (f === 'suspended') where.push(`u.status IN ('suspended','banned')`);
    rows = await q<any>(
      `SELECT u.id, u.status::text status, to_char(u.created_at,'DD/MM/YY') joined,
              pr.display_name, uc.email,
              (SELECT count(*)::int FROM reviews r WHERE r.user_id=u.id) reviews,
              (SELECT count(*)::int FROM check_ins c WHERE c.user_id=u.id) checkins,
              (SELECT count(*)::int FROM saved_places sp WHERE sp.user_id=u.id) saves,
              (SELECT count(*)::int FROM stay_booking_request br WHERE br.requester_user_id=u.id AND br.deleted_at IS NULL) bookings
         FROM users u
         LEFT JOIN profiles pr ON pr.user_id=u.id
         LEFT JOIN user_credentials uc ON uc.user_id=u.id
        WHERE ${where.join(' AND ')}
        ORDER BY (u.status<>'active') DESC, u.created_at DESC LIMIT 200`, params);
  } catch { /* db down */ }
  const nSus = rows.filter((r) => r.status !== 'active').length;

  return (
    <>
      <PageHead icon="users" title="ผู้ใช้ (ลูกค้า)" count={rows.length}
        sub="บัญชีฝั่งลูกค้าทั้งหมด — ระงับ/คืนสถานะได้ที่นี่ · บัญชีที่ระงับจะใช้งานฝั่งแอปไม่ได้ทันที (เขียน/สะสมแต้ม/จองไม่ได้) แต่รีวิวเดิมยังอยู่ในระบบตามการ moderate ปกติ" />
      {searchParams?.ok === 'suspended' && <div className="banner-ok">✓ ระงับบัญชีแล้ว — ผู้ใช้จะหลุดจากระบบทันที</div>}
      {searchParams?.ok === 'active' && <div className="banner-ok">✓ คืนสถานะบัญชีแล้ว</div>}

      <form method="GET" action="/users" style={{ display: 'flex', gap: 8, margin: '0 0 10px' }}>
        {f && <input type="hidden" name="f" value={f} />}
        <input name="q" defaultValue={qtext} placeholder="ค้นหาชื่อ / อีเมล" style={{ flex: '0 1 320px' }} />
        <button className="btn" type="submit">ค้นหา</button>
      </form>
      <div style={{ display: 'flex', gap: 6, margin: '0 0 12px' }}>
        {FILTERS.map((t) => (
          <Link key={t.k} href={t.k ? `/users?f=${t.k}${qtext ? `&q=${encodeURIComponent(qtext)}` : ''}` : (qtext ? `/users?q=${encodeURIComponent(qtext)}` : '/users')}
            className={`btn ${f === t.k ? 'btn-primary' : ''}`}>{t.l}</Link>
        ))}
      </div>

      <H2 icon="users">บัญชี ({rows.length}{nSus ? ` · ระงับ ${nSus}` : ''})</H2>
      {rows.length === 0 ? <p className="note">{qtext ? `ไม่พบผู้ใช้ที่ตรงกับ “${qtext}”` : 'ยังไม่มีผู้ใช้'}</p> : (
        <table>
          <thead><tr><th>ผู้ใช้</th><th>อีเมล</th><th>สมัคร</th><th>รีวิว</th><th>เช็คอิน</th><th>บันทึก</th><th>จองที่พัก</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ opacity: r.status === 'active' ? 1 : 0.6 }}>
                <td>{r.display_name || '—'}</td>
                <td>{r.email || '—'}</td>
                <td>{r.joined}</td>
                <td>{r.reviews}</td><td>{r.checkins}</td><td>{r.saves}</td><td>{r.bookings}</td>
                <td>{ST_TH[r.status] || r.status}</td>
                <td>
                  {r.status === 'active' && (
                    <form action={setUserStatusAction.bind(null, r.id, 'suspended')}>
                      <button className="btn" type="submit">ระงับ</button>
                    </form>
                  )}
                  {r.status === 'suspended' && (
                    <form action={setUserStatusAction.bind(null, r.id, 'active')}>
                      <button className="btn btn-approve" type="submit">คืนสถานะ</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
