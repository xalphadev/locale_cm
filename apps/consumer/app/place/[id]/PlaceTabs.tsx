'use client';
import { useState, type ReactNode } from 'react';

/** Segmented tabs for the place detail (รายละเอียด / รูปภาพ / รีวิว) — switches content like the ref.
 *  Each panel is server-rendered and passed in as a prop; only the active one is shown. */
export function PlaceTabs({ about, gallery, review, reviewCount = 0 }: {
  about: ReactNode; gallery: ReactNode; review: ReactNode; reviewCount?: number;
}) {
  const [tab, setTab] = useState<'about' | 'gallery' | 'review'>('about');
  const TABS: [typeof tab, string][] = [
    ['about', 'รายละเอียด'], ['gallery', 'รูปภาพ'], ['review', `รีวิว${reviewCount ? ` (${reviewCount})` : ''}`],
  ];
  return (
    <>
      <div className="ptabs">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={`ptab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="ptab-panel">
        {tab === 'about' ? about : tab === 'gallery' ? gallery : review}
      </div>
    </>
  );
}
