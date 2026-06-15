'use client';
import { Icon } from './icons';

export default function ShareButton({ href, title, variant }: { href: string; title: string; variant?: 'icon' }) {
  async function onShare() {
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + href;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) await (navigator as any).share({ title, url });
      else { await navigator.clipboard.writeText(url); alert('คัดลอกลิงก์แล้ว: ' + url); }
    } catch { /* user cancelled */ }
  }
  if (variant === 'icon')
    return <button type="button" className="pa" onClick={onShare} aria-label="แชร์"><Icon n="share" size={22} /></button>;
  return <button type="button" className="post-act" onClick={onShare}><Icon n="share" size={18} /> แชร์</button>;
}
