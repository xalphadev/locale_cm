// Create 2 REAL merchant-portal logins on top of seed-real-cm.sql, wiring each
// account to existing real places via the multi-entity model (account → brands → branches).
// Passwords are scrypt-hashed (can't be done in plain SQL), so this is a Node companion to the
// SQL seed. Idempotent. Run by db/test/reseed-real.sh, or manually:
//   cd apps/web && DATABASE_URL=postgres://postgres@127.0.0.1:54400/locale node ../../db/test/seed-merchant-logins.mjs
//
// All accounts log in with password:  locale1234   (portal runs on http://localhost:3002/merchant)
import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:54400/locale' });
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);
const hashPw = (pw) => { const s = crypto.randomBytes(16); return `scrypt:${s.toString('hex')}:${crypto.scryptSync(pw, s, 64).toString('hex')}`; };
const PW = 'locale1234';

// owner → N brands ("ร้าน") → each brand wraps one existing real branch (place, matched by EN name)
const ACCOUNTS = [
  {
    // already ownership-verified → demonstrates the UNLOCKED state (loyalty open, verified badge)
    email: 'owner@ristr8to.demo', display: 'Ristr8to Group', phone: '+66 53 215 278', verified: true,
    merchantId: '00000000-0000-4000-8000-00000000be01',
    brands: [
      { name: { th: 'ริสเตรตโต', en: 'Ristr8to' }, kind: 'cafe', branch: 'Ristr8to' },
      { name: { th: 'โรสเทอรี่ คาเฟ่', en: 'Roast8ery' }, kind: 'cafe', branch: 'Roast8ery Cafe' },
    ],
  },
  {
    // left UNVERIFIED → demonstrates the verification gate (loyalty locked → /merchant/verify)
    email: 'owner@tongtemtoh.demo', display: 'ตองเต็มโต๊ะ กรุ๊ป', phone: '+66 53 894 701', verified: false,
    merchantId: '00000000-0000-4000-8000-00000000be02',
    brands: [
      { name: { th: 'ตองเต็มโต๊ะ', en: 'Tong Tem Toh' }, kind: 'restaurant', branch: 'Tong Tem Toh' },
      { name: { th: 'นิมมาน โค-ลิฟวิ่ง', en: 'Nimman Co-Living' }, kind: 'stay', branch: 'Nimman Co-Living Hostel' },
    ],
  },
  {
    // unverified + a PENDING manual-review request → demonstrates the staff /claims approval queue
    email: 'owner@huenphen.demo', display: 'เฮือนเพ็ญ', phone: '+66 53 814 548', verified: false,
    manualReview: 'ผมเป็นเจ้าของร้านเฮือนเพ็ญตัวจริง เบอร์ในระบบเป็นเบอร์เก่า มีทะเบียนพาณิชย์ยืนยันได้ครับ',
    merchantId: null,
    brands: [
      { name: { th: 'เฮือนเพ็ญ', en: 'Huen Phen' }, kind: 'restaurant', branch: 'Huen Phen' },
    ],
  },
];

const [{ id: cityId }] = await q(`SELECT id FROM cities WHERE code='CNX'`);

for (const a of ACCOUNTS) {
  // upsert account (email is UNIQUE)
  const [acc] = await q(
    `INSERT INTO merchant_accounts(email, password_hash, display_name, phone, status)
     VALUES($1,$2,$3,$4,'active')
     ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, display_name=EXCLUDED.display_name, phone=EXCLUDED.phone, status='active', deleted_at=NULL
     RETURNING id`, [a.email, hashPw(PW), a.display, a.phone]);

  // reset any prior brands/links for this account (idempotent re-run)
  await q(`UPDATE places SET brand_id=NULL WHERE brand_id IN (SELECT id FROM brands WHERE owner_account_id=$1)`, [acc.id]);
  await q(`DELETE FROM brands WHERE owner_account_id=$1`, [acc.id]);

  let firstBranch = null;
  for (const b of a.brands) {
    const [brand] = await q(
      `INSERT INTO brands(owner_account_id, merchant_id, city_id, name_i18n, brand_kind, status)
       VALUES($1,$2,$3,$4,$5,'active') RETURNING id`,
      [acc.id, a.merchantId, cityId, JSON.stringify(b.name), b.kind]);
    const linked = await q(
      `UPDATE places SET brand_id=$1, merchant_id=$2, claim_verified_at=$4 WHERE name_i18n->>'en'=$3 RETURNING id`,
      [brand.id, a.merchantId, b.branch, a.verified ? new Date() : null]);
    if (!linked.length) { console.warn(`  ! branch not found: ${b.branch}`); continue; }
    if (!firstBranch) firstBranch = linked[0].id;
  }
  await q(`UPDATE merchant_accounts SET place_id=$2, active_place_id=$2 WHERE id=$1`, [acc.id, firstBranch]);

  // optional: a pending manual-review request, so the staff /claims queue has something to approve
  await q(`DELETE FROM place_claims WHERE account_id=$1`, [acc.id]);
  if (a.manualReview && firstBranch) {
    await q(`INSERT INTO place_claims(place_id, account_id, method, status, note) VALUES($1,$2,'manual_review','pending',$3)`,
      [firstBranch, acc.id, a.manualReview]);
  }
  console.log(`✓ ${a.email}  (${a.brands.length} brands)  active_branch=${firstBranch}${a.manualReview ? '  +manual-review pending' : ''}`);
}

const [sum] = await q(`SELECT
  (SELECT count(*) FROM merchant_accounts WHERE deleted_at IS NULL) accounts,
  (SELECT count(*) FROM brands WHERE deleted_at IS NULL) brands,
  (SELECT count(*) FROM places WHERE brand_id IS NOT NULL) linked_branches`);
console.log(`merchant logins: accounts=${sum.accounts} brands=${sum.brands} linked_branches=${sum.linked_branches}  | password=${PW}`);
await pool.end();
