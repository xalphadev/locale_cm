import { loginEmailAction, signupEmailAction } from '../auth/actions';
import { enabledProviders, providerLabel } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  '1': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', state: 'เซสชันหมดอายุ ลองใหม่อีกครั้ง',
  oauth: 'เข้าสู่ระบบด้วยบัญชีนี้ไม่สำเร็จ', provider: 'ช่องทางนี้ยังไม่เปิดให้ใช้งาน',
};

export default function Login({ searchParams }: { searchParams: { mode?: string; error?: string } }) {
  const signup = searchParams.mode === 'signup';
  const providers = enabledProviders();
  return (
    <div className="authpage">
      <div className="auth-card">
        <div className="auth-brand">Soi Hop</div>
        <h1>{signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h1>
        <p className="auth-sub">{signup ? 'สมัครเพื่อสะสมแต้มร้าน เก็บที่ชอบ และร่วมกิจกรรม' : 'เข้าสู่ระบบเพื่อสะสมแต้มและจัดการบัญชีของคุณ'}</p>
        {searchParams.error && <div className="auth-err">{ERRORS[searchParams.error] || 'เกิดข้อผิดพลาด'}</div>}

        {providers.length > 0 && (
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
        )}

        <form className="auth-form" action={signup ? signupEmailAction : loginEmailAction}>
          {signup && <input name="name" placeholder="ชื่อที่แสดง" autoComplete="name" />}
          <input name="email" type="email" required placeholder="อีเมล" autoComplete="email" />
          <input name="password" type="password" required minLength={signup ? 8 : undefined}
            placeholder={signup ? 'รหัสผ่าน (อย่างน้อย 8 ตัว)' : 'รหัสผ่าน'} autoComplete={signup ? 'new-password' : 'current-password'} />
          <button className="auth-submit" type="submit">{signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button>
        </form>

        <p className="auth-switch">
          {signup ? <>มีบัญชีแล้ว? <a href="/login">เข้าสู่ระบบ</a></> : <>ยังไม่มีบัญชี? <a href="/login?mode=signup">สมัครสมาชิก</a></>}
        </p>
        <p className="auth-skip"><a href="/">ข้ามไปก่อน — ดูแบบไม่ล็อกอิน</a></p>
      </div>
    </div>
  );
}
