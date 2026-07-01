import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Icon } from './adm-ui';

export const metadata = { title: 'Locale · Admin', description: 'Back-office over the verified ledger' };
// Emit a SINGLE viewport meta with viewport-fit=cover (so iOS WebView env(safe-area-inset-*) is non-zero).
// Without this, Next injects its own default viewport WITHOUT viewport-fit, which wins over a manual <meta>.
// maximumScale=1 + userScalable=false → this is a native-feeling app, NOT a zoomable web page: WKWebView
// must not pinch/double-tap zoom (it left the UI scaled-up + clipped).
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover' as const };

// Sidebar IA, grouped by job-to-be-done. cap-free; staff see all sections.
const NAV: { grp: string; items: { href: string; icon: string; label: string; match: (p: string) => boolean }[] }[] = [
  { grp: 'ภาพรวม', items: [
    { href: '/', icon: 'pulse', label: 'แดชบอร์ด', match: (p) => p === '/' },
  ] },
  { grp: 'แคตตาล็อก', items: [
    { href: '/places', icon: 'pin', label: 'สถานที่', match: (p) => p.startsWith('/places') },
    { href: '/agent', icon: 'plus', label: 'เพิ่มสถานที่', match: (p) => p.startsWith('/agent') },
    { href: '/event', icon: 'calendar', label: 'เพิ่มกิจกรรม', match: (p) => p.startsWith('/event') },
    { href: '/post', icon: 'feed', label: 'โพสต์ลงฟีด', match: (p) => p.startsWith('/post') },
  ] },
  { grp: 'ปฏิบัติการ', items: [
    { href: '/proposals', icon: 'inbox', label: 'คิวรออนุมัติ', match: (p) => p.startsWith('/proposals') },
    { href: '/claims', icon: 'shield', label: 'ยืนยันเจ้าของร้าน', match: (p) => p.startsWith('/claims') },
    { href: '/reports', icon: 'shield', label: 'รายงาน & fraud', match: (p) => p.startsWith('/reports') },
    { href: '/shops', icon: 'store', label: 'ร้านสมัคร', match: (p) => p.startsWith('/shops') },
    { href: '/counter', icon: 'receipt', label: 'เคาน์เตอร์แลกรางวัล', match: (p) => p.startsWith('/counter') },
  ] },
  { grp: 'การเงิน', items: [
    { href: '/money', icon: 'wallet', label: 'การเงิน & กระทบยอด', match: (p) => p.startsWith('/money') },
    { href: '/payouts', icon: 'wallet', label: 'คำขอถอนเงิน', match: (p) => p.startsWith('/payouts') },
  ] },
];

function FontHead({ merchant }: { merchant?: boolean }) {
  // Prompt (Google, Thai + Latin) across merchant + admin so the whole product shares one typeface.
  const href = merchant
    ? 'https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&display=swap'
    : 'https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800;900&display=swap';
  return (
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={href} rel="stylesheet" />
    </head>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // The self-service merchant portal lives under /merchant with its own phone-app chrome — hide the staff shell there.
  const path = headers().get('x-pathname') || '/';
  if (path.startsWith('/merchant')) {
    return (
      <html lang="th">
        <FontHead merchant />
        <body className="merchant-root">{children}</body>
      </html>
    );
  }
  // Public tenant-facing pages — the bill link (/bill/<token>) + the tenant portal (/my/<token>): no staff
  // shell, no auth; reuse the merchant CSS scope.
  if (path.startsWith('/bill') || path.startsWith('/my')) {
    return (
      <html lang="th">
        <FontHead merchant />
        <body className="merchant-root">{children}</body>
      </html>
    );
  }
  return (
    <html lang="th">
      <FontHead />
      <body className="adm">
        <div className="adm-shell">
          <aside className="adm-side">
            <div className="adm-brand">
              <span className="adm-brand-mk">S</span>
              <span className="adm-brand-tx"><b>Locale</b><span>Admin console</span></span>
            </div>
            {NAV.map((g) => (
              <div key={g.grp}>
                <div className="adm-grp">{g.grp}</div>
                {g.items.map((it) => (
                  <a key={it.href} href={it.href} className={`adm-na ${it.match(path) ? 'on' : ''}`}>
                    <Icon n={it.icon} size={19} /><span>{it.label}</span>
                  </a>
                ))}
              </div>
            ))}
            <div className="adm-side-foot">
              <a href="/merchant" className="adm-na ext"><span>พอร์ทัลร้านค้า</span><Icon n="ext" size={16} /></a>
            </div>
          </aside>
          <div className="adm-main"><div className="adm-content">{children}</div></div>
        </div>
      </body>
    </html>
  );
}
