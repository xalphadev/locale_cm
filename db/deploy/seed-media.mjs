// seed-media.mjs — give the seeded content REAL images hosted in MinIO, so the demo exercises the
// exact object-storage pipeline merchants use (apps/web/lib/storage.ts) + populates the bucket with
// the same typed/date-partitioned key layout: media/{products,posts,rooms}/YYYY/MM/<hash>.<ext>.
//
// Targets the three tables that actually carry image_urls[] (= the three merchant upload kinds):
//   shop_products → 'products' · feed_posts → 'posts' · stay_units → 'rooms'
// (places have no own photo column by design — their hero is a generated category cover.)
//
// Idempotent: only fills rows whose image_urls is empty/null. Photos come from picsum.photos
// (deterministic by row id); if the network is unavailable it falls back to a generated SVG cover —
// so a deploy NEVER fails on image seeding.
//
// Run (after seed-shops.mjs), from apps/web so node_modules resolve:
//   cd apps/web && DATABASE_URL=... ASSET_PUBLIC_BASE=... S3_ENDPOINT=... S3_ACCESS_KEY=... \
//     S3_SECRET_KEY=... node ../../db/deploy/seed-media.mjs
import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const pg = require('pg');
const { Client } = require('minio');
const sharp = require('sharp');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:54400/locale' });
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

const BUCKET = process.env.S3_BUCKET || 'media';
const ASSET_BASE = (process.env.ASSET_PUBLIC_BASE || 'http://127.0.0.1:9000/media').replace(/\/+$/, '');
const ENV_PREFIX = process.env.ASSET_PREFIX || 'dev';   // prod seeder sets ASSET_PREFIX=prod (compose)
const mc = new Client({
  endPoint: process.env.S3_ENDPOINT || '127.0.0.1',
  port: Number(process.env.S3_PORT || 9000),
  useSSL: process.env.S3_USE_SSL === 'true',
  accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
});

/** Ensure the public-read media bucket exists (deploy.sh also does this; safe to repeat). */
async function ensureBucket() {
  if (!(await mc.bucketExists(BUCKET))) await mc.makeBucket(BUCKET);
  const policy = {
    Version: '2012-10-17',
    Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${BUCKET}/*`] }],
  };
  await mc.setBucketPolicy(BUCKET, JSON.stringify(policy));
}

const PALETTE = { eat: ['#f59e0b', '#b45309'], shop: ['#10b981', '#065f46'], stay: ['#6366f1', '#3730a3'], default: ['#0ea5e9', '#0369a1'] };
function svgCover(label, kindHint) {
  const [c1, c2] = PALETTE[kindHint] || PALETTE.default;
  const safe = String(label || 'Locale').slice(0, 22).replace(/[<&>]/g, '');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="800" height="600" fill="url(#g)"/>` +
      `<text x="40" y="540" font-family="sans-serif" font-size="34" fill="#ffffff" opacity="0.95">${safe}</text>` +
      `<text x="40" y="80" font-family="sans-serif" font-size="20" fill="#ffffff" opacity="0.7">Locale</text>` +
      `</svg>`,
    'utf8',
  );
}

/** Fetch a deterministic stock photo; fall back to an SVG cover if the network fails. */
async function coverImage(seed, label, kindHint) {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(`https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`, { signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`picsum ${res.status}`);
    return { buf: Buffer.from(await res.arrayBuffer()), ext: 'jpg', mime: 'image/jpeg' };
  } catch {
    return { buf: svgCover(label, kindHint), ext: 'svg', mime: 'image/svg+xml' };
  }
}

async function put(kind, seed, label, kindHint) {
  const { buf } = await coverImage(seed, label, kindHint);
  const d = new Date();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const base = `${ENV_PREFIX}/${kind}/${d.getUTCFullYear()}/${mm}/${crypto.randomBytes(12).toString('hex')}`;
  // mirror apps/web/lib/storage.ts: WebP display (≤1280w) + thumbnail (≤400w)
  const [display, thumb] = await Promise.all([
    sharp(buf).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    sharp(buf).rotate().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
  ]);
  await mc.putObject(BUCKET, `${base}.webp`, display, display.length, { 'Content-Type': 'image/webp' });
  await mc.putObject(BUCKET, `${base}_thumb.webp`, thumb, thumb.length, { 'Content-Type': 'image/webp' });
  return `${ASSET_BASE}/${base}.webp`;
}

const empty = `(image_urls IS NULL OR array_length(image_urls,1) IS NULL)`;

async function main() {
  await ensureBucket();
  let n = 0;

  // products → 'products'
  const products = await q(
    `SELECT sp.id, sp.name_i18n->>'th' AS name, p.category::text AS cat
       FROM shop_products sp JOIN places p ON p.id = sp.place_id
      WHERE ${empty}`);
  for (const r of products) {
    const url = await put('products', `prod-${r.id}`, r.name, r.cat === 'eat' ? 'eat' : 'shop');
    await q(`UPDATE shop_products SET image_urls = ARRAY[$2], image_count = 1 WHERE id = $1`, [r.id, url]);
    n++;
  }

  // feed posts → 'posts'
  const posts = await q(
    `SELECT fp.id, p.name_i18n->>'th' AS name, p.category::text AS cat
       FROM feed_posts fp JOIN places p ON p.id = fp.place_id
      WHERE ${empty}`);
  for (const r of posts) {
    const url = await put('posts', `post-${r.id}`, r.name, r.cat === 'eat' ? 'eat' : 'shop');
    await q(`UPDATE feed_posts SET image_urls = ARRAY[$2], image_count = 1 WHERE id = $1`, [r.id, url]);
    n++;
  }

  // stay units → 'rooms'
  const rooms = await q(`SELECT su.id, su.name_i18n->>'th' AS name FROM stay_units su WHERE ${empty}`);
  for (const r of rooms) {
    const url = await put('rooms', `room-${r.id}`, r.name, 'stay');
    await q(`UPDATE stay_units SET image_urls = ARRAY[$2], image_count = 1 WHERE id = $1`, [r.id, url]);
    n++;
  }

  console.log(`── seed-media: uploaded ${n} cover images to bucket "${BUCKET}" (products=${products.length} posts=${posts.length} rooms=${rooms.length}) ──`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
