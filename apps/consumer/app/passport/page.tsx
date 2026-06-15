import { q, demoUserId, i18n } from '@/lib/db';
import { checkInAction, redeemAction } from '../actions';

export const dynamic = 'force-dynamic';

type Quest = { qid: string; status: string; need: number; title_i18n: any; steps_completed: any };
type Step = { sid: string; step_order: number; name_i18n: any };

export default async function Passport() {
  let quests: Quest[] = [];
  let stepsByQuest: Record<string, Step[]> = {};
  try {
    const uid = await demoUserId();
    if (uid) {
      quests = await q<Quest>(
        `SELECT qu.id qid, qp.status::text, qu.min_steps_required need, qu.title_i18n, qp.steps_completed
         FROM quest_progress qp JOIN quests qu ON qu.id=qp.quest_id
         WHERE qp.user_id=$1 ORDER BY (qp.status='in_progress') DESC, qp.created_at DESC`, [uid]);
      for (const quest of quests) {
        stepsByQuest[quest.qid] = await q<Step>(
          `SELECT qs.id sid, qs.step_order, p.name_i18n
           FROM quest_steps qs JOIN places p ON p.id=qs.place_id
           WHERE qs.quest_id=$1 ORDER BY qs.step_order`, [quest.qid]);
      }
    }
  } catch { /* db down */ }

  return (
    <>
      <div className="top"><div className="hi">สมุดสะสมแสตมป์</div><h1>Passport 📕</h1></div>
      <div className="body">
        {quests.map((quest) => {
          const complete = quest.status !== 'in_progress';
          const doneJson = JSON.stringify(quest.steps_completed ?? []);
          const steps = stepsByQuest[quest.qid] ?? [];
          const doneCount = steps.filter((s) => doneJson.includes(s.sid)).length;
          // first not-yet-done step = the one you can check into next (quests advance in order)
          const nextSid = steps.find((s) => !doneJson.includes(s.sid))?.sid;
          return (
            <div className="quest" key={quest.qid} style={{ marginBottom: 16 }}>
              <h3>{i18n(quest.title_i18n)}</h3>
              <div className="sub">{complete ? 'ครบแล้ว 🎉' : `เก็บแล้ว ${doneCount}/${quest.need} แสตมป์`}</div>

              <div className="steps">
                {steps.map((s) => {
                  const isDone = doneJson.includes(s.sid);
                  const isNext = s.sid === nextSid && !complete;
                  return (
                    <div className="steprow" key={s.sid}>
                      <div className={`dot ${isDone ? 'on' : ''}`}>{isDone ? '✓' : s.step_order}</div>
                      <div className="stepname">{i18n(s.name_i18n)}</div>
                      {isDone ? (
                        <span className="done-tag">เช็คอินแล้ว</span>
                      ) : (
                        <form action={checkInAction.bind(null, quest.qid, s.sid)}>
                          <button className="cbtn" disabled={!isNext} type="submit">เช็คอิน</button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="reward-row">
                <div className="seal">🪙</div>
                <div><div style={{ fontWeight: 700 }}>ฟรีกาแฟ 1 แก้ว</div>
                  <div className="muted">แลกที่ร้านพาร์ตเนอร์</div></div>
                {complete && (
                  <form action={redeemAction} style={{ marginLeft: 'auto' }}>
                    <button className="rbtn" type="submit">แลกรางวัล 🎁</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {quests.length === 0 && <p className="muted">ยังไม่มีเควสต์ที่เริ่ม — ไปหน้า Discover แล้วกด “เริ่ม”</p>}
      </div>
    </>
  );
}
