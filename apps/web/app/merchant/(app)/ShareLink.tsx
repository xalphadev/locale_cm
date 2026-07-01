'use client';
import { useState } from 'react';

// Copy-able public link (bill link or tenant portal link) for the owner to paste into LINE/SMS.
// Hidden in print (wrap in .print-bar where used).
export default function ShareLink({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked — user can select the field */ }
  };
  return (
    <div style={{ width: '100%' }}>
      <div className="note" style={{ margin: '0 0 4px' }}>{label || 'ลิงก์ส่งผู้เช่า (เปิดได้โดยไม่ต้องล็อกอิน) — ก๊อปไปวางใน LINE/SMS'}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid var(--m-line)', borderRadius: 8, fontSize: '.8rem', background: 'var(--m-surface)' }} />
        <button type="button" className="dbtn sm primary" onClick={copy}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</button>
        <a className="dbtn sm" href={url} target="_blank" rel="noopener">เปิด</a>
      </div>
    </div>
  );
}
