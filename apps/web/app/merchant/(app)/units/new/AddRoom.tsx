'use client';
import { useMemo, useState } from 'react';
import { Icon } from '../../ui';
import { createRoomAction, createRoomsBulkAction } from '../../../actions';
import { InfoTip } from './InfoTip';

// Add physical rooms to the board. Pick the room TYPE first (the gate) — only then does the add form appear,
// so the load-bearing link is never missed. dorm/hostel can add เตียง (room_kind='bed') instead of whole rooms;
// beds are flat leaves so each counts as one vacancy (no parent hierarchy needed). Status/วันที่ว่าง/โน้ต let an
// owner backfill rooms ALREADY occupied at setup (else every new room shows as a fake vacancy in "ว่าง N").
export function AddRoom({ types, term, allowBeds }: { types: { id: string; name: string; capacity: number | null }[]; term: string; allowBeds?: boolean }) {
  const [mode, setMode] = useState<'single' | 'bulk' | 'list'>('bulk');
  const [kind, setKind] = useState<'room' | 'bed'>('room');
  const [typeId, setTypeId] = useState('');
  const [floor, setFloor] = useState('');
  const [prefix, setPrefix] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [codesText, setCodesText] = useState('');
  const [cap, setCap] = useState('');
  const [status, setStatus] = useState('vacant');
  const [occUntil, setOccUntil] = useState('');
  const selected = types.find((t) => t.id === typeId);
  const U = kind === 'bed' ? 'เตียง' : 'ห้อง';

  const capFor = (k: 'room' | 'bed', t?: { capacity: number | null }) =>
    k === 'bed' ? '1' : (t?.capacity != null ? String(t.capacity) : '');
  const pickType = (id: string) => { setTypeId(id); setCap(capFor(kind, types.find((x) => x.id === id))); };
  const pickKind = (k: 'room' | 'bed') => { setKind(k); setCap(capFor(k, selected)); };

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

  // free-list preview — mirror the server parse (split on comma/space, sanitize, dedupe, cap 200)
  const listPreview = useMemo(() => {
    const codes = [...new Set(codesText.split(/[\s,]+/).map((x) => x.replace(/[^\p{L}\p{N}\-_]/gu, '').slice(0, 24)).filter(Boolean))].slice(0, 200);
    if (!codes.length) return { state: 'empty' as const };
    const text = codes.length <= 6 ? codes.join(', ') : `${codes.slice(0, 3).join(', ')} … ${codes[codes.length - 1]}`;
    return { state: 'ok' as const, count: codes.length, text };
  }, [codesText]);

  const previewStyle = { background: 'var(--m-sec-bg)', color: 'var(--m-sec)', padding: '10px 12px', borderRadius: 10, fontSize: '.85rem', fontWeight: 700, margin: '2px 0 0' } as const;

  // shared status block (only ONE form is in the DOM at a time, so the duplicated name is never a conflict)
  const occupied = status === 'occupied' || status === 'reserved';
  const statusFields = (
    <>
      <div className="field"><label>สถานะตอนนี้</label>
        <select name="occupancy_status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="vacant">ว่าง — พร้อมให้เข้าอยู่</option>
          <option value="occupied">มีผู้เช่าอยู่แล้ว</option>
          <option value="reserved">จองไว้</option>
          <option value="maintenance">ปิดปรับปรุง</option>
        </select>
        <p className="fhint">เลือกอย่างอื่นถ้า{U}มีคนอยู่/ปิดอยู่แล้ว — จะได้ไม่ถูกนับเป็น{U}ว่างให้ลูกค้า</p></div>
      {occupied && (
        <div className="field"><label>ว่างอีกครั้ง <span className="lbl-opt">(ถ้ารู้วันที่)</span></label>
          <input name="occupied_until" type="date" value={occUntil} onChange={(e) => setOccUntil(e.target.value)} /></div>
      )}
    </>
  );

  return (
    <>
      {/* STEP 1 — pick the type (the gate). The why lives in the "?" tooltip, not on the page. */}
      <section className="fsec">
        <div className="field">
          <label>รูปแบบห้อง (สำคัญ) *<InfoTip title="รูปแบบห้อง คืออะไร" body={'“รูปแบบห้อง” = แบบ & ราคาที่ลูกค้าเห็น — เช่น ดีลักซ์, สวีท, เตียงรวม\n“ห้องจริง” = ห้องแต่ละห้อง (101, 102…) ที่คุณจัดในผัง\nเลือกว่าห้องจริงนี้เป็นรูปแบบไหน ระบบจะนับห้องว่างของรูปแบบนั้นให้อัตโนมัติ'} /></label>
          <select value={typeId} onChange={(e) => pickType(e.target.value)}>
            <option value="">— เลือกรูปแบบห้อง —</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {typeId
          ? <div className="addroom-on"><Icon n="check" size={14} /> กำลังเพิ่ม{U}ของ <b>{selected?.name}</b></div>
          : <div className="addroom-hint"><Icon n="chevD" size={14} /> เลือกรูปแบบห้องก่อน แล้วฟอร์มเพิ่มห้องจะปรากฏ</div>}
      </section>

      {/* STEP 2 — appears only after a type is chosen */}
      {typeId && (
        <>
          {allowBeds && (
            <div className="field" style={{ marginBottom: 6 }}>
              <label>หน่วยที่เพิ่ม</label>
              <div className="roomseg" role="tablist">
                <button type="button" className={`roomseg-i ${kind === 'room' ? 'on' : ''}`} onClick={() => pickKind('room')}>ทั้งห้อง</button>
                <button type="button" className={`roomseg-i ${kind === 'bed' ? 'on' : ''}`} onClick={() => pickKind('bed')}>เตียง (ในห้องรวม)</button>
              </div>
              <p className="fhint">เลือก “เตียง” เพื่อปักหมุดทีละเตียงในหอพักรวม — แต่ละเตียงนับเป็นที่ว่าง 1 ที่</p>
            </div>
          )}

          <div className="roomseg" role="tablist">
            <button type="button" className={`roomseg-i ${mode === 'single' ? 'on' : ''}`} onClick={() => setMode('single')}>ทีละ{U}</button>
            <button type="button" className={`roomseg-i ${mode === 'bulk' ? 'on' : ''}`} onClick={() => setMode('bulk')}>เป็นช่วง</button>
            <button type="button" className={`roomseg-i ${mode === 'list' ? 'on' : ''}`} onClick={() => setMode('list')}>พิมพ์เอง</button>
          </div>

          {mode === 'single' ? (
            <form className="form mform" action={createRoomAction}>
              <section className="fsec">
                <div className="fgrid">
                  <div className="field"><label>เลข/ชื่อ{U} *</label><input name="code" placeholder={kind === 'bed' ? 'A1' : '101'} required /></div>
                  <div className="field"><label>{term}</label><input name="floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
                </div>
                <div className="field"><label>รับได้ (ท่าน)</label><input name="capacity" type="number" min="0" max="50" value={cap} onChange={(e) => setCap(e.target.value)} placeholder={kind === 'bed' ? '1' : '2'} />
                  <p className="fhint">{kind === 'bed' ? 'ปกติเตียงละ 1 ท่าน' : 'ดึงจากรูปแบบห้องให้ — แก้รายห้องได้'}</p></div>
                {statusFields}
                <div className="field"><label>โน้ต <span className="lbl-opt">(เห็นเฉพาะคุณ)</span></label><input name="note" maxLength={300} placeholder="เช่น คุณสมชาย ถึง 31 ธ.ค." /></div>
                <input type="hidden" name="stay_unit_id" value={typeId} />
                <input type="hidden" name="room_kind" value={kind} />
                <button className="btn btn-primary" type="submit">+ เพิ่ม{U}</button>
              </section>
            </form>
          ) : mode === 'bulk' ? (
            <form className="form mform" action={createRoomsBulkAction}>
              <section className="fsec">
                <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> เพิ่มหลาย{U}รวดเดียว<InfoTip title="วิธีตั้งเลข" body={`ใส่ช่วงเลข เช่น เริ่ม 1 ถึง 10 → สร้างทั้งชุดรวดเดียว\n${term}เป็นเลข เช่น “1” → ได้ 101–110\nถ้าเป็นชื่อ (เช่น ริมน้ำ) ใส่ “คำนำหน้า” เอง เช่น A → A1–A10\nเลขที่มีอยู่แล้วจะถูกข้ามให้อัตโนมัติ (ระบบจะบอกว่าข้ามกี่อัน)`} /></div>
                <div className="fgrid">
                  <div className="field"><label>{term}</label><input name="floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
                  <div className="field"><label>คำนำหน้า (ถ้ามี)</label><input name="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="เช่น A" /></div>
                </div>
                <div className="fgrid">
                  <div className="field"><label>เลขเริ่ม *</label><input name="start" type="number" min="0" value={start} onChange={(e) => setStart(e.target.value)} placeholder="1" required /></div>
                  <div className="field"><label>ถึงเลข *</label><input name="end" type="number" min="0" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="10" required /></div>
                </div>
                {preview.state === 'ok' && <p style={previewStyle}>จะสร้าง {preview.count} {U}: {preview.text}</p>}
                {preview.state === 'invalid' && <p className="fhint" style={{ margin: '2px 0 0', color: '#B25E00' }}>ช่วงเลขไม่ถูกต้อง — ใส่เลขเริ่มน้อยกว่าเลขสิ้นสุด (ไม่เกิน 200 ต่อครั้ง)</p>}
                <div className="field" style={{ marginTop: 10 }}><label>รับได้ (ท่าน) — ทุก{U}ในชุดนี้</label><input name="capacity" type="number" min="0" max="50" value={cap} onChange={(e) => setCap(e.target.value)} placeholder={kind === 'bed' ? '1' : '2'} /></div>
                {statusFields}
                <input type="hidden" name="stay_unit_id" value={typeId} />
                <input type="hidden" name="room_kind" value={kind} />
                <button className="btn btn-primary" type="submit">+ เพิ่มหลาย{U}</button>
              </section>
            </form>
          ) : (
            <form className="form mform" action={createRoomsBulkAction}>
              <section className="fsec">
                <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> พิมพ์เลข{U}เอง<InfoTip title="พิมพ์เลขเอง" body={`พิมพ์เลข/ชื่อ${U}ที่ต้องการ คั่นด้วยจุลภาคหรือเว้นวรรค\nเช่น 101, 102, 105, 201 หรือ A1 A2 B1\nเหมาะกับเลขที่ไม่เรียงกัน หรือชื่อเฉพาะ\nเลขที่มีอยู่แล้วจะถูกข้ามให้ (ระบบบอกว่าข้ามกี่อัน)`} /></div>
                <div className="field"><label>เลข/ชื่อ{U} *</label>
                  <textarea name="codes" value={codesText} onChange={(e) => setCodesText(e.target.value)} placeholder={kind === 'bed' ? 'A1, A2, B1, B2' : '101, 102, 105, 201'} style={{ minHeight: 60 }} required /></div>
                {listPreview.state === 'ok' && <p style={previewStyle}>จะสร้าง {listPreview.count} {U}: {listPreview.text}</p>}
                <div className="fgrid">
                  <div className="field"><label>{term}</label><input name="floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
                  <div className="field"><label>รับได้ (ท่าน) — ทุก{U}ในชุดนี้</label><input name="capacity" type="number" min="0" max="50" value={cap} onChange={(e) => setCap(e.target.value)} placeholder={kind === 'bed' ? '1' : '2'} /></div>
                </div>
                {statusFields}
                <input type="hidden" name="stay_unit_id" value={typeId} />
                <input type="hidden" name="room_kind" value={kind} />
                <button className="btn btn-primary" type="submit">+ เพิ่ม{U}</button>
              </section>
            </form>
          )}
        </>
      )}
    </>
  );
}
