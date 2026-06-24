// Seasonal-aware stay quote — shared by the booking FORM (client preview) and createPaidBookingAction
// (server authority) so the amount shown is exactly the amount recorded. Pure (no DB / no money moved).
// A night is priced by the first matching rate (ad-hoc window OR season window, recurring = month-day
// match), else the listing's base price. Monthly = months × the rate covering the move-in date.
export type Rate = { price: number; start: string | null; end: string | null; seasonStart: string | null; seasonEnd: string | null; recurs: boolean };

function priceForDate(date: string, base: number, rates: Rate[]): number {
  const md = date.slice(5); // MM-DD
  for (const r of rates) {
    if (r.recurs && r.seasonStart && r.seasonEnd) {
      const ss = r.seasonStart.slice(5), ee = r.seasonEnd.slice(5);
      const inRange = ss <= ee ? (md >= ss && md <= ee) : (md >= ss || md <= ee); // wraps year-end
      if (inRange) return r.price;
    } else {
      const s = r.start || r.seasonStart, e = r.end || r.seasonEnd;
      if (s && e && date >= s && date <= e) return r.price;
    }
  }
  return base;
}

const nextDay = (ymd: string) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

/** amount (minor) + nights for a stay. daily = sum of per-night prices over [from,to); monthly = months × move-in rate. */
export function quoteStay(mode: string, from: string | null, to: string | null, months: number, base: number, rates: Rate[]): { amount: number; nights: number } {
  if (mode === 'daily') {
    if (!from || !to || to <= from) return { amount: 0, nights: 0 };
    let amount = 0, nights = 0, d = from;
    while (d < to && nights < 400) { amount += priceForDate(d, base, rates); nights++; d = nextDay(d); }
    return { amount, nights };
  }
  const mPrice = from ? priceForDate(from, base, rates) : base;
  return { amount: mPrice * Math.max(1, months), nights: 0 };
}
