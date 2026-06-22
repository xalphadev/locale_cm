import Link from 'next/link';
import { loginEmailAction } from '../auth/actions';
import { OAuthButtons, AUTH_ERRORS } from '../auth/OAuthButtons';
import { PasswordField } from '../auth/PasswordField';

export const dynamic = 'force-dynamic';

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="authpage">
      <div className="auth-card">
        <div className="auth-head">
          <h1>เข้าสู่ระบบ</h1>
          <p className="auth-sub">ยินดีต้อนรับกลับมา! เราคิดถึงคุณ</p>
        </div>
        {searchParams.error && <div className="auth-err">{AUTH_ERRORS[searchParams.error] || 'เกิดข้อผิดพลาด'}</div>}

        <form className="auth-form" action={loginEmailAction}>
          <div className="auth-field">
            <label>อีเมล</label>
            <input name="email" type="email" required placeholder="example@gmail.com" autoComplete="email" />
          </div>
          <div className="auth-field">
            <label>รหัสผ่าน</label>
            <PasswordField name="password" placeholder="••••••••" autoComplete="current-password" />
            <a className="auth-forgot" href="#">ลืมรหัสผ่าน?</a>
          </div>
          <button className="auth-submit" type="submit">เข้าสู่ระบบ</button>
        </form>

        <OAuthButtons mode="signin" />

        <p className="auth-switch">ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิก</Link></p>
      </div>
    </div>
  );
}
