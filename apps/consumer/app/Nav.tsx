'use client';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'สำรวจ', match: (p: string) => p === '/' || p.startsWith('/place') || p.startsWith('/event'),
    icon: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></> },
  { href: '/map', label: 'แผนที่', match: (p: string) => p.startsWith('/map'),
    icon: <><path d="m9 4 6 2 5-2v14l-5 2-6-2-5 2V6Z" /><path d="M9 4v14M15 6v14" /></> },
  { href: '/passport', label: 'พาสปอร์ต', match: (p: string) => p.startsWith('/passport'),
    icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6" /></> },
  { href: '/wallet', label: 'กระเป๋า', match: (p: string) => p.startsWith('/wallet'),
    icon: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14h2" /></> },
];

export default function Nav() {
  const p = usePathname() || '/';
  // Show the tab bar only on main (top-level) pages — hide it on detail/sub pages.
  if (!TABS.some((t) => t.href === p)) return null;
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <a key={t.href} href={t.href} className={t.match(p) ? 'active' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
