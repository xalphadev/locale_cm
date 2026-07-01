'use client';
import { useState } from 'react';

// Copy a pre-composed message (e.g. a rent-due reminder) for the owner to send the tenant over LINE/SMS —
// the interim notification path, no LINE OA / Messaging API needed. "ส่งทาง LINE" opens LINE's share-to-chat
// with the text pre-filled (line.me/R/msg/text/), so it's ~one tap: owner picks the tenant's chat and sends.
export default function CopyText({ text, label, button }: { text: string; label?: string; button?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked — user can select the textarea */ }
  };
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
  return (
    <div style={{ width: '100%' }}>
      {label && <div className="note" style={{ margin: '0 0 4px' }}>{label}</div>}
      <textarea readOnly value={text} onFocus={(e) => e.currentTarget.select()} rows={5}
        style={{ width: '100%', padding: '8px 9px', border: '1px solid var(--m-line)', borderRadius: 8, fontSize: '.8rem', background: 'var(--m-surface)', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="button" className="dbtn sm primary" onClick={copy}>{copied ? 'คัดลอกแล้ว ✓' : (button || 'คัดลอกข้อความ')}</button>
        <a className="dbtn sm" href={lineUrl} target="_blank" rel="noopener">ส่งทาง LINE</a>
      </div>
    </div>
  );
}
