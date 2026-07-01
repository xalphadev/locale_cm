import Link from 'next/link';
import { q, i18n } from '@/lib/db';
import { addAmenityAction, toggleAmenityAction, addPlaceFacetAction, togglePlaceFacetAction } from '../../actions';
import { PageHead, Icon } from '../../adm-ui';

export const dynamic = 'force-dynamic';

// One catalog console for every controlled vocabulary the platform filters on:
//   place  → place_facet   (0068 — จุดเด่นร้าน/สถานที่: consumer home filter + merchant shop editor)
//   amenity/building/bills → stay_amenity (0044 — ที่พัก)
// UX: segmented group tabs → a "chip wall" (tap a chip to load it into the edit card) + one edit/add card.
// Hiding never deletes — a retired key still labels old places, it just stops being offered.
const GROUPS: { g: string; label: string; hint: string }[] = [
  { g: 'place', label: 'ร้าน & สถานที่', hint: 'จุดเด่นที่ลูกค้าใช้กรองหน้าแรก เช่น นั่งทำงานได้ · ฮาลาล · จุดถ่ายรูป' },
  { g: 'amenity', label: 'ในห้องพัก', hint: 'ของในห้อง เช่น แอร์ · น้ำอุ่น · ตู้เย็น' },
  { g: 'building', label: 'ส่วนกลางที่พัก', hint: 'ของส่วนกลางตึก เช่น สระว่ายน้ำ · ลิฟต์ · ฟิตเนส' },
  { g: 'bills', label: 'ค่าใช้จ่ายรวมค่าเช่า', hint: 'บิลที่รวมในค่าเช่า เช่น น้ำ · ไฟ · เน็ต' },
];
const CATS: [string, string][] = [['eat', 'กิน'], ['see', 'เที่ยว'], ['do', 'ทำกิจกรรม']];

export default async function AmenitiesAdmin({ searchParams }: { searchParams: { g?: string; edit?: string; ok?: string; err?: string } }) {
  const g = GROUPS.some((x) => x.g === searchParams?.g) ? searchParams!.g! : 'place';
  const grp = GROUPS.find((x) => x.g === g)!;
  const isPlace = g === 'place';
  let rows: any[] = []; let err: string | null = null;
  try {
    rows = isPlace
      ? await q<any>(`SELECT key, label_i18n, cats, subs, sort, active FROM place_facet ORDER BY sort, key`)
      : await q<any>(`SELECT key, label_i18n, sort, active FROM stay_amenity WHERE grp=$1 ORDER BY sort, key`, [g]);
  } catch (e: any) { err = String(e?.message ?? e); }
  const editing = rows.find((r) => r.key === searchParams?.edit) || null;
  const nOn = rows.filter((r) => r.active).length;

  return (
    <>
      <PageHead icon="spark" title="คลังตัวกรอง & สิ่งอำนวยความสะดวก" count={`${nOn} ใช้งาน`}
        sub="ลิสต์กลางที่ร้านเลือกและลูกค้าใช้กรอง — เพิ่ม/แก้ที่นี่ มีผลทันทีทุกหน้า ไม่ต้อง deploy · การ “ปิด” ไม่ลบของเดิม แค่หยุดเสนอให้เลือกใหม่" />
      {searchParams?.ok && <div className="banner-ok"><Icon n="shield" size={16} /> บันทึกแล้ว — มีผลกับฟอร์มร้านและตัวกรองลูกค้าทันที</div>}
      {searchParams?.err && <div className="banner-ok" style={{ background: '#FCE8E6', color: '#C0392B', borderColor: '#F5C6C0' }}>กรอกไม่ครบ — ต้องมีคีย์ (a–z, 0–9, _) และชื่อภาษาไทย</div>}
      {err && <p className="note">DB error: {err}</p>}

      {/* group tabs */}
      <div className="adm-seg" style={{ marginTop: 6 }}>
        {GROUPS.map((x) => (
          <Link key={x.g} href={`/reports/amenities?g=${x.g}`} className={x.g === g ? 'on' : ''}>{x.label}</Link>
        ))}
      </div>
      <p className="note" style={{ margin: '-6px 0 16px' }}>{grp.hint}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 18, alignItems: 'start' }}>
        {/* chip wall — tap a chip to edit it */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--sh)', padding: '16px 16px 14px' }}>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
            ทั้งหมด {rows.length} รายการ · แตะชิปเพื่อแก้ไข
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {rows.map((r) => (
              <Link key={r.key} href={`/reports/amenities?g=${g}&edit=${r.key}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '.42rem .8rem', borderRadius: 999,
                  fontSize: '.86rem', fontWeight: 600, textDecoration: 'none', lineHeight: 1.5,
                  border: `1.5px solid ${editing?.key === r.key ? 'var(--jade)' : 'var(--line)'}`,
                  background: editing?.key === r.key ? 'var(--jade-soft)' : r.active ? 'var(--surface)' : 'var(--sunk)',
                  color: r.active ? 'var(--ink)' : 'var(--faint)',
                  boxShadow: editing?.key === r.key ? '0 0 0 3px var(--jade-soft)' : 'none',
                }}>
                {i18n(r.label_i18n)}
                <code style={{ fontSize: '.68rem', color: 'var(--faint)', background: 'transparent', padding: 0 }}>{r.key}</code>
                {!r.active && <span style={{ fontSize: '.66rem', color: '#C0392B', fontWeight: 600 }}>ปิด</span>}
              </Link>
            ))}
            {rows.length === 0 && <p className="note">ยังไม่มีรายการในกลุ่มนี้</p>}
          </div>
        </div>

        {/* edit / add card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--sh)', padding: 18, position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: editing ? 'var(--jade-soft)' : 'var(--amber-soft)', color: editing ? 'var(--jade)' : 'var(--amber)' }}>
              <Icon n={editing ? 'shield' : 'plus'} size={16} />
            </span>
            <b style={{ fontSize: '.98rem' }}>{editing ? `แก้ไข “${i18n(editing.label_i18n)}”` : 'เพิ่มรายการใหม่'}</b>
            {editing && <Link href={`/reports/amenities?g=${g}`} className="note" style={{ marginLeft: 'auto', textDecoration: 'none' }}>+ เพิ่มใหม่แทน</Link>}
          </div>

          <form action={isPlace ? addPlaceFacetAction : addAmenityAction} className="form" style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', display: 'grid', gap: 12 }}>
            {!isPlace && <input type="hidden" name="grp" value={g} />}
            <div className="field"><label>ชื่อที่ลูกค้าเห็น (ไทย)</label>
              <input name="label" required maxLength={60} defaultValue={editing ? i18n(editing.label_i18n) : ''} placeholder={isPlace ? 'เช่น มุมถ่ายรูปสวย' : 'เช่น เครื่องทำน้ำอุ่น'} key={`l-${editing?.key || 'new'}`} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
              <div className="field"><label>คีย์ (a–z, 0–9, _)</label>
                <input name="key" required pattern="[a-z0-9_]+" defaultValue={editing?.key || ''} placeholder="photo_corner" readOnly={!!editing}
                  key={`k-${editing?.key || 'new'}`} style={editing ? { opacity: .6 } : undefined} /></div>
              <div className="field"><label>ลำดับ</label>
                <input name="sort" type="number" defaultValue={editing?.sort ?? 100} key={`s-${editing?.key || 'new'}`} /></div>
            </div>
            {isPlace && (
              <>
                <div className="field"><label>เสนอให้หมวดหลัก</label>
                  <div style={{ display: 'flex', gap: 14, paddingTop: 4 }}>
                    {CATS.map(([k, l]) => (
                      <label key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.9rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <input type="checkbox" name="cats" value={k} defaultChecked={!!editing?.cats?.includes(k)} key={`c-${k}-${editing?.key || 'new'}`}
                          style={{ width: 17, height: 17, accentColor: 'var(--jade)', padding: 0 }} /> {l}
                      </label>
                    ))}
                  </div></div>
                <div className="field"><label>เสนอให้ประเภทร้าน (คั่นด้วย , )</label>
                  <input name="subs" defaultValue={editing?.subs?.join(', ') || ''} placeholder="cafe, restaurant, dessert" key={`sub-${editing?.key || 'new'}`} />
                  <p className="note" style={{ marginTop: 5 }}>ถ้าประเภทร้านตรงลิสต์นี้ ใช้ก่อน · ไม่ตรงจึงถอยไปใช้หมวดหลัก</p></div>
              </>
            )}
            <button className={`btn ${editing ? 'btn-approve' : 'btn-primary'}`} type="submit" style={{ justifyContent: 'center' }}>
              {editing ? 'บันทึกการแก้ไข' : '+ เพิ่มเข้าคลัง'}
            </button>
          </form>

          {editing && (
            <form action={isPlace ? togglePlaceFacetAction.bind(null, editing.key) : toggleAmenityAction.bind(null, g, editing.key)} style={{ marginTop: 10 }}>
              <button className="btn ghost" type="submit" style={{ width: '100%', justifyContent: 'center', color: editing.active ? '#C0392B' : 'var(--jade)' }}>
                {editing.active ? 'ปิดการเสนอ (ของเดิมยังแสดง)' : 'เปิดใช้งานอีกครั้ง'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
