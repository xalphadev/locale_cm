import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Soi Hop — เดินซอย เก็บแสตมป์', description: 'Nimman Cafe-Hop' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <div className="phone">
          {children}
          <nav className="nav">
            <a href="/"><span className="ic">🧭</span>Discover</a>
            <a href="/passport"><span className="ic">📕</span>Passport</a>
            <a href="/wallet"><span className="ic">👛</span>Wallet</a>
          </nav>
        </div>
      </body>
    </html>
  );
}
