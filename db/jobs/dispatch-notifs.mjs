// dispatch-notifs.mjs — deliver queued notifications (notif_outbox where dispatched_at IS NULL).
// In-app inbox shows them immediately (no delivery needed); this worker is the PUSH channel.
//
// Dev: marks rows dispatched and logs them. Prod: wire LINE Messaging API at the marked TODO
// (needs LINE_CHANNEL_TOKEN + each user's LINE userId from user_identities). Idempotent, batched.
//
//   DATABASE_URL=postgres://postgres@127.0.0.1:54400/locale node db/jobs/dispatch-notifs.mjs
import { createRequire } from 'module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const pool = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:54400/locale' });
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

const LINE_TOKEN = process.env.LINE_CHANNEL_TOKEN || '';
const BATCH = 200;

const rows = await q(
  `SELECT n.id, n.event_type, n.audience_user_id, n.payload, p.name_i18n pname,
          li.provider_user_id AS line_id
     FROM notif_outbox n
     LEFT JOIN places p ON p.id = n.entity_id AND n.entity_type='place'
     LEFT JOIN user_identities li ON li.user_id = n.audience_user_id AND li.provider='line'
    WHERE n.dispatched_at IS NULL AND n.audience_user_id IS NOT NULL
    ORDER BY n.created_at LIMIT $1`, [BATCH]);

let pushed = 0, skipped = 0;
for (const n of rows) {
  const place = n.pname?.th || n.pname?.en || '';
  const text = n.event_type === 'deal_published'
    ? `🏷️ ${place} ที่คุณบันทึกมีดีลใหม่: ${n.payload?.title || ''}`
    : (n.payload?.title || 'มีอัปเดตใหม่ใน Locale');

  if (LINE_TOKEN && n.line_id) {
    // TODO(prod): POST https://api.line.me/v2/bot/message/push
    //   headers: Authorization: Bearer ${LINE_TOKEN}
    //   body: { to: n.line_id, messages: [{ type:'text', text }] }
    // await fetch('https://api.line.me/v2/bot/message/push', { method:'POST', headers:{...}, body:JSON.stringify({to:n.line_id,messages:[{type:'text',text}]}) });
    pushed++;
  } else {
    skipped++; // no LINE token / user not linked → in-app inbox still shows it
    if (!LINE_TOKEN) console.log(`[dev] would push → ${n.audience_user_id}: ${text}`);
  }
  await q(`UPDATE notif_outbox SET dispatched_at=now() WHERE id=$1`, [n.id]);
}
console.log(`dispatched=${rows.length} pushed=${pushed} inapp_only=${skipped}`);
await pool.end();
