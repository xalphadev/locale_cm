'use client';
import { useState } from 'react';
import { Icon } from '../../ui';

// A small "?" that opens a centered modal — used to move long explanations OUT of the form into on-demand
// help, one per field. Reuses the merchant .hubpop modal styles.
export function InfoTip({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="hubinfo" style={{ margin: '0 0 0 6px' }} aria-label={title} onClick={(e) => { e.preventDefault(); setOpen(true); }}>?</button>
      {open && (
        <div className="hubpop-scrim" onClick={() => setOpen(false)}>
          <div className="hubpop" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="hubpop-h">
              <span>{title}</span>
              <button type="button" className="hubpop-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={16} /></button>
            </div>
            <p className="hubpop-body">{body}</p>
          </div>
        </div>
      )}
    </>
  );
}
