'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// A submit button that asks for native confirmation before its <form> submits.
// Drop it inside an existing <form action={serverAction}> in place of <button type="submit">:
// cancelling preventDefaults the click so the form never submits. window.confirm() is wired to
// a native iOS dialog by the Flutter WebView shell. Used only for irreversible actions
// (redeeming real value, withdrawing a request with no undo).
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
