import { enabledProviders, providerLabel } from '@/lib/oauth';

// Google / LINE buttons — rendered only for providers that have env credentials configured.
export function OAuthButtons() {
  const providers = enabledProviders();
  if (!providers.length) return null;
  return (
    <>
      <div className="auth-oauth">
        {providers.map((p) => (
          <a key={p} className={`oauthbtn ${p}`} href={`/auth/${p}`}>
            <span className="oauthbtn-ic">{p === 'google' ? 'G' : 'L'}</span>
            ดำเนินการต่อด้วย {providerLabel(p)}
          </a>
        ))}
      </div>
      <div className="auth-or"><span>หรือใช้อีเมล</span></div>
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
