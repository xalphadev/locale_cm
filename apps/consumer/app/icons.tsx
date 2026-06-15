import type { CSSProperties } from 'react';

// Hand-built stroke icon set (24×24, currentColor) — NO emoji anywhere in the app.
const P: Record<string, JSX.Element> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9Z" /><path d="M10.3 20.5a2 2 0 0 0 3.4 0" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  pin: <><path d="M19 10c0 5.5-7 11-7 11s-7-5.5-7-11a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  chevR: <path d="m9 6 6 6-6 6" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  back: <><path d="M19 12H5" /><path d="m11 19-7-7 7-7" /></>,
  star: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />,
  bookmark: <path d="M18 21l-6-3.6L6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>,
  phone: <path d="M21 16.5v2.6a2 2 0 0 1-2.2 2 18 18 0 0 1-7.8-2.8 17.6 17.6 0 0 1-5.4-5.4A18 18 0 0 1 2.8 5.1 2 2 0 0 1 4.8 3h2.6a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8.4 12a16 16 0 0 0 5.5 5.5l1.6-1.1a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17 13 13 0 0 1 0-17Z" /></>,
  chat: <path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />,
  directions: <path d="M11 3 3 11.5l8 8.5 8-8.5L11 3Zm0 6v3h4" />,
  sparkles: <path d="m12 3 1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3Z" />,
  ticket: <path d="M4 7a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 7a2 2 0 0 0 0 4 1.5 1.5 0 0 1 0 3 2 2 0 0 0 0 4 1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17a2 2 0 0 0 0-4 1.5 1.5 0 0 1 0-3 2 2 0 0 0 0-4Z" />,
  wallet: <><path d="M4 8a2 2 0 0 1 2-2h12v3" /><path d="M4 8v8a2 2 0 0 0 2 2h13v-4" /><path d="M19 11a2 2 0 0 0 0 4h2v-4Z" /></>,
  compass: <><circle cx="12" cy="12" r="8.5" /><path d="m15 9-2 5-4 2 2-5 4-2Z" /></>,
  gift: <><path d="M5 11h14v9H5z" /><path d="M3 7.5h18V11H3zM12 7.5V20" /><path d="M12 7.5C12 5 10.5 4 9 4.5S9 7.5 12 7.5ZM12 7.5C12 5 13.5 4 15 4.5S15 7.5 12 7.5Z" /></>,
  check: <path d="m20 7-11 11-5-5" />,
  // categories
  coffee: <><path d="M17 8h1.5a3 3 0 0 1 0 6H17" /><path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M7 2v2.5M11 2v2.5" /></>,
  bowl: <><path d="M3 11h18a9 9 0 0 1-18 0Z" /><path d="M12 4.5c-2 0-2 1.5-2 1.5M12 6.5V4.5" /></>,
  flame: <path d="M12 3s4 3.5 4 8a4 4 0 0 1-8 0c0-1 .4-1.8.4-1.8S8 11 9.5 11C11 11 10 8 12 3Z" />,
  cake: <><path d="M4 21v-7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7" /><path d="M4 16h16" /><path d="M12 8V5.5" /><circle cx="12" cy="4" r="1" /></>,
  landmark: <><path d="M3 21h18" /><path d="M5 21V10l7-4.5L19 10v11" /><path d="M9.5 21v-5h5v5" /></>,
  palette: <><circle cx="12" cy="12" r="8.5" /><circle cx="8.5" cy="10" r="1.1" /><circle cx="12" cy="8" r="1.1" /><circle cx="15.5" cy="10" r="1.1" /></>,
  flower: <><circle cx="12" cy="12" r="2.5" /><path d="M12 9.5V5M12 14.5V19M9.5 12H5M14.5 12H19" /></>,
  dumbbell: <path d="M6.5 7v10M18 7v10M4 9.5v5M20.5 9.5v5M6.5 12H18" />,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  map: <><path d="m9 4 6 2 5.4-2.2A.5.5 0 0 1 21 4.3v13.4a1 1 0 0 1-.6.9L15 21l-6-2-5.4 2.2A.5.5 0 0 1 3 20.7V7.3a1 1 0 0 1 .6-.9Z" /><path d="M9 4v15M15 6v15" /></>,
  locate: <><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

export function Icon({ n, size = 22, fill = 'none', style, className }:
  { n: string; size?: number; fill?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}
      aria-hidden="true">{P[n] ?? P.compass}</svg>
  );
}

export const CAT_ICON: Record<string, string> = {
  eat: 'bowl', see: 'landmark', do: 'palette',
  cafe: 'coffee', restaurant: 'bowl', street_food: 'flame', dessert: 'cake', bar: 'coffee',
  temple: 'landmark', viewpoint: 'pin', market: 'bowl', museum: 'landmark',
  cooking_class: 'flame', spa: 'flower', muay_thai: 'dumbbell', workshop: 'palette',
};
export const KIND_ICON: Record<string, string> = {
  festival: 'sparkles', market: 'bowl', performance: 'palette', workshop: 'palette', seasonal: 'calendar',
};
