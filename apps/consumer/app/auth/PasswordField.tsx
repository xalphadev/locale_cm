'use client';
import { useState } from 'react';

// Password input with a show/hide eye toggle (client component — the auth forms are otherwise
// server-action-driven, so this is the one interactive bit).
export function PasswordField({ name, placeholder, autoComplete, required = true, minLength }:
  { name: string; placeholder?: string; autoComplete?: string; required?: boolean; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-pw">
      <input
        name={name}
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="auth-pw-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      >
        {show ? (
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 4M6.5 6.6A18 18 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 4-.8" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        )}
      </button>
    </div>
  );
}
