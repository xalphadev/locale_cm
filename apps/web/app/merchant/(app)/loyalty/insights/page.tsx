import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';

export const dynamic = 'force-dynamic';

const DOW = ['', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']; // ISODOW 1..7
const K = 5; // k-anonymity floor — hide per-slot breakdowns until the brand has ≥5 distinct visitors

// Loyalty analytics — only the metrics computable from data that EXISTS, brand-keyed, suppressed at n<5.
export default async function Insights() {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const [prog] = await q<any>(`SELECT points_name_i18n FROM stamp_programs WHERE brand_id=$1 AND status='active'`, [acc.brand_id]);
  if (!prog) redirect('/merchant/loyalty');
  const pn = i18n(prog.points_name_i18n) || 'แต้ม';

  // P1 — verified visits + distinct/repeat (the honest headline; counts only, no individual exposure)
  const [p1] = await q<any>(
    `SELECT count(*) FILTER (WHERE ci.created_at >= now() - interval '7 days')::int visits_7d,
            count(DISTINCT ci.user_id) FILTER (WHERE ci.created_at >= now() - interval '7 days')::int users_7d,
            count(DISTINCT ci.user_id)::int users_all
       FROM check_ins ci JOIN places p ON p.id = ci.place_id
      WHERE p.brand_id = $1 AND ci.trust_tier <> 'gps_dwell'`, [acc.brand_id]);
  const [rep] = await q<any>(
    `SELECT count(*)::int n FROM (
        SELECT ci.user_id FROM check_ins ci JOIN places p ON p.id = ci.place_id
         WHERE p.brand_id = $1 AND ci.trust_tier <> 'gps_dwell'
         GROUP BY ci.user_id HAVING count(*) >= 2) t`, [acc.brand_id]);
  const enoughData = (p1?.users_all ?? 0) >= K;

  // P3 — points liability / breakage + redemption rate
  const [p3] = await q<any>(
    `SELECT (SELECT count(*) FROM stamp_balances WHERE brand_id=$1 AND balance>0)::int members,
            (SELECT COALESCE(sum(balance),0) FROM stamp_balances WHERE brand_id=$1)::int outstanding,
            (SELECT count(*) FROM stamp_events WHERE brand_id=$1 AND delta>0 AND created_at >= now()-interval '30 days')::int issued_30d,
            (SELECT COALESCE(sum(redeemed_count),0) FROM stamp_rewards WHERE brand_id=$1 AND deleted_at IS NULL)::int redeemed`, [acc.brand_id]);
  const totalEarnRedeem = (p3?.redeemed ?? 0) + (p3?.outstanding ?? 0);
  const redeemRate = totalEarnRedeem > 0 ? Math.round((p3.redeemed / totalEarnRedeem) * 100) : null;

  // P5 — day-of-week pattern (last 30d, verified visits). Suppressed until ≥K distinct visitors.
  const days = enoughData ? await q<any>(
    `SELECT EXTRACT(ISODOW FROM ci.created_at AT TIME ZONE 'Asia/Bangkok')::int dow, count(*)::int n
       FROM check_ins ci JOIN places p ON p.id = ci.place_id
      WHERE p.brand_id=$1 AND ci.trust_tier <> 'gps_dwell' AND ci.created_at >= now()-interval '30 days'
      GROUP BY dow`, [acc.brand_id]) : [];
  const [peak] = enoughData ? await q<any>(
    `SELECT EXTRACT(HOUR FROM ci.created_at AT TIME ZONE 'Asia/Bangkok')::int hr, count(*)::int n
       FROM check_ins ci JOIN places p ON p.id = ci.place_id
      WHERE p.brand_id=$1 AND ci.trust_tier <> 'gps_dwell' AND ci.created_at >= now()-interval '30 days'
      GROUP BY hr ORDER BY n DESC LIMIT 1`, [acc.brand_id]) : [null];
  const dayN: number[] = Array(8).fill(0);
  for (const d of days) dayN[d.dow] = d.n;
  const dayMax = Math.max(1, ...dayN.slice(1));

  // P2 — new vs returning among last-30d visitors (Growth). Suppressed at small N.
  const [p2] = enoughData ? await q<any>(
    `WITH visitors30 AS (
       SELECT DISTINCT ci.user_id FROM check_ins ci JOIN places p ON p.id = ci.place_id
        WHERE p.brand_id=$1 AND ci.trust_tier <> 'gps_dwell' AND ci.created_at >= now()-interval '30 days'),
     firsts AS (
       SELECT ci.user_id, min(ci.created_at) f FROM check_ins ci JOIN places p ON p.id = ci.place_id
        WHERE p.brand_id=$1 AND ci.trust_tier <> 'gps_dwell' GROUP BY ci.user_id)
     SELECT count(*) FILTER (WHERE f.f >= now()-interval '30 days')::int new_u,
            count(*) FILTER (WHERE f.f <  now()-interval '30 days')::int ret_u
       FROM visitors30 v JOIN firsts f ON f.user_id = v.user_id`, [acc.brand_id]) : [null];
  const p2total = p2 ? p2.new_u + p2.ret_u : 0;
  const retPct = p2total > 0 ? Math.round((p2.ret_u / p2total) * 100) : null;

  // P7 — audience mix (Growth). Per-segment distinct visitors; each cell suppressed at n<K.
  const SEGLABEL: Record<string, string> = { local: 'คนท้องถิ่น', nomad_expat: 'โนแมด/ต่างชาติพำนัก', tourist_west: 'นักท่องเที่ยวต่างชาติ', tourist_cn: 'นักท่องเที่ยวจีน' };
  const segs = enoughData ? (await q<any>(
    `SELECT u.audience_segment::text seg, count(DISTINCT ci.user_id)::int n
       FROM check_ins ci JOIN places p ON p.id = ci.place_id JOIN users u ON u.id = ci.user_id
      WHERE p.brand_id=$1 AND ci.trust_tier <> 'gps_dwell' AND u.audience_segment IS NOT NULL
      GROUP BY seg ORDER BY n DESC`, [acc.brand_id])).filter((r: any) => r.n >= K) : [];
  const segTotal = segs.reduce((a: number, s: any) => a + s.n, 0) || 1;

  return (
    <>
      <div className="mback"><a href="/merchant/loyalty"><Icon n="chevL" size={17} /> แต้มสะสม</a></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="spark" size={18} /></span> สถิติร้าน</h1>
      <p className="note" style={{ margin: '.1rem 0 1rem' }}>ข้อมูลรวมจากการเช็คอินที่ร้านยืนยัน — เป็นภาพรวม ไม่เจาะรายบุคคล (ซ่อนถ้าข้อมูลน้อยกว่า {K} คน)</p>

      {/* P1 — the honest headline */}
      <div className="menu-label">สัปดาห์นี้</div>
      <div className="lstats">
        <div className="lstat"><div className="v">{p1?.visits_7d ?? 0}</div><div className="l">เข้าร้าน (ครั้ง)</div></div>
        <div className="lstat"><div className="v">{p1?.users_7d ?? 0}</div><div className="l">ลูกค้า (คน)</div></div>
        <div className="lstat"><div className="v">{rep?.n ?? 0}</div><div className="l">กลับมาซ้ำ</div></div>
      </div>

      {/* P3 — points liability */}
      <div className="menu-label">แต้มในระบบ</div>
      <div className="menu">
        <div className="menu-row"><span className="menu-ic"><Icon n="spark" size={20} /></span><span className="menu-tx">สมาชิกสะสม{pn}</span><span className="menu-val">{p3?.members ?? 0}</span></div>
        <div className="menu-row"><span className="menu-ic"><Icon n="spark" size={20} /></span><span className="menu-tx">{pn}ค้างจ่ายในระบบ</span><span className="menu-val">{p3?.outstanding ?? 0}</span></div>
        <div className="menu-row"><span className="menu-ic"><Icon n="check" size={20} /></span><span className="menu-tx">แลกไปแล้ว (ครั้ง)</span><span className="menu-val">{p3?.redeemed ?? 0}</span></div>
        {redeemRate !== null && (
          <div className="menu-row"><span className="menu-ic"><Icon n="tag" size={20} /></span><span className="menu-tx">อัตราการแลก</span><span className="menu-val">{redeemRate}%</span></div>
        )}
      </div>
      {redeemRate !== null && redeemRate < 10 && (p3?.outstanding ?? 0) > 0 && (
        <div className="banner-err" style={{ marginTop: -6 }}>อัตราการแลกต่ำ ({redeemRate}%) — ลูกค้าอาจรู้สึกว่ารางวัลไกลเกินไป ลองลดจำนวน{pn}ที่ต้องใช้ดู</div>
      )}

      {/* P5 — daypart (suppressed at small N) */}
      <div className="menu-label">ช่วงเวลาที่คนเข้าร้าน (30 วัน)</div>
      {enoughData ? (
        <div className="fsec" style={{ padding: '14px 14px 10px' }}>
          {peak && <div className="note" style={{ margin: '0 0 10px', fontWeight: 700, color: 'var(--m-text)' }}>ชั่วโมงพีค: {String(peak.hr).padStart(2, '0')}:00 น.</div>}
          <div className="daybars">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <div className="daybar" key={d}>
                <span className="daybar-fill" style={{ height: `${Math.round((dayN[d] / dayMax) * 100)}%` }} />
                <span className="daybar-l">{DOW[d]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="nomatch">ข้อมูลยังน้อย — ดูช่วงเวลา/กลุ่มลูกค้าได้เมื่อมีลูกค้าเช็คอินครบ {K} คนขึ้นไป</div>
      )}

      {/* P2 — new vs returning (Growth) */}
      {enoughData && retPct !== null && (
        <>
          <div className="menu-label">ลูกค้าเก่า–ใหม่ (30 วัน) <span className="tierbadge">Growth</span></div>
          <div className="lstats">
            <div className="lstat"><div className="v">{p2.new_u}</div><div className="l">หน้าใหม่</div></div>
            <div className="lstat"><div className="v">{p2.ret_u}</div><div className="l">กลับมาซ้ำ</div></div>
            <div className="lstat"><div className="v">{retPct}%</div><div className="l">สัดส่วนลูกค้าประจำ</div></div>
          </div>
        </>
      )}

      {/* P7 — audience mix (Growth) */}
      {enoughData && segs.length > 0 && (
        <>
          <div className="menu-label">กลุ่มลูกค้า <span className="tierbadge">Growth</span></div>
          <div className="fsec" style={{ padding: '12px 14px' }}>
            {segs.map((s: any) => {
              const pct = Math.round((s.n / segTotal) * 100);
              return (
                <div className="segrow" key={s.seg}>
                  <span className="segrow-l">{SEGLABEL[s.seg] || s.seg}</span>
                  <span className="segbar"><span style={{ width: `${pct}%` }} /></span>
                  <span className="segrow-v">{pct}%</span>
                </div>
              );
            })}
            <p className="fhint" style={{ marginTop: 8 }}>ปรับเมนู/ป้าย/ภาษา/ช่องทางชำระเงินตามกลุ่มลูกค้าหลักของร้าน</p>
          </div>
        </>
      )}

      <p className="note" style={{ marginTop: 14 }}>ROI ของรางวัล + ส่งออกข้อมูล เปิดในแพ็ก Pro · ทุกตัวเลขเป็นภาพรวม ปิดบังถ้ากลุ่มน้อยกว่า {K} คน</p>
    </>
  );
}
