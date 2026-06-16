'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { q, withTx } from '@/lib/db';
import { hashPassword, verifyPassword, setSession, clearSession } from '@/lib/auth';

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const lang = () => { const v = cookies().get('lang')?.value; return v === 'en' || v === 'zh' ? v : 'th'; };

/** Email signup → create users + profile + credentials atomically, derive audience, log in. */
export async function signupEmailAction(formData: FormData) {
  const email = s(formData, 'email').toLowerCase();
  const pw = s(formData, 'password');
  const name = s(formData, 'name') || email.split('@')[0];
  const err = (m: string) => redirect(`/login?mode=signup&error=${encodeURIComponent(m)}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('อีเมลไม่ถูกต้อง');
  if (pw.length < 8) err('รหัสผ่านอย่างน้อย 8 ตัวอักษร');

  let uid = '';
  try {
    uid = await withTx(async (c) => {
      const u = (await c.query<{ id: string }>(
        `INSERT INTO users(id, primary_locale, auth_providers, status)
         VALUES(gen_random_uuid(), $1, '["email"]'::jsonb, 'active') RETURNING id`, [lang()])).rows[0];
      await c.query(`INSERT INTO profiles(user_id, display_name) VALUES($1,$2) ON CONFLICT (user_id) DO NOTHING`, [u.id, name]);
      await c.query(`INSERT INTO user_credentials(user_id, email, password_hash) VALUES($1,$2,$3)`, [u.id, email, hashPassword(pw)]);
      await c.query(`SELECT fn_set_audience_segment($1)`, [u.id]);
      return u.id;
    });
  } catch (e: any) {
    if (e?.code === '23505') err('อีเมลนี้ถูกใช้แล้ว');
    throw e;
  }
  setSession(uid);
  revalidatePath('/', 'layout');
  redirect('/wallet');
}

/** Email login. */
export async function loginEmailAction(formData: FormData) {
  const email = s(formData, 'email').toLowerCase();
  const pw = s(formData, 'password');
  const [cred] = await q<any>(`SELECT user_id, password_hash FROM user_credentials WHERE email=$1`, [email]);
  if (!cred || !verifyPassword(pw, cred.password_hash)) redirect('/login?error=1');
  setSession(cred.user_id);
  revalidatePath('/', 'layout');
  redirect('/wallet');
}

export async function logoutAction() {
  clearSession();
  revalidatePath('/', 'layout');
  redirect('/');
}
