'use client';
import { useMemo, useState } from 'react';
import { Icon } from '../../ui';
import { createRoomAction, createRoomsBulkAction } from '../../../actions';

// Add physical rooms to the board. One intro + a hero "รูปแบบห้อง" link (the thing users used to miss) +
// a 2-way switch so only ONE form shows at a time, and a live preview of the codes a bulk run will create.
export function AddRoom({ types, term }: { types: { id: string; name: string }[]; term: string }) {
  const [mode, setMode] = useState<'single' | 'bulk'>('bulk');
  const [typeId, setTypeId] = useState('');
  const [floor, setFloor] = useState('');
  const [prefix, setPrefix] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const selectedName = types.find((t) => t.id === typeId)?.name;

  // mirror the server's exact code-gen + range guard so the preview == what gets created
  const preview = useMemo(() => {
    if (start === '' || end === '') return { state: 'empty' as const };
    const s = parseInt(start, 10), e = parseInt(end, 10);
    if (Number.isNaN(s) || Number.isNaN(e) || s < 0 || e < s || e - s > 199) return { state: 'invalid' as const };
    const fl = floor.trim(), px = prefix.trim();
    const base = px || fl || '';
    const pad = (!px && /^\d+$/.test(fl)) ? 2 : 0;
    const code = (n: number) => base + (pad ? String(n).padStart(2, '0') : String(n));
    const count = e - s + 1;
    const text = count <= 6 ? Array.from({ length: count }, (_, i) => code(s + i)).join(', ')
      : `${code(s)}, ${code(s + 1)}, ${code(s + 2)} … ${code(e)}`;
    return { state: 'ok' as const, count, text };
  }, [floor, prefix, start, end]);

  const previewStyle = { background: 'var(--m-sec-bg)', color: 'var(--m-sec)', padding: '9px 12px', borderRadius: 10, fontSize: '.84rem', fontWeight: 600, margin: '2px 0 0' } as const;

  return (
    <>
      <section className="fsec">
        <p className="fhint" style={{ margin: 0 }}>เพิ่ม “ห้องจริง” เข้าผัง — ทีละห้องหรือหลายห้องรวดเดียว แล้วเลือกว่าเป็น “รูปแบบห้อง” ไหน ระบบจะนับห้องว่างให้อัตโนมัติ</p>
      </section>

      {/* HERO: the room-type link — rendered ONCE, shared by both modes via a hidden input */}
      <section className="fsec">
        <div className="field">
          <label>รูปแบบห้อง (สำคัญ) *</label>
          <p className="fhint" style={{ margin: '0 0 6px' }}>ห้องจริงนี้คือ “รูปแบบห้อง” ไหน? ระบบจะได้นับห้องว่างของรูปแบบนั้นให้อัตโนมัติ</p>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">— ยังไม่เลือก (จะไม่ถูกนับในรูปแบบใด) —</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {typeId
          ? <p className="fhint" style={{ margin: '8px 0 0', color: 'var(--m-jade)', fontWeight: 600 }}><Icon n="check" size={13} /> ห้องที่เพิ่มจะนับเป็น “{selectedName}”</p>
          : <div className="banner-warn" style={{ marginTop: 8 }}>ยังไม่ได้เลือกรูปแบบห้อง — ห้องจะอยู่ในผังแต่ยังไม่ถูกนับเป็นห้องว่างของรูปแบบใด เลือกภายหลังจากหน้าห้องได้</div>}
      </section>

      {/* mode switch — one form at a time */}
      <div className="roomseg" role="tablist">
        <button type="button" className={`roomseg-i ${mode === 'single' ? 'on' : ''}`} onClick={() => setMode('single')}>ทีละห้อง</button>
        <button type="button" className={`roomseg-i ${mode === 'bulk' ? 'on' : ''}`} onClick={() => setMode('bulk')}>หลายห้อง</button>
      </div>
      <p className="fhint" style={{ margin: '7px 2px 12px' }}>เลือก “หลายห้อง” ถ้าจะเพิ่มทั้ง{term}/โซนรวดเดียว · “ทีละห้อง” ถ้าเพิ่มแค่ห้องเดียว</p>

      {mode === 'single' ? (
        <form className="form mform" action={createRoomAction}>
          <section className="fsec">
            <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> เพิ่มทีละห้อง</div>
            <div className="fgrid">
              <div className="field"><label>เลข/ชื่อห้อง *</label><input name="code" placeholder="101" required /></div>
              <div className="field"><label>{term}</label><input name="floor" placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
            </div>
            <div className="field"><label>รับได้ (ท่าน)</label><input name="capacity" type="number" min="0" placeholder="2" /></div>
            <input type="hidden" name="stay_unit_id" value={typeId} />
            <button className="btn btn-primary" type="submit">+ เพิ่มห้อง</button>
          </section>
        </form>
      ) : (
        <form className="form mform" action={createRoomsBulkAction}>
          <section className="fsec">
            <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> เพิ่มหลายห้องรวดเดียว</div>
            <p className="fhint">ใส่ช่วงเลข เช่น เริ่ม 1 ถึง 10 ระบบจะสร้างห้องให้ทั้งชุด<br />{term}เป็นเลข เช่น “1” → ได้ 101–110 · ถ้าเป็นชื่อ (เช่น ริมน้ำ) ใส่ “คำนำหน้า” เอง เช่น A → A1–A10<br />เลขห้องที่มีอยู่แล้วจะถูกข้ามให้อัตโนมัติ</p>
            <div className="fgrid">
              <div className="field"><label>{term}</label><input name="floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
              <div className="field"><label>คำนำหน้าเลขห้อง (ไม่บังคับ)</label><input name="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="เช่น A · เว้นว่างได้ถ้าชั้นเป็นเลข" /></div>
            </div>
            <div className="fgrid">
              <div className="field"><label>เลขห้องเริ่ม *</label><input name="start" type="number" min="0" value={start} onChange={(e) => setStart(e.target.value)} placeholder="1" required /></div>
              <div className="field"><label>ถึงเลข *</label><input name="end" type="number" min="0" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="10" required /></div>
            </div>
            {preview.state === 'ok' && <p style={previewStyle}>จะสร้าง {preview.count} ห้อง: {preview.text}</p>}
            {preview.state === 'empty' && <p className="fhint" style={{ margin: '2px 0 0' }}>ใส่เลขเริ่มและเลขสิ้นสุดเพื่อดูตัวอย่าง</p>}
            {preview.state === 'invalid' && <p className="fhint" style={{ margin: '2px 0 0', color: '#B25E00' }}>ช่วงเลขไม่ถูกต้อง — ใส่เลขเริ่มน้อยกว่าเลขสิ้นสุด (ไม่เกิน 200 ห้อง)</p>}
            <div className="field" style={{ marginTop: 10 }}><label>รับได้ (ท่าน) — ใช้กับทุกห้องในชุดนี้</label><input name="capacity" type="number" min="0" placeholder="เช่น 2" /></div>
            <input type="hidden" name="stay_unit_id" value={typeId} />
            <button className="btn btn-primary" type="submit">+ เพิ่มหลายห้อง</button>
          </section>
        </form>
      )}
    </>
  );
}
