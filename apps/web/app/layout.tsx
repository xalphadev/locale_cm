import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';

export const metadata = { title: 'Soi Hop · Admin', description: 'Back-office over the verified ledger' };

export default function RootLayout({ children }: { children: ReactNode }) {
  // The self-service merchant portal lives under /merchant with its own chrome — hide the staff nav there.
  const isMerchant = (headers().get('x-pathname') || '').startsWith('/merchant');
  if (isMerchant) {
    return <html lang="th"><body>{children}</body></html>;
  }
  return (
    <html lang="th">
      <body>
        <nav className="nav">
          <span className="brand">Soi Hop · Admin</span>
          <a href="/">Dashboard</a>
          <a href="/places">Places</a>
          <a href="/agent">+ Add place</a>
          <a href="/event">+ Add event</a>
          <a href="/post">+ โพสต์</a>
          <a href="/proposals">Review queue</a>
          <a href="/counter">Counter</a>
          <a href="/money">Money &amp; Recon</a>
          <a href="/merchant" style={{ marginLeft: 'auto' }}>ร้านค้า ↗</a>
        </nav>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
