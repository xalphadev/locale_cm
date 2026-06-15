import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Soi Hop · Admin', description: 'Back-office over the verified ledger' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <nav className="nav">
          <span className="brand">Soi Hop · Admin</span>
          <a href="/">Dashboard</a>
          <a href="/places">Places</a>
          <a href="/agent">+ Add place</a>
          <a href="/event">+ Add event</a>
          <a href="/proposals">Review queue</a>
          <a href="/counter">Counter</a>
          <a href="/money">Money &amp; Recon</a>
        </nav>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
