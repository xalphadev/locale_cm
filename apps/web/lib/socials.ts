// Extra contact channels stored in places.socials (jsonb, migration 0046). Pure helpers — safe in both server
// pages and client forms. The owner may type a handle (@x) or a full URL; socialHref normalizes to a link.
export type SocialChannel = { key: string; label: string; ph: string; icon: string };

export const SOCIAL_CHANNELS: SocialChannel[] = [
  { key: 'facebook', label: 'Facebook', ph: 'ลิงก์เพจ หรือชื่อเพจ', icon: 'globe' },
  { key: 'instagram', label: 'Instagram', ph: '@ชื่อ หรือลิงก์', icon: 'globe' },
  { key: 'tiktok', label: 'TikTok', ph: '@ชื่อ หรือลิงก์', icon: 'globe' },
  { key: 'whatsapp', label: 'WhatsApp', ph: 'เบอร์ WhatsApp', icon: 'phone' },
];

/** Turn a stored handle/URL into a tappable link. */
export function socialHref(key: string, v: string): string {
  const s = (v || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  const h = s.replace(/^@/, '');
  if (key === 'facebook') return 'https://facebook.com/' + h;
  if (key === 'instagram') return 'https://instagram.com/' + h;
  if (key === 'tiktok') return 'https://tiktok.com/@' + h;
  if (key === 'whatsapp') return 'https://wa.me/' + s.replace(/[^0-9]/g, '');
  return s;
}
