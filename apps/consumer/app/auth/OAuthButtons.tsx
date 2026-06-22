import Link from 'next/link';
// Social sign-in row (ref-style circles) — the app's real providers: Google + LINE.
// A provider without env credentials degrades gracefully (/auth/<p> → "ช่องทางนี้ยังไม่เปิด").

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.32" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22" />
      <path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96l3.34-2.58" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2 8.13 2 4.79 4.22 3.07 7.52l3.34 2.58C7.2 7.74 9.4 5.98 12 5.98" />
    </svg>
  );
}
function LineLogo() {
  // white speech bubble (LINE mark) — sits on the green circle (.auth-soc.line)
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M19.5 10.4c0-3.4-3.4-6.1-7.5-6.1S4.5 7 4.5 10.4c0 3 2.7 5.6 6.3 6.1.25.05.58.16.67.37.08.2.05.5.03.7 0 0-.09.54-.11.66-.03.2-.16.78.68.43.85-.36 4.56-2.68 6.22-4.6 1.14-1.26 1.69-2.53 1.69-4.06Z" />
    </svg>
  );
}

const SOCIALS = [
  { id: 'google', cls: '', href: '/auth/google', label: 'Google', Logo: GoogleLogo },
  { id: 'line', cls: 'line', href: '/auth/line', label: 'LINE', Logo: LineLogo },
];

export function OAuthButtons({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  return (
    <>
      <div className="auth-or"><span>{mode === 'signup' ? 'หรือสมัครด้วย' : 'หรือเข้าสู่ระบบด้วย'}</span></div>
      <div className="auth-social">
        {SOCIALS.map(({ id, cls, href, label, Logo }) => (
          <Link key={id} className={`auth-soc ${cls}`} href={href} aria-label={`ดำเนินการต่อด้วย ${label}`}>
            <Logo />
          </Link>
        ))}
      </div>
    </>
  );
}

export const AUTH_ERRORS: Record<string, string> = {
  '1': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  name: 'กรุณากรอกชื่อ',
  state: 'เซสชันหมดอายุ ลองใหม่อีกครั้ง',
  oauth: 'เข้าสู่ระบบด้วยบัญชีนี้ไม่สำเร็จ',
  provider: 'ช่องทางนี้ยังไม่เปิดให้ใช้งาน',
};
