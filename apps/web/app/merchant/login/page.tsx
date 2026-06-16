import { loginAction } from '../actions';

export const dynamic = 'force-dynamic';

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="portal-auth">
      <div className="pa-brand">Soi Hop · ร้านค้า</div>
      <h1>เข้าสู่ระบบร้านค้า</h1>
      {searchParams?.error && <div className="banner-err">อีเมลหรือรหัสผ่านไม่ถูกต้อง</div>}
      <form className="form" action={loginAction}>
        <div className="field"><label>อีเมล</label><input name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label>รหัสผ่าน</label><input name="password" type="password" required autoComplete="current-password" /></div>
        <button className="btn btn-primary mform-save" type="submit">เข้าสู่ระบบ</button>
      </form>
      <p className="note">ยังไม่มีบัญชี? <a href="/merchant/signup">สมัครร้านใหม่</a> · <a href="/merchant/claim">เคลมร้านที่มีในระบบ</a></p>
    </div>
  );
}
