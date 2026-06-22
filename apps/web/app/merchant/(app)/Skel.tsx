// Static skeleton placeholders rendered by the route loading.tsx files. App-Router shows these inside the
// persistent shell (top bar + bottom nav stay put) the instant a soft navigation starts, until the target
// route's server data resolves — so switching screens feels instant instead of "stuck". Shapes mirror the
// real pages so the swap doesn't jump.

function Bar({ w, h = 14, r = 7, mt = 0 }: { w: number | string; h?: number; r?: number; mt?: number }) {
  return <div className="skel" style={{ width: typeof w === 'number' ? `${w}%` : w, height: h, borderRadius: r, marginTop: mt }} />;
}

// generic page: title + subtitle + a column of rows (covers home menu, leads, pricing, shop, loyalty, …)
export function SkelPage({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mskel" aria-busy="true" aria-label="กำลังโหลด">
      <Bar w={48} h={26} r={8} />
      <Bar w={70} h={13} mt={10} />
      <div style={{ height: 18 }} />
      <div className="mskel-list">
        {Array.from({ length: rows }).map((_, i) => <div key={i} className="skel mskel-row" />)}
      </div>
    </div>
  );
}

// rooms hub (ประเภท & ราคา): header + add button + segment tabs + room-type cards
export function SkelRooms() {
  return (
    <div className="mskel" aria-busy="true" aria-label="กำลังโหลด">
      <div className="mskel-head"><Bar w={120} h={24} r={8} /><div className="skel" style={{ width: 96, height: 34, borderRadius: 10 }} /></div>
      <div className="mskel-seg"><div className="skel" style={{ flex: 1, height: 34, borderRadius: 9 }} /><div className="skel" style={{ flex: 1, height: 34, borderRadius: 9 }} /></div>
      <Bar w={80} h={12} mt={10} />
      <div className="mskel-list" style={{ marginTop: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel mskel-card" />)}
      </div>
    </div>
  );
}

// units board (ผังห้อง): header + segment + floor groups with a grid of room chips
export function SkelBoard() {
  return (
    <div className="mskel" aria-busy="true" aria-label="กำลังโหลด">
      <div className="mskel-head"><Bar w={120} h={24} r={8} /><div className="skel" style={{ width: 96, height: 34, borderRadius: 10 }} /></div>
      <div className="mskel-seg"><div className="skel" style={{ flex: 1, height: 34, borderRadius: 9 }} /><div className="skel" style={{ flex: 1, height: 34, borderRadius: 9 }} /></div>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} style={{ marginTop: 18 }}>
          <Bar w={28} h={13} />
          <div className="mskel-grid">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel mskel-chip" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
