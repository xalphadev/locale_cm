import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Local-disk image storage for dev. Files are written under apps/web/.uploads and served by
// app/uploads/[name]/route.ts. For production, swap the body of saveUpload() for Supabase Storage
// (supabase.storage.from(bucket).upload(name, buf) → getPublicUrl) — the URL shape is the only contract
// the consumer surfaces depend on (they render image_urls[] as plain <img src>).
export const UPLOAD_DIR = path.join(process.cwd(), '.uploads');
const PUBLIC_BASE = process.env.WEB_PUBLIC_BASE || 'http://127.0.0.1:3002';
const MAX_BYTES = 6 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/** Persist one uploaded image; returns its public URL, or null if it's empty / not an allowed image / too big. */
export async function saveUpload(file: File): Promise<string | null> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  const ext = EXT[file.type];
  if (!ext || file.size > MAX_BYTES) return null;
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `${PUBLIC_BASE}/uploads/${name}`;
}

/** Persist up to 8 uploaded images; returns the public URLs of the ones that saved. */
export async function saveUploads(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files.slice(0, 8)) {
    const url = await saveUpload(f);
    if (url) out.push(url);
  }
  return out;
}
