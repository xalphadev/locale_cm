import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './ui';

// Centered top app-bar for DEEP pages (forms, detail, sub-pages) — which the MShell does NOT give a brand bar.
// Back chevron (left) · centered title · optional right action. Sticky + frosted, mirroring the brand bar (.mtop),
// and breaks out of the .mbody padding edge-to-edge via the --mb-pt/--mb-px vars. Replaces the old .mback + .phead.
export function MTopbar({ back, backLabel, title, action }: { back: string; backLabel?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mtopbar">
      <Link className="mtopbar-back" href={back} aria-label={backLabel || 'ย้อนกลับ'}><Icon n="chevL" size={23} /></Link>
      <h1 className="mtopbar-title">{title}</h1>
      <div className="mtopbar-act">{action}</div>
    </div>
  );
}
