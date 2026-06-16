// Shared presentational bits for the platform admin console (server components — no client JS).
// Icon: an inline-SVG set in the admin stroke style. PageHead / H2: consistent page chrome
// so every back-office screen shares one header + section-title treatment.
import type { CSSProperties, ReactNode } from 'react';

const G: Record<string, JSX.Element> = {
  pulse: <path d="M3 12h4l2.5 6 4-13L17 12h4" />,
  pin: <><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  feed: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></>,
  inbox: <><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M3 13h5l1.5 3h5L21 13" /></>,
  store: <><path d="M4 9 5.2 4.2A1.5 1.5 0 0 1 6.7 3h10.6a1.5 1.5 0 0 1 1.5 1.2L20 9" /><path d="M4 9h16v1.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0Z" /><path d="M5.5 13v7h13v-7" /></>,
  receipt: <><path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3Z" /><path d="M9 8h6M9 12h6" /></>,
  wallet: <><path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6" /><circle cx="17" cy="13" r="1.1" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  spark: <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3z" />,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
  users: <><path d="M16 18v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M21 18v-1a4 4 0 0 0-3-3.9" /></>,
  ledger: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
  ext: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" /></>,
};

export function Icon({ n, size = 18, style }: { n: string; size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">{G[n]}</svg>
  );
}

/** One consistent page header: glyph tile + title (+ optional count badge) + subtitle + right-side action. */
export function PageHead({ icon, title, sub, count, action }: {
  icon: string; title: ReactNode; sub?: ReactNode; count?: number | string; action?: ReactNode;
}) {
  return (
    <div className="adm-head">
      <div className="adm-head-ic"><Icon n={icon} size={22} /></div>
      <div className="adm-head-tx">
        <h1>{title}{count !== undefined && count !== '' && <span className="adm-count">{count}</span>}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="adm-head-act">{action}</div>}
    </div>
  );
}

/** Section title with a small leading glyph, matching the page header style. */
export function H2({ icon, children }: { icon?: string; children: ReactNode }) {
  return <h2>{icon && <span className="h2-ic"><Icon n={icon} size={15} /></span>}{children}</h2>;
}
