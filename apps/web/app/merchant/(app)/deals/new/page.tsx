import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { Icon } from '../../ui';
import { createMerchantDealAction } from '../../../actions';

export const dynamic = 'force-dynamic';

const ERR: Record<string, string> = { title: 'กรุณากรอกชื่อดีล', value: 'กรุณากรอกค่าส่วนลด' };

export default async function NewDeal({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  if (!acc.verified) redirect('/merchant/verify?need=deals');

  return (
    <>
      <div className="listhead"><h1>สร้างดีลใหม่</h1><Link className="addbtn ghost" href="/merchant/deals">ยกเลิก</Link></div>
      {searchParams?.error && <div className="banner-err">{ERR[searchParams.error] || 'เกิดข้อผิดพลาด'}</div>}

      <form className="form mform" action={createMerchantDealAction}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="tag" size={15} /></span> ประเภทดีล</div>
          <div className="field">
            <label>รูปแบบส่วนลด</label>
            <select name="deal_type" defaultValue="percent_off">
              <option value="percent_off">ลดเป็น % (เช่น ลด 15%)</option>
              <option value="fixed_off">ลดเป็นบาท (เช่น ลด ฿30)</option>
              <option value="bogo">ซื้อ 1 แถม 1</option>
              <option value="freebie">ของแถมฟรี</option>
            </select>
          </div>
          <div className="lset">
            <span>ลด %</span>
            <input name="value_pct" type="number" min="1" max="90" inputMode="numeric" placeholder="15" />
            <span>หรือ ลด ฿</span>
            <input name="value_baht" type="number" min="1" inputMode="numeric" placeholder="30" />
          </div>
          <p className="fhint">ใส่ช่องเดียวให้ตรงกับรูปแบบที่เลือก — “แถม/ของแถม” ไม่ต้องใส่ตัวเลข</p>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="store" size={15} /></span> รายละเอียด</div>
          <div className="field"><label>ชื่อดีล *</label><input name="title" required placeholder="เช่น Happy Hour เครื่องดื่มทุกแก้ว" /></div>
          <div className="field"><label>เงื่อนไข (ไม่บังคับ)</label><input name="terms" placeholder="เช่น เฉพาะหน้าร้าน 14:00–17:00" /></div>
          <div className="lset">
            <span>จำนวนสิทธิ์</span>
            <input name="quota" type="number" min="0" inputMode="numeric" placeholder="ไม่จำกัด" />
            <span>ใช้ได้อีก</span>
            <input name="days" type="number" min="1" max="60" inputMode="numeric" defaultValue="7" />
            <span>วัน</span>
          </div>
        </section>

        <button className="btn btn-primary mform-save" type="submit">เผยแพร่ดีล →</button>
      </form>
    </>
  );
}
