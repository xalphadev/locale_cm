import './globals.css';
import type { ReactNode } from 'react';
import Nav from './Nav';
import { getLocale } from '@/lib/i18n';

export const metadata = { title: 'Locale — เดินซอย เก็บแสตมป์', description: 'Nimman Cafe-Hop' };
// Single viewport meta with viewport-fit=cover so the iOS WebView exposes env(safe-area-inset-*).
// (A manual <meta> alone is overridden by Next's injected default, which omits viewport-fit.)
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' as const };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="phone">
          {children}
          <Nav />
        </div>
      </body>
    </html>
  );
}
