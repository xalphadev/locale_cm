import { cookies } from 'next/headers';

export type Locale = 'th' | 'en' | 'zh';

/** Current UI language from the `lang` cookie (server-side, request-scoped). Defaults to Thai. */
export function getLocale(): Locale {
  try {
    const v = cookies().get('lang')?.value;
    if (v === 'en' || v === 'zh' || v === 'th') return v;
  } catch { /* outside request scope */ }
  return 'th';
}

/** Pick a string out of an i18n jsonb object in the visitor's language (falls back en → th → any). */
export function i18n(j: any, locale?: Locale): string {
  if (!j) return '';
  const loc = locale || getLocale();
  return j[loc] || j.en || j.th || (Object.values(j)[0] as string) || '';
}
