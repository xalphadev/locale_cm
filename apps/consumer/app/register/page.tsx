import { signupEmailAction } from '../auth/actions';
import { OAuthButtons, AUTH_ERRORS } from '../auth/OAuthButtons';

export const dynamic = 'force-dynamic';

export default function Register({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="authpage">
      <div className="auth-card">
        <a className="auth-back" href="/login">←</a>
        <div className="auth-brand">Soi Hop</div>
        <h1>สมัครสมาชิก</h1>
        <p className="auth-sub">สมัครฟรี — สะสมแต้มแต่ละร้าน เก็บที่ชอบ และร่วมกิจกรรมในแอป</p>
        {searchParams.error && <div className="auth-err">{AUTH_ERRORS[searchParams.error] || searchParams.error}</div>}

        <OAuthButtons />

        <form className="auth-form" action={signupEmailAction}>
          <input name="name" placeholder="ชื่อที่แสดง" autoComplete="name" />
          <input name="email" type="email" required placeholder="อีเมล" autoComplete="email" />
          <input name="password" type="password" required minLength={8} placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" autoComplete="new-password" />
          <button className="auth-submit" type="submit">สมัครสมาชิก</button>
        </form>

        <p className="auth-terms">การสมัครถือว่ายอมรับ <a href="/">เงื่อนไขการใช้งาน</a> และ <a href="/">นโยบายความเป็นส่วนตัว</a></p>
        <p className="auth-switch">มีบัญชีแล้ว? <a href="/login">เข้าสู่ระบบ</a></p>
      </div>
    </div>
  );
}
