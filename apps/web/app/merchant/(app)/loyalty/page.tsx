import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { createLoyaltyProgramAction, deleteRewardAction } from '../../actions';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = { free_item: 'ของแถม', discount: 'ส่วนลด', privilege: 'สิทธิพิเศษ' };

// Loyalty home — sets up the brand's Stamp program (one decision) or manages it.
export default async function Loyalty({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const [prog] = await q<any>(
    `SELECT id, points_name_i18n FROM stamp_programs WHERE brand_id=$1 AND status='active'`, [acc.brand_id]);

  // ── no program yet → the ONE-decision setup ──
  if (!prog) {
    return (
      <>
        <h1 className="phead"><span className="phead-ic"><Icon n="spark" size={18} /></span> แต้มสะสมของร้าน</h1>
        <p className="note" style={{ margin: '.1rem 0 1rem' }}>สร้างบัตรสะสมแต้มดิจิทัลให้ร้าน — ลูกค้าเช็คอินสะสมแต้ม ครบแล้วแลกของรางวัลที่คุณตั้งเอง (คุณแจกเป็น “ของ” ของร้าน ไม่ต้องวางเงิน)</p>
        {searchParams?.error === 'reward' && <div className="banner-err">กรุณากรอกของรางวัล</div>}
        <form className="form mform" action={createLoyaltyProgramAction}>
          <section className="fsec">
            <div className="fsec-h"><span className="fsec-ic"><Icon n="spark" size={15} /></span> ตั้งโปรแกรม (ตอบคำถามเดียว)</div>
            <div className="lset">
              <span>ลูกค้าได้</span>
              <input name="reward_name" required placeholder="กาแฟฟรี 1 แก้ว" />
              <span>เมื่อเช็คอินครบ</span>
              <input name="visits" type="number" defaultValue="6" min="1" max="99" inputMode="numeric" />
              <span>ครั้ง</span>
            </div>
            <div className="field" style={{ marginTop: '.9rem' }}><label>เรียกแต้มของร้านว่า</label>
              <input name="points_name" defaultValue="แต้ม" placeholder="แต้ม / ดาว / ดวงตรา" />
            </div>
            <p className="fhint">เพิ่มของรางวัล/สิทธิพิเศษอื่น ๆ ได้ทีหลัง — ตอนนี้เริ่มจากอันเดียวก่อนก็พอ</p>
          </section>
          <button className="btn btn-primary mform-save" type="submit">เริ่มโปรแกรมสะสมแต้ม →</button>
        </form>
      </>
    );
  }

  // ── has a program → manage ──
  const pointsName = i18n(prog.points_name_i18n) || 'แต้ม';
  const rewards = await q<any>(
    `SELECT id, title_i18n, kind, cost_stamps, redeemed_count
       FROM stamp_rewards WHERE brand_id=$1 AND status='active' ORDER BY cost_stamps, sort`, [acc.brand_id]);
  const [stats] = await q<any>(
    `SELECT (SELECT count(*) FROM stamp_balances WHERE brand_id=$1 AND balance>0)        members,
            (SELECT COALESCE(sum(balance),0) FROM stamp_balances WHERE brand_id=$1)       outstanding,
            (SELECT COALESCE(sum(redeemed_count),0) FROM stamp_rewards WHERE brand_id=$1) redeemed`, [acc.brand_id]);

  return (
    <>
      <div className="listhead"><h1>แต้มสะสมของร้าน</h1>
        <a className="addbtn" href="/merchant/loyalty/rewards/new"><Icon n="plus" size={15} /> รางวัล</a>
      </div>
      {searchParams?.ok === 'created' && <div className="banner-ok">✓ เริ่มโปรแกรมแล้ว — ลูกค้าเริ่มสะสมแต้มได้เลย</div>}
      {searchParams?.ok === 'reward' && <div className="banner-ok">✓ เพิ่มรางวัลแล้ว</div>}
      {searchParams?.ok === 'reward_deleted' && <div className="banner-ok">✓ ลบรางวัลแล้ว</div>}

      <div className="lstats">
        <div className="lstat"><div className="v">{stats?.members ?? 0}</div><div className="l">สมาชิกสะสมแต้ม</div></div>
        <div className="lstat"><div className="v">{stats?.outstanding ?? 0}</div><div className="l">{pointsName}ค้างในระบบ</div></div>
        <div className="lstat"><div className="v">{stats?.redeemed ?? 0}</div><div className="l">แลกไปแล้ว (ครั้ง)</div></div>
      </div>

      <a className="bigcta" href="/merchant/loyalty/redeem"><Icon n="check" size={19} /> แลกแต้มที่เคาน์เตอร์</a>

      <div className="menu" style={{ marginTop: 2 }}>
        <a className="menu-row" href="/merchant/loyalty/insights">
          <span className="menu-ic"><Icon n="spark" size={20} /></span>
          <span className="menu-tx">สถิติร้าน · คนเข้าร้าน · ช่วงเวลาพีค</span>
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
      </div>

      <div className="menu-label">ของรางวัล ({pointsName})</div>
      <div className="mlist">
        {rewards.map((r) => (
          <div className="mrow" key={r.id}>
            <span className="mrow-img"><span className="ph"><Icon n={r.kind === 'privilege' ? 'spark' : r.kind === 'discount' ? 'tag' : 'box'} size={24} /></span></span>
            <div className="mrow-body">
              <div className="mrow-nm">{i18n(r.title_i18n)}</div>
              <div className="mrow-meta">{KIND_LABEL[r.kind] || r.kind} · ใช้ {r.cost_stamps} {pointsName} · แลกไป {r.redeemed_count} ครั้ง</div>
            </div>
            <form action={deleteRewardAction.bind(null, r.id)}>
              <button className="dbtn danger sm" type="submit" aria-label="ลบ"><Icon n="trash" size={15} /></button>
            </form>
          </div>
        ))}
      </div>
      <p className="note">ลูกค้าเช็คอินในรัศมีร้าน = ได้ {pointsName} 1 ดวง (เฉพาะการเช็คอินที่ร้านยืนยัน) — แลกเป็นเงินสดไม่ได้ เป็นของรางวัลของร้านเท่านั้น</p>
    </>
  );
}
