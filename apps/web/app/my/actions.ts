'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { saveUploads } from '@/lib/storage';

// PUBLIC tenant-portal actions — scoped by the lease's portal_token (NOT a merchant login). The token is the
// capability: only someone with the tenant's /my link can post. Record/operational only.

/** Tenant submits a แจ้งซ่อม from /my/<token>: a detail + optional photos → an owner-visible request (status 'new'). */
export async function submitMaintenanceAction(token: string, formData: FormData) {
  if (!/^[a-f0-9]{6,64}$/.test(token || '')) redirect('/');
  const [ls] = await q<{ id: string; place_id: string; room_id: string }>(
    `SELECT id, place_id, room_id FROM stay_lease WHERE portal_token=$1 AND deleted_at IS NULL`, [token]);
  if (!ls) redirect('/');
  const detail = String(formData.get('detail') ?? '').trim().slice(0, 1000);
  if (!detail) redirect(`/my/${token}?error=empty`);
  const files = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const saved = files.length ? await saveUploads(files, 'rooms') : [];
  await q(`INSERT INTO stay_maintenance(place_id, lease_id, room_id, detail, photos, source) VALUES($1,$2,$3,$4,$5,'tenant')`,
    [ls.place_id, ls.id, ls.room_id, detail, saved]);
  revalidatePath(`/my/${token}`);
  revalidatePath('/merchant/repairs');
  redirect(`/my/${token}?ok=repair`);
}
