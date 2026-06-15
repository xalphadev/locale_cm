'use client';
import { Icon } from './icons';

export default function ShareButton({ href, title }: { href: string; title: string }) {
  async function onShare() {
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + href;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) await (navigator as any).share({ title, url });
      else { await navigator.clipboard.writeText(url); alert('คัดลอกลิงก์แล้ว: ' + url); }
    } catch { /* user cancelled */ }
  }
  return <button type="button" className="post-act" onClick={onShare}><Icon n="share" size={18} /> แชร์</button>;
}
