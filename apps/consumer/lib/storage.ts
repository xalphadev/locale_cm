import { Client } from 'minio';
import crypto from 'crypto';

// Minimal object storage for transfer SLIPS (online-booking payment). Unlike the web app's image
// pipeline, slips are stored AS-IS (no resize / webp) — they're proof documents, kept legible for the
// host to verify. Shares the same MinIO/S3 bucket + ASSET_PUBLIC_BASE as the web app (env copied).
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const BUCKET = process.env.S3_BUCKET || 'media';
const ASSET_BASE = (process.env.ASSET_PUBLIC_BASE || 'http://127.0.0.1:9000/media').replace(/\/+$/, '');
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

/** Store a payment slip as-is; returns the public URL, or null if missing / not an allowed image / too big. */
export async function saveSlip(file: File): Promise<string | null> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  const ext = ALLOWED[file.type];
  if (!ext || file.size > MAX_BYTES) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  const d = new Date();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const key = `${ENV_PREFIX}/slips/${d.getUTCFullYear()}/${mm}/${crypto.randomBytes(12).toString('hex')}.${ext}`;
  try {
    await client().putObject(BUCKET, key, buf, buf.length, { 'Content-Type': file.type });
  } catch {
    return null;
  }
  return `${ASSET_BASE}/${key}`;
}
