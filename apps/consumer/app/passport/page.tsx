import { q, demoUserId, i18n } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Passport() {
  let rows: any[] = [];
  try {
    const uid = await demoUserId();
    if (uid) rows = await q<any>(
      `SELECT qp.status::text, COALESCE(jsonb_array_length(qp.steps_completed),0) done,
              qu.title_i18n, qu.min_steps_required need
       FROM quest_progress qp JOIN quests qu ON qu.id=qp.quest_id
       WHERE qp.user_id=$1 ORDER BY qp.created_at DESC`, [uid]);
  } catch { /* db down */ }

  return (
    <>
      <div className="top"><div className="hi">สมุดสะสมแสตมป์</div><h1>Passport 📕</h1></div>
      <div className="body">
        {rows.map((r, i) => {
          const done = Number(r.done), need = Number(r.need), complete = r.status !== 'in_progress';
          return (
            <div className="quest" key={i} style={{ marginBottom: 14 }}>
              <h3>{i18n(r.title_i18n)}</h3>
              <div className="sub">{complete ? 'ครบแล้ว 🎉' : `เก็บแล้ว ${done}/${need} แสตมป์`}</div>
              <div className="stamps">
                {Array.from({ length: need }).map((_, k) => (
                  <div key={k} className={`st ${k < done ? 'on' : ''}`}>{k < done ? '✓' : '☕'}</div>
                ))}
              </div>
              <div className="reward-row">
                <div className="seal">🪙</div>
                <div><div style={{ fontWeight: 700 }}>ฟรีกาแฟ 1 แก้ว</div>
                  <div className="muted">แลกที่ร้านพาร์ตเนอร์</div></div>
                {complete && <span className="ready">พร้อมแลก</span>}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="muted">ยังไม่มีเควสต์ที่เริ่ม — ไปหน้า Discover แล้วกด “เริ่ม”</p>}
      </div>
    </>
  );
}
