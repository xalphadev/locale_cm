// Static skeleton placeholders shown by the route loading.tsx files while a soft navigation resolves the
// target page's server data — the bottom nav stays put and the content area shimmers instead of going blank.

function L({ w, h = 13, r = 7, mt = 0 }: { w: number | string; h?: number; r?: number; mt?: number }) {
  return <div className="cskel" style={{ width: typeof w === 'number' ? `${w}%` : w, height: h, borderRadius: r, marginTop: mt }} />;
}

// generic page (home/feed/lists): a header strip + a column of media cards
export function SkelFeed() {
  return (
    <div className="cskelpg" aria-busy="true" aria-label="กำลังโหลด">
      <div className="cskel-top">
        <div className="cskel" style={{ width: 44, height: 44, borderRadius: 999, flex: 'none' }} />
        <div style={{ flex: 1 }}><L w={50} h={15} /><L w={32} h={11} mt={7} /></div>
      </div>
      <div className="cskel-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="cskel-card" key={i}>
            <div className="cskel" style={{ width: '100%', height: 150, borderRadius: 18 }} />
            <L w={70} h={14} mt={4} />
            <L w={45} h={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

// stay search results: a search pill + a row of filter chips + stay cards
export function SkelStay() {
  return (
    <div className="cskelpg" aria-busy="true" aria-label="กำลังโหลด">
      <div className="cskel" style={{ width: '100%', height: 52, borderRadius: 16 }} />
      <div className="cskel-chips">
        {Array.from({ length: 5 }).map((_, i) => <div className="cskel" key={i} style={{ width: 76, height: 34, borderRadius: 999, flex: 'none' }} />)}
      </div>
      <div className="cskel-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="cskel-card" key={i}>
            <div className="cskel" style={{ width: '100%', height: 168, borderRadius: 20 }} />
            <L w={64} h={15} mt={4} />
            <L w={40} h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

// place / stay detail: full-bleed hero + title, chips, body lines
export function SkelDetail() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด">
      <div className="cskel cskel-hero" style={{ height: 280, borderRadius: 0 }} />
      <div className="cskel-detail">
        <L w={66} h={24} r={8} />
        <L w={40} h={13} mt={10} />
        <div className="cskel-chips" style={{ margin: '16px 0' }}>
          {Array.from({ length: 3 }).map((_, i) => <div className="cskel" key={i} style={{ width: 84, height: 30, borderRadius: 999, flex: 'none' }} />)}
        </div>
        {Array.from({ length: 5 }).map((_, i) => <L key={i} w={i === 4 ? 55 : '100%'} h={12} mt={10} />)}
      </div>
    </div>
  );
}
