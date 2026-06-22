import Link from 'next/link';
import { q, i18n, cover } from '@/lib/db';
import { Icon } from '../icons';
import MapPeek from '../MapPeek';
import { daypart, bkkNow, openNow } from '@/lib/local';
import { parsePlan } from '@/lib/intent';

export const dynamic = 'force-dynamic';

// Local "plan my outing" — a rule-based itinerary engine over real places. (LLM-upgradeable later:
// swap pickSlot() for a Claude call that ranks candidates; the slot plan + budget math stay the same.)

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const PB_COST: Record<string, number> = { '1': 120, '2': 280, '3': 550, '4': 950 }; // ฿/คน ต่อสต็อปโดยประมาณ

type Slot = { label: string; subs?: string[]; cats?: string[]; minPrice?: number; note: string };
const VIBES: Record<string, { th: string; icon: string; slots: Slot[] }> = {
  date: { th: 'เดทโรแมนติก', icon: 'flower', slots: [
    { label: 'อุ่นเครื่องด้วยของหวาน/กาแฟ', subs: ['cafe', 'dessert'], note: 'นั่งคุยกันสบายๆ ก่อนมื้อหลัก' },
    { label: 'มื้อค่ำบรรยากาศดี', subs: ['restaurant', 'bar'], minPrice: 2, note: 'ร้านบรรยากาศโรแมนติก' },
    { label: 'ปิดท้ายชิลๆ', subs: ['bar', 'viewpoint', 'cafe'], note: 'ดื่ม/ชมวิวก่อนกลับ' },
  ] },
  foodie: { th: 'สายกิน', icon: 'bowl', slots: [
    { label: 'ของกินเล่นสตรีท', subs: ['street_food'], note: 'เริ่มเบาๆ แบบท้องถิ่น' },
    { label: 'มื้อหลักร้านเด็ด', subs: ['restaurant'], note: 'อาหารเหนือ/ร้านดัง' },
    { label: 'ของหวานปิดท้าย', subs: ['dessert', 'cafe'], note: 'หวานๆ เย็นๆ' },
  ] },
  culture: { th: 'สายวัฒนธรรม', icon: 'landmark', slots: [
    { label: 'วัด/แลนด์มาร์ก', subs: ['temple', 'landmark'], note: 'ซึมซับล้านนา' },
    { label: 'พิพิธภัณฑ์/ตลาด', subs: ['museum', 'market'], note: 'เรียนรู้เรื่องเมือง' },
    { label: 'พักจิบกาแฟ', subs: ['cafe'], note: 'นั่งพักหลังเดินเที่ยว' },
  ] },
  chill: { th: 'ชิลล์เบาๆ', icon: 'coffee', slots: [
    { label: 'คาเฟ่นั่งยาว', subs: ['cafe'], note: 'เริ่มวันแบบสบายๆ' },
    { label: 'ของหวาน/ผ่อนคลาย', subs: ['dessert', 'spa'], note: 'ตามใจวันสบายๆ' },
    { label: 'ชมวิว/เดินเล่น', subs: ['viewpoint', 'temple', 'market'], note: 'ปิดท้ายเบาๆ' },
  ] },
};
const BUDGETS: Record<string, { th: string; max: number }> = {
  lt500: { th: 'ไม่เกิน ฿500', max: 500 },
  '500_1000': { th: '฿500–1,000', max: 1000 },
  '1000_2000': { th: '฿1,000–2,000', max: 2000 },
  '2000plus': { th: 'มากกว่า ฿2,000', max: 99999 },
};

function PlanForm({ areas, sel }: { areas: any[]; sel: { area: string; vibe: string; budget: string } }) {
  const Field = ({ name, opts, cur }: { name: string; opts: [string, string][]; cur: string }) => (
    <div className="pl-chips">
      {opts.map(([k, l]) => {
        const params = new URLSearchParams({ area: sel.area, vibe: sel.vibe, budget: sel.budget });
        params.set(name, k);
        return <Link key={k} href={`/plan?${params.toString()}`} className={`pl-chip ${cur === k ? 'on' : ''}`}>{l}</Link>;
      })}
    </div>
  );
  return (
    <div className="pl-form">
      <div className="pl-q">อยากเที่ยวสไตล์ไหน?</div>
      <Field name="vibe" cur={sel.vibe} opts={Object.entries(VIBES).map(([k, v]) => [k, v.th])} />
      <div className="pl-q">งบต่อคน</div>
      <Field name="budget" cur={sel.budget} opts={Object.entries(BUDGETS).map(([k, v]) => [k, v.th])} />
      <div className="pl-q">ย่านไหน</div>
      <Field name="area" cur={sel.area} opts={[['', 'ทุกย่าน'], ...areas.map((a: any): [string, string] => [a.slug, i18n(a.name_i18n)])]} />
    </div>
  );
}

export default async function Plan({ searchParams }: { searchParams: { area?: string; vibe?: string; budget?: string; q?: string } }) {
  // free-text sentence ("คืนนี้มีแฟน งบ 1,000 แถวนิมมาน") → parsed; explicit chip params override it
  const qtext = (searchParams?.q ?? '').slice(0, 120).trim();
  const parsed = qtext ? parsePlan(qtext) : null;
  const area = (searchParams?.area ?? parsed?.area ?? '').replace(/[^a-z_]/g, '');
  const vibe = VIBES[searchParams?.vibe ?? ''] ? searchParams!.vibe! : (parsed?.isPlan ? parsed!.vibe : '');
  const budget = BUDGETS[searchParams?.budget ?? ''] ? searchParams!.budget! : (parsed?.budget || '500_1000');
  const dp = daypart(bkkNow());

  const areas = await q<any>(
    `SELECT dist.slug, dist.name_i18n FROM places p JOIN districts dist ON dist.id=p.district_id
      WHERE p.status='published' AND p.is_visible AND NOT p.offers_stay
      GROUP BY dist.slug, dist.name_i18n ORDER BY count(*) DESC`).catch(() => []);

  const header = (
    <div className="top">
      <Link className="back" href="/"><Icon n="back" size={18} /> สำรวจ</Link>
      <div className="hi"><Icon n="sparkles" size={15} /> {dp.greet} · ไกด์ท้องถิ่น</div>
      <h1>วางแผนเที่ยวให้ฉัน</h1>
      <p className="top-sub">เลือกสไตล์ งบ และย่าน แล้วเราจัดเส้นทางจากร้านจริงให้</p>
    </div>
  );

  // not enough chosen yet → show the picker
  if (!vibe) {
    return (<>{header}<PlanForm areas={areas} sel={{ area, vibe, budget }} /></>);
  }

  // ── build the itinerary: one best, currently-sensible place per slot ──
  const plan = VIBES[vibe];
  const maxBudget = BUDGETS[budget].max;
  const used: string[] = [];
  const stops: any[] = [];
  for (const slot of plan.slots) {
    const subs = slot.subs ?? [];
    const rows = await q<any>(
      `SELECT p.id, p.name_i18n, p.subcategory, p.category::text category, p.price_band::text price_band,
              p.opening_hours, p.geo::text geo, rv.n::int rev_n, rv.avg::text rev_avg
         FROM places p
         LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
           WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
        WHERE p.status='published' AND p.is_visible AND NOT p.offers_stay
          AND p.subcategory = ANY($1::text[])
          AND ($2='' OR p.id <> ALL($3::uuid[]))
          AND ($4='' OR p.district_id=(SELECT id FROM districts WHERE slug=$4))
          AND ($5=0 OR p.price_band::text::int >= $5)
        ORDER BY (rv.n>=5 AND rv.avg>=4.4) DESC, rv.n DESC NULLS LAST, p.verified_at DESC NULLS LAST
        LIMIT 1`,
      [subs, used.length ? 'x' : '', used, area, slot.minPrice ?? 0]);
    let pick = rows[0];
    // relax area if nothing found in the chosen neighbourhood
    if (!pick && area) {
      const r2 = await q<any>(
        `SELECT p.id, p.name_i18n, p.subcategory, p.category::text category, p.price_band::text price_band,
                p.opening_hours, p.geo::text geo, rv.n::int rev_n, rv.avg::text rev_avg
           FROM places p
           LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
             WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
          WHERE p.status='published' AND p.is_visible AND NOT p.offers_stay
            AND p.subcategory = ANY($1::text[]) AND ($2='' OR p.id <> ALL($3::uuid[]))
          ORDER BY rv.n DESC NULLS LAST LIMIT 1`, [subs, used.length ? 'x' : '', used]);
      pick = r2[0];
    }
    if (pick) { used.push(pick.id); stops.push({ ...pick, slot }); }
  }

  const total = stops.reduce((s, st) => s + (PB_COST[st.price_band] ?? 200), 0);
  const overBudget = total > maxBudget;
  const pins = stops.map((s) => { const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(s.geo || ''); return m ? { lat: parseFloat(m[2]), lng: parseFloat(m[1]), cat: s.category } : null; }).filter(Boolean) as any[];

  return (
    <>
      {header}
      {qtext && (parsed?.chips.length ?? 0) > 0 && (
        <div className="pl-understood">
          <Icon n="sparkles" size={14} /> <span>จาก “{qtext}” เข้าใจว่า:</span>
          {parsed!.chips.map((c, i) => <span className="pl-uchip" key={i}>{c}</span>)}
        </div>
      )}
      <PlanForm areas={areas} sel={{ area, vibe, budget }} />

      {stops.length === 0 ? (
        <p className="empty">ยังจัดเส้นทางไม่ได้ในเงื่อนไขนี้ — ลองเปลี่ยนย่านหรือสไตล์ดู</p>
      ) : (
        <>
          <div className="pl-summary">
            <div><span className="pl-sl">แผน{plan.th}</span><span className="pl-sv">{stops.length} ที่ · {area ? i18n(areas.find((a: any) => a.slug === area)?.name_i18n) : 'ทั่วเชียงใหม่'}</span></div>
            <div className={`pl-cost ${overBudget ? 'over' : ''}`}>~฿{total.toLocaleString()}<span>/คน</span></div>
          </div>
          {overBudget && <p className="pl-warn">⚠ ประเมินแล้วเกินงบที่ตั้งไว้ ({BUDGETS[budget].th}) — ลองลดสไตล์หรูลง หรือเพิ่มงบ</p>}

          {pins.length > 0 && <MapPeek pins={pins} />}

          <div className="pl-route">
            {stops.map((s, i) => (
              <Link className="pl-stop" key={s.id} href={`/place/${s.id}`}>
                <div className="pl-num">{i + 1}</div>
                <img className="pl-img" src={cover(s.id, s.subcategory, s.category, 130, 130)} alt="" loading="lazy" />
                <div className="pl-body">
                  <div className="pl-slot">{s.slot.label}</div>
                  <div className="pl-name">{i18n(s.name_i18n)}</div>
                  <div className="pl-meta">
                    {(() => { const o = openNow(s.opening_hours); return o.open ? <span className={`openpip ${o.closesSoon ? 'soon' : ''}`}><i /> {o.label}</span> : o.label ? <span className="openpip closed"><i /> {o.label}</span> : null; })()}
                    <span>{s.subcategory || catTH(s.category)}</span>
                    {s.price_band && <><span className="mdot">·</span><span>{'฿'.repeat(Number(s.price_band))}</span></>}
                    {Number(s.rev_avg) > 0 && <><span className="mdot">·</span><span>★ {s.rev_avg}</span></>}
                  </div>
                  <div className="pl-note">{s.slot.note} · ~฿{PB_COST[s.price_band] ?? 200}/คน</div>
                </div>
                <Icon n="chevR" size={18} className="pl-go" />
              </Link>
            ))}
          </div>
          <p className="note" style={{ padding: '0 16px' }}>ประเมินค่าใช้จ่ายคร่าวๆ จากระดับราคาของร้าน — ใช้เป็นไกด์ ไม่ใช่ราคาจริง</p>
        </>
      )}
    </>
  );
}
