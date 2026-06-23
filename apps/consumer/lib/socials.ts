// Mirror of apps/web/lib/socials.ts — extra contact channels stored in places.socials (jsonb, migration 0046).
// Kept per-app because the two Next apps don't share a lib dir. Display-only on the consumer side.
export type SocialChannel = { key: string; label: string; icon: string };

export const SOCIAL_CHANNELS: SocialChannel[] = [
  { key: 'facebook', label: 'Facebook', icon: 'globe' },
  { key: 'instagram', label: 'Instagram', icon: 'globe' },
  { key: 'tiktok', label: 'TikTok', icon: 'globe' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'phone' },
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
