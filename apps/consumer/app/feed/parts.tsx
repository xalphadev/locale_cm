import Link from 'next/link';
import { i18n, cover } from '@/lib/db';
import { Icon } from '../icons';
import { toggleLikeAction, addCommentAction } from '../actions';
import ShareButton from '../ShareButton';
import { priceText } from '../ProductCard';

export const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
export const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
export const daysLeft = (e: any) => (e ? Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000)) : null);
export function relTime(ts: any) {
  const m = (Date.now() - new Date(ts).getTime()) / 60000;
  if (m < 1) return 'เมื่อสักครู่'; if (m < 60) return `${Math.floor(m)} นาที`; if (m < 1440) return `${Math.floor(m / 60)} ชม.`; return `${Math.floor(m / 1440)} วันก่อน`;
}
const IMG_N: Record<string, number> = { deal: 3, new: 4, event: 3, verified: 1, review: 1 };
const AV_COLORS = ['var(--accent)', 'var(--spark)', 'var(--score)', 'var(--navy)', '#E0245E', '#E67E22'];
const avColor = (s: string) => AV_COLORS[(s || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];

export function postKey(it: any) {
  return it.kind === 'deal' ? `deal:${it.did}` : it.kind === 'review' ? `review:${it.rid}`
    : it.kind === 'event' ? `event:${it.eid}` : it.kind === 'post' ? `post:${it.pgid}`
      : it.kind === 'product' ? `product:${it.id}` : `${it.kind}:${it.pid}`;
}
export function hrefFor(it: any) {
  return it.kind === 'event' ? `/event/${it.eid}` : `/place/${it.pid}`;
}
export function detailHref(it: any) {
  return `/feed/${encodeURIComponent(postKey(it))}`;
}
function poster(it: any): { name: string; sub: string; av: string; color: string; verified: boolean } {
  if (it.kind === 'review') return { name: it.display_name || 'ผู้ใช้', sub: `รีวิว ${i18n(it.pname)}`, av: (it.display_name || 'ผ')[0], color: 'var(--spark)', verified: false };
  if (it.kind === 'verified') return { name: 'ทีมงาน Locale', sub: 'ตรวจสอบข้อมูลแล้ว', av: 'S', color: 'var(--navy)', verified: true };
  if (it.kind === 'event') return { name: i18n(it.title_i18n), sub: 'กิจกรรม · นิมมาน', av: (i18n(it.title_i18n) || 'อ')[0], color: 'var(--accent)', verified: true };
  if (it.kind === 'product') return { name: i18n(it.pname), sub: 'สินค้าใหม่ · นิมมาน', av: (i18n(it.pname) || 'ร')[0], color: 'var(--score)', verified: true };
  const role = it.kind === 'deal' ? 'โปรโมชั่น' : it.kind === 'new' ? 'เปิดใหม่' : (it.psub || catTH(it.pcat));
  return { name: i18n(it.pname), sub: `${role} · นิมมาน`, av: (i18n(it.pname) || 'ร')[0], color: 'var(--accent)', verified: true };
}
// images for a post: merchant-uploaded urls if any, else category placeholders × count
const PROD_POOL: Record<string, string> = { bakery: 'dessert', menu_item: 'restaurant' };
export function imagesFor(it: any): string[] {
  const seed = it.pid || it.eid || it.pgid || it.kind;
  if (it.kind === 'post') {
    if (it.image_urls && it.image_urls.length) return it.image_urls;
    return Array.from({ length: it.image_count || 1 }, (_, k) => cover(`${seed}-${k}`, it.psub, it.pcat, 680, 460));
  }
  if (it.kind === 'product') {
    if (it.image_urls && it.image_urls.length) return it.image_urls;
    return [cover('prod-' + it.id, PROD_POOL[it.subtype] || 'market', it.pcat, 680, 460)];
  }
  if (it.kind === 'event') return [cover('event' + it.eid, it.ekind, 'see', 680, 460)];
  const n = IMG_N[it.kind] || 1;
  return Array.from({ length: n }, (_, k) => cover(`${seed}-${k}`, it.psub, it.pcat, 680, 460));
}

// Facebook-style photo collage: 1 full · 2 side-by-side · 3 (big + 2 stacked) · 4 grid · 5+ "+N"
export function Collage({ imgs, href }: { imgs: string[]; href: string }) {
  const n = imgs.length;
  const cls = n <= 1 ? 'cg1' : n === 2 ? 'cg2' : n === 3 ? 'cg3' : 'cg4';
  const show = imgs.slice(0, 4); const extra = n - 4;
  return (
    <Link href={href} className={`collage ${cls}`}>
      {show.map((u, k) => (
        <span className="ci" key={k}>
          <img src={u} alt="" loading="lazy" />
          {k === 3 && extra > 0 && <span className="more-ov">+{extra}</span>}
        </span>
      ))}
    </Link>
  );
}

function Caption({ it, p }: { it: any; p: ReturnType<typeof poster> }) {
  return (
    <>
      {it.kind === 'post' && <><b className="ph-h">{p.name}</b> {i18n(it.body_i18n)}</>}
      {it.kind === 'product' && <><b className="ph-h">{i18n(it.pname)}</b> {i18n(it.prod_name)} · <span className="ph-price">{priceText(it)}</span></>}
      {it.kind === 'deal' && <><span className="dl">{dealLabel(it.deal_type, it.value_pct, it.value_minor)}</span> {i18n(it.dtitle)}{daysLeft(it.ends_at) != null ? ` — เหลืออีก ${daysLeft(it.ends_at)} วัน${it.quota_total ? ` · เหลือ ${it.quota_total - it.quota_used} สิทธิ์` : ''}` : ''}</>}
      {it.kind === 'event' && <><b className="ph-h">{p.name}</b> {i18n(it.description_i18n) || ''} · {it.d} {THM[it.m - 1]}</>}
      {it.kind === 'review' && <><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{'★'.repeat(it.rating)}</span> {i18n(it.body_i18n)}</>}
      {it.kind === 'verified' && <>ทีมงานท้องถิ่นเพิ่งตรวจสอบข้อมูล <b className="ph-h">{i18n(it.pname)}</b> ว่าสด ใหม่ ถูกต้อง — เปิดจริง พิกัด/เวลาอัปเดตแล้ว</>}
      {it.kind === 'new' && <><b className="ph-h">{i18n(it.pname)}</b> เปิดใหม่แล้วในนิมมาน — {it.psub || catTH(it.pcat)} น่าไปลอง</>}
    </>
  );
}

/**
 * One feed post card (Instagram-style).
 * mode "list"  → comments are NOT shown inline; the comment icon + "view all" link open the detail view.
 * mode "detail"→ full comment thread + composer rendered beneath the card.
 */
export function PostCard({ it, lk, comments, commentCount, mode }: {
  it: any; lk: { c: number; liked: boolean }; comments?: any[]; commentCount: number; mode: 'list' | 'detail';
}) {
  const p = poster(it);
  const key = postKey(it);
  const href = hrefFor(it);
  const dhref = detailHref(it);
  const imgs = imagesFor(it);
  const commentTarget = mode === 'list' ? dhref : '#cf';

  return (
    <article className="post">
      <header className="ph">
        <span className="post-av ph-av" style={{ background: p.color }}>{p.av}</span>
        <Link className="ph-meta" href={href}>
          <div className="ph-name">{p.name}{p.verified && <span className="vbadge"><Icon n="check" size={9} fill="#fff" /></span>}</div>
          <div className="ph-sub"><Icon n={it.kind === 'event' ? 'calendar' : 'pin'} size={11} /> {p.sub}</div>
        </Link>
        <Icon n="dots" size={18} style={{ color: 'var(--hint)' }} />
      </header>

      <Collage imgs={imgs} href={href} />

      <div className="ph-actions">
        <form className="actf2" action={toggleLikeAction.bind(null, key)}>
          <button type="submit" className={`pa ${lk.liked ? 'liked' : ''}`} aria-label="ถูกใจ"><Icon n="heart" size={24} fill={lk.liked ? 'currentColor' : 'none'} /></button>
        </form>
        {commentTarget.startsWith('#')
          ? <a className="pa" href={commentTarget} aria-label="คอมเมนต์"><Icon n="chat" size={23} /></a>
          : <Link className="pa" href={commentTarget} aria-label="คอมเมนต์"><Icon n="chat" size={23} /></Link>}
        <ShareButton href={href} title={p.name} variant="icon" />
        <span className="pa-sp" />
        <Link className="pa" href={href} aria-label="บันทึก"><Icon n="bookmark" size={22} /></Link>
      </div>

      {lk.c > 0 && (
        <div className="ph-likes"><span className="ph-faces"><i style={{ background: 'var(--accent)' }} /><i style={{ background: 'var(--spark)' }} /><i style={{ background: 'var(--gold)' }} /></span><span>ถูกใจ <b>{lk.c.toLocaleString()}</b> ครั้ง</span></div>
      )}

      <Link className="ph-cap" href={href}><Caption it={it} p={p} /></Link>

      <div className="ph-time">{relTime(it.ts)}</div>

      {mode === 'list' ? (
        <Link className="ph-vc" href={dhref}>
          {commentCount > 0 ? `ดูความคิดเห็นทั้งหมด ${commentCount} รายการ` : 'แสดงความคิดเห็น'}
        </Link>
      ) : (
        <div className="cthread">
          {(comments || []).length === 0 && <p className="cmt-empty">ยังไม่มีความคิดเห็น — มาเป็นคนแรกที่ทักทายร้านนี้สิ</p>}
          {(comments || []).map((c: any, j: number) => (
            <div className="crow" key={j}>
              <span className="crow-av" style={{ background: avColor(c.display_name || '?') }}>{(c.display_name || 'ผ')[0]}</span>
              <div className="crow-body">
                <div className="crow-h"><b>{c.display_name || 'ผู้ใช้'}</b><span className="crow-t">{relTime(c.created_at)}</span></div>
                <div className="crow-b">{c.body}</div>
              </div>
            </div>
          ))}
          <form className="cmt-form" id="cf" action={addCommentAction.bind(null, key)}>
            <input name="body" placeholder="เขียนความคิดเห็น…" autoComplete="off" maxLength={300} required />
            <button type="submit">ส่ง</button>
          </form>
        </div>
      )}
    </article>
  );
}
