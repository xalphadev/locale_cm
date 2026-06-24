'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// A submit button that asks for native confirmation before its <form> submits.
// Drop it inside an existing <form action={serverAction}> in place of <button type="submit">:
// cancelling preventDefaults the click so the form never submits; confirming lets the normal
// submit + server action proceed. window.confirm() is wired to a native iOS dialog by the
// Flutter WebView shell (see mobile/shell), so this is the established confirm mechanism — no
// action/DB change needed. Used only for destructive / irreversible / no-undo actions.
export function ConfirmSubmit({
  message,
  children,
  ...rest
}: { message: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      {...rest}
      onClick={(e) => {
        if (typeof window !== 'undefined' && !window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
