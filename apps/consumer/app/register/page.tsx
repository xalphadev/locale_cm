import Link from 'next/link';
import { signupEmailAction } from '../auth/actions';
import { OAuthButtons, AUTH_ERRORS } from '../auth/OAuthButtons';
import { PasswordField } from '../auth/PasswordField';

export const dynamic = 'force-dynamic';

export default function Register({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="authpage">
      <div className="auth-card">
        <div className="auth-head">
          <h1>สมัครสมาชิก</h1>
          <p className="auth-sub">กรอกข้อมูลด้านล่าง หรือสมัครด้วยบัญชีโซเชียล</p>
        </div>
        {searchParams.error && <div className="auth-err">{AUTH_ERRORS[searchParams.error] || searchParams.error}</div>}

        <form className="auth-form" action={signupEmailAction}>
          <div className="auth-field">
            <label>ชื่อที่แสดง</label>
            <input name="name" placeholder="เช่น สมชาย ใจดี" autoComplete="name" />
          </div>
          <div className="auth-field">
            <label>อีเมล</label>
            <input name="email" type="email" required placeholder="example@gmail.com" autoComplete="email" />
          </div>
          <div className="auth-field">
            <label>รหัสผ่าน</label>
            <PasswordField name="password" minLength={8} placeholder="อย่างน้อย 8 ตัว" autoComplete="new-password" />
          </div>
          <label className="auth-agree">
            <input type="checkbox" required />
            <span>ยอมรับ <a href="#">เงื่อนไขการใช้งาน</a> และ <a href="#">นโยบายความเป็นส่วนตัว</a></span>
          </label>
          <button className="auth-submit" type="submit">สมัครสมาชิก</button>
        </form>

        <OAuthButtons mode="signup" />

        <p className="auth-switch">มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link></p>
      </div>
    </div>
  );
}
