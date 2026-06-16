import { loginEmailAction } from '../auth/actions';
import { OAuthButtons, AUTH_ERRORS } from '../auth/OAuthButtons';

export const dynamic = 'force-dynamic';

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="authpage">
      <div className="auth-card">
        <a className="auth-back" href="/">←</a>
        <div className="auth-brand">Locale</div>
        <h1>เข้าสู่ระบบ</h1>
        <p className="auth-sub">เข้าสู่ระบบเพื่อสะสมแต้มร้าน เก็บที่ชอบ และร่วมกิจกรรม</p>
        {searchParams.error && <div className="auth-err">{AUTH_ERRORS[searchParams.error] || 'เกิดข้อผิดพลาด'}</div>}

        <OAuthButtons />

        <form className="auth-form" action={loginEmailAction}>
          <input name="email" type="email" required placeholder="อีเมล" autoComplete="email" />
          <input name="password" type="password" required placeholder="รหัสผ่าน" autoComplete="current-password" />
          <button className="auth-submit" type="submit">เข้าสู่ระบบ</button>
        </form>

        <p className="auth-switch">ยังไม่มีบัญชี? <a href="/register">สมัครสมาชิก</a></p>
        <p className="auth-skip"><a href="/">ข้ามไปก่อน — ดูแบบไม่ล็อกอิน</a></p>
      </div>
    </div>
  );
}
