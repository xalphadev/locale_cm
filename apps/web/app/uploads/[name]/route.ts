import { promises as fs } from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const TYPE: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

// Serve a locally-stored upload. The name is a generated 24-hex + safe ext, validated to block traversal.
export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = params.name;
  if (!/^[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, name));
    const ext = name.split('.').pop()!;
    return new Response(buf, {
      headers: { 'content-type': TYPE[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
