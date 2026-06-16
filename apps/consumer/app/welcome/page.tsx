'use client';
import { useState, useEffect } from 'react';
import { Icon } from '../icons';

// Onboarding artwork (hosted assets).
const IMG = [
  'https://locale-assets.xalpha.co.th/welcome/welcome_01.jpg',
  'https://locale-assets.xalpha.co.th/welcome/welcome_02.jpg',
  'https://locale-assets.xalpha.co.th/welcome/welcome_03.jpg',
];

// 3-slide feature tour (ref-style).
const SLIDES = [
  { img: IMG[0], t1: 'ค้นหา เปรียบเทียบ', t2: ' เจอที่ใช่',
    sub: 'รวมคาเฟ่ ร้านอาหาร ที่เที่ยว และที่พักในเชียงใหม่ — ค้นหาและเทียบได้ง่ายในไม่กี่แตะ' },
  { img: IMG[1], t1: 'เก็บที่ชอบ', t2: ' ไม่พลาดร้านเด็ด',
    sub: 'บุ๊กมาร์กร้านและที่พักที่ถูกใจ จัดเป็นลิสต์ของคุณเอง กลับมาดูเมื่อไหร่ก็ได้' },
  { img: IMG[2], t1: 'สะสมแต้มทุกร้าน', t2: ' วางแผนล่วงหน้า',
    sub: 'เช็คอินสะสมแต้มแต่ละร้าน เก็บ Sparks และวางแผนทริปเที่ยวเชียงใหม่ได้ก่อนใคร' },
];

export default function Welcome() {
  const [phase, setPhase] = useState<'splash' | 'tour' | 'start'>('splash');
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase('tour'), 1600);
    return () => clearTimeout(t);
  }, []);

  if (phase === 'splash') {
    return (
      <div className="splash">
        <div className="splash-logo">
          <span className="splash-mark"><Icon n="pin" size={30} /></span>
          <span className="splash-name">Locale</span>
        </div>
        <div className="splash-dots"><i /><i /><i /></div>
      </div>
    );
  }

  if (phase === 'tour') {
    const s = SLIDES[i];
    const last = i === SLIDES.length - 1;
    return (
      <div className="onb">
        <button className="onb-skip" type="button" onClick={() => setPhase('start')}>ข้าม</button>
        <div className="onb-art"><img src={s.img} alt="" /></div>
        <h1 className="onb-h"><b>{s.t1}</b>{s.t2}</h1>
        <p className="onb-sub">{s.sub}</p>
        <div className="onb-nav">
          <button className="onb-arrow ghost" type="button" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} aria-label="ก่อนหน้า">
            <Icon n="back" size={20} />
          </button>
          <div className="onb-dots">{SLIDES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
          <button className="onb-arrow" type="button" onClick={() => (last ? setPhase('start') : setI((v) => v + 1))} aria-label={last ? 'เริ่ม' : 'ถัดไป'}>
            <Icon n="chevR" size={22} />
          </button>
        </div>
      </div>
    );
  }

  // get-started
  return (
    <div className="welcome">
      <div className="welcome-hero"><img src={IMG[0]} alt="" /></div>

      <h1>เที่ยว กิน พัก <b>ในเชียงใหม่</b><br />ครบ จบ ในแอปเดียว</h1>
      <p className="welcome-sub">รวมคาเฟ่ ร้านอาหาร ที่เที่ยว และที่พัก — สะสมแต้มร้าน เก็บที่ชอบ และร่วมกิจกรรมในแอป</p>

      <a className="welcome-cta" href="/register">เริ่มใช้งาน</a>
      <p className="welcome-signin">มีบัญชีอยู่แล้ว? <a href="/login">เข้าสู่ระบบ</a></p>
      <p className="welcome-skip"><a href="/">ข้ามไปก่อน — เข้าหน้าหลัก</a></p>
    </div>
  );
}
