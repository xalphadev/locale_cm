import { Client } from 'minio';
import crypto from 'crypto';
import sharp from 'sharp';

// Object-storage image uploads (MinIO / S3-compatible). Each upload is resized + re-encoded to WebP
// at TWO sizes and written to the `media` bucket under an env/typed/date-partitioned key:
//   <env>/<kind>/YYYY/MM/<hash>.webp        — display (≤1280w), stored in image_urls[]
//   <env>/<kind>/YYYY/MM/<hash>_thumb.webp  — thumbnail (≤400w), for grids/cards (derive via thumb())
// Served publicly via ASSET_PUBLIC_BASE; dev/prod differ ONLY by env:
//   prod  ASSET_PUBLIC_BASE=https://locale-assets.xalpha.co.th   (Caddy rewrites /<key> → /media/<key>)
//   dev   ASSET_PUBLIC_BASE=http://127.0.0.1:9000/media          (MinIO direct, bucket in path)
export type UploadKind = 'places' | 'products' | 'rooms' | 'posts' | 'brands';

const MAX_BYTES = 12 * 1024 * 1024;   // accept large phone originals — we downscale them anyway
export const MAX_UPLOADS = 15;         // saveUploads persists at most this many per call
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DISPLAY_W = 1280;                // detail / lightbox
const THUMB_W = 400;                   // cards / grids

const BUCKET = process.env.S3_BUCKET || 'media';
const ASSET_BASE = (process.env.ASSET_PUBLIC_BASE || 'http://127.0.0.1:9000/media').replace(/\/+$/, '');
// Environment folder so dev and prod uploads never mix in the same bucket: media/<env>/<kind>/...
// Explicit ASSET_PREFIX wins; otherwise prod when built for production, dev locally.
const ENV_PREFIX = process.env.ASSET_PREFIX || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

let _client: Client | null = null;
function client(): Client {
  if (_client) return _client;
  _client = new Client({
    endPoint: process.env.S3_ENDPOINT || '127.0.0.1',
    port: Number(process.env.S3_PORT || 9000),
    useSSL: process.env.S3_USE_SSL === 'true',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
  });
  return _client;
}

/** extension-less key: <env>/<kind>/YYYY/MM/<24hex> — display/thumb append .webp / _thumb.webp */
function objectKeyBase(kind: UploadKind): string {
  const d = new Date();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${ENV_PREFIX}/${kind}/${d.getUTCFullYear()}/${mm}/${crypto.randomBytes(12).toString('hex')}`;
}

async function putWebp(key: string, buf: Buffer) {
  await client().putObject(BUCKET, key, buf, buf.length, { 'Content-Type': 'image/webp' });
}

/** Persist one uploaded image as WebP display + thumbnail; returns the DISPLAY public URL, or null if
 *  it's empty / not an allowed image / too big / unreadable. EXIF orientation is auto-applied. */
export async function saveUpload(file: File, kind: UploadKind): Promise<string | null> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  if (!ALLOWED.has(file.type) || file.size > MAX_BYTES) return null;
  const input = Buffer.from(await file.arrayBuffer());
  const base = objectKeyBase(kind);
  try {
    const [display, thumb] = await Promise.all([
      sharp(input).rotate().resize({ width: DISPLAY_W, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharp(input).rotate().resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
    ]);
    await Promise.all([putWebp(`${base}.webp`, display), putWebp(`${base}_thumb.webp`, thumb)]);
  } catch {
    return null; // unreadable / corrupt image
  }
  return `${ASSET_BASE}/${base}.webp`;
}

/** Persist up to MAX_UPLOADS uploaded images; returns the DISPLAY URLs of the ones that saved. */
export async function saveUploads(files: File[], kind: UploadKind): Promise<string[]> {
  const out: string[] = [];
  for (const f of files.slice(0, MAX_UPLOADS)) {
    const url = await saveUpload(f, kind);
    if (url) out.push(url);
  }
  return out;
}
