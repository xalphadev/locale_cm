import { Client } from 'minio';
import crypto from 'crypto';

// Object-storage image uploads (MinIO / S3-compatible). Files are written to the `media` bucket
// under a typed, date-partitioned key — places/products/rooms/posts/brands/YYYY/MM/<hash>.<ext> —
// and served publicly via ASSET_PUBLIC_BASE. The only contract the consumer surfaces depend on is
// the returned URL (they render image_urls[] as plain <img src>), so dev/prod differ ONLY by env:
//   prod  ASSET_PUBLIC_BASE=https://locale-assets.xalpha.co.th   (Caddy rewrites /<key> → /media/<key>)
//   dev   ASSET_PUBLIC_BASE=http://127.0.0.1:9000/media          (MinIO direct, bucket in path)
export type UploadKind = 'places' | 'products' | 'rooms' | 'posts' | 'brands';

const MAX_BYTES = 6 * 1024 * 1024;
export const MAX_UPLOADS = 8; // saveUploads persists at most this many per call
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

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

/** key like prod/products/2026/06/<24hex>.webp — env + typed + date-partitioned for easy browse/lifecycle. */
function objectKey(kind: UploadKind, ext: string): string {
  const d = new Date();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${ENV_PREFIX}/${kind}/${d.getUTCFullYear()}/${mm}/${crypto.randomBytes(12).toString('hex')}.${ext}`;
}

/** Persist one uploaded image to object storage; returns its public URL, or null if it's empty /
 *  not an allowed image / too big. */
export async function saveUpload(file: File, kind: UploadKind): Promise<string | null> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  const ext = EXT[file.type];
  if (!ext || file.size > MAX_BYTES) return null;
  const key = objectKey(kind, ext);
  const buf = Buffer.from(await file.arrayBuffer());
  await client().putObject(BUCKET, key, buf, buf.length, { 'Content-Type': file.type });
  return `${ASSET_BASE}/${key}`;
}

/** Persist up to MAX_UPLOADS uploaded images; returns the public URLs of the ones that saved. */
export async function saveUploads(files: File[], kind: UploadKind): Promise<string[]> {
  const out: string[] = [];
  for (const f of files.slice(0, MAX_UPLOADS)) {
    const url = await saveUpload(f, kind);
    if (url) out.push(url);
  }
  return out;
}
