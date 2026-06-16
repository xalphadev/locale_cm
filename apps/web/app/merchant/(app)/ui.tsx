// Shared presentational bits for the merchant portal (server components — no client JS).
// Icon: inline-SVG set in the merchant stroke style. Thumb: an uploaded photo when present,
// else an honest branded placeholder tile (never a misleading stock photo).
import type { CSSProperties } from 'react';

const G: Record<string, JSX.Element> = {
  chevR: <path d="m9 6 6 6-6 6" />,
  chevL: <path d="m15 6-6 6 6 6" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.6a2.1 2.1 0 0 1 3 3L7 19.1l-4 1 1-4Z" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3 4M6.5 6.6A18.3 18.3 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>,
  bed: <><path d="M3 7v11M3 12h18M21 18v-6a2 2 0 0 0-2-2H9v4" /><circle cx="6.5" cy="9.5" r="1.2" /></>,
  users: <><path d="M16 18v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M21 18v-1a4 4 0 0 0-3-3.9" /></>,
  wallet: <><path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6" /><circle cx="17" cy="13" r="1.1" /></>,
  ruler: <><path d="M3 17 17 3l4 4L7 21z" /><path d="m7.5 9.5 2 2M11 6l2 2M9 13l2 2" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  check: <path d="m5 12 5 5L20 7" />,
  sofa: <><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M2 12.5a2 2 0 0 1 4 0V15h12v-2.5a2 2 0 0 1 4 0V18H2z" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  store: <><path d="M4 9 5.2 4.2A1.5 1.5 0 0 1 6.7 3h10.6a1.5 1.5 0 0 1 1.5 1.2L20 9" /><path d="M4 9h16v1.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0Z" /><path d="M5.5 13v7h13v-7" /></>,
  feed: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></>,
  pin: <><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  ext: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" /></>,
  spark: <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3z" />,
  bill: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  heart: <path d="M12 20s-7-4.6-7-9.6A3.9 3.9 0 0 1 12 7.7 3.9 3.9 0 0 1 19 10.4c0 5-7 9.6-7 9.6Z" />,
  chat: <path d="M21 11.5a7.5 7.5 0 0 1-11 6.6L4 20l1.9-5.5A7.5 7.5 0 1 1 21 11.5Z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

export function Icon({ n, size = 18, className, fill = 'none', style }: { n: string; size?: number; className?: string; fill?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{G[n]}</svg>
  );
}

/** id columns are Postgres uuid — a malformed [id] segment would throw 22P02 (→500) at query
 *  time, before the not-found guard. Pre-validate the shape so a bad id shows the friendly view. */
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');

/** Uploaded image[0] when present, else a branded placeholder tile with a category glyph. */
export function Thumb({ images, kind, alt = '' }: { images?: string[] | null; kind: 'product' | 'room' | 'post'; alt?: string }) {
  if (images && images.length) return <img src={images[0]} alt={alt} loading="lazy" />;
  return <span className="ph"><Icon n={kind === 'room' ? 'bed' : kind === 'post' ? 'feed' : 'box'} size={26} /></span>;
}
