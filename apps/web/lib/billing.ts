import crypto from 'crypto';
import { q } from './db';

// Shared monthly rent+utility invoice logic (record-only, 0059/0064). Extracted from merchant/actions.ts so
// BOTH the merchant server actions AND the headless auto-billing cron route can reuse the exact same builder.
// Never posts to the ledger / holds money — the platform only RECORDS the bill; the owner collects offline.

// SELECT that loads everything genInvoiceForLease needs (shared by the single + batch actions + the cron sweep).
export const LEASE_FOR_BILL = `l.id, l.room_id, l.tenant_id, l.rent_minor, COALESCE(l.billing_day,1) billing_day, to_char(l.start_date,'YYYY-MM-DD') start_ymd, l.attrs,
            su.bills_included, p.utility_rates
       FROM stay_lease l
       LEFT JOIN stay_units su ON su.id=l.stay_unit_id
       JOIN places p ON p.id=l.place_id`;

/** Build + insert ONE lease's invoice for a period (record-only). Returns a status (no redirect) so the
 *  single-lease action, the batch action, and the cron sweep share the exact same logic. `ls` must be loaded
 *  via LEASE_FOR_BILL; `acc` must supply { place_id, id } (id → created_by). Idempotent per (lease, month). */
export async function genInvoiceForLease(acc: any, ls: any, periodIn: string): Promise<{ status: 'ok' | 'exists' | 'norent'; skipped: string[] }> {
  if (ls.rent_minor == null) return { status: 'norent', skipped: [] };
  const period = /^\d{4}-\d{2}$/.test(periodIn) ? periodIn : null;
  // period + สคบ. dates in pg (no TZ drift): due = billing_day of the month (day clamped to month length),
  // pushed to ≥ CURRENT_DATE+3 so the ≥3-day-notice rule always holds; issue = today.
  const [dt] = await q<{ period: string; issue: string; due: string }>(
    `WITH d AS (SELECT COALESCE($1, to_char(CURRENT_DATE,'YYYY-MM')) ym)
     SELECT ym period, to_char(CURRENT_DATE,'YYYY-MM-DD') issue,
            to_char(GREATEST(
              (to_date(ym||'-01','YYYY-MM-DD')
                 + (LEAST($2::int, EXTRACT(day FROM (to_date(ym||'-01','YYYY-MM-DD') + interval '1 month - 1 day'))::int) - 1) * interval '1 day')::date,
              CURRENT_DATE + 3), 'YYYY-MM-DD') due
       FROM d`, [period, ls.billing_day]);
  const rates: any = { ...(ls.utility_rates || {}), ...((ls.attrs && ls.attrs.utility_rates) || {}) };
  const bills: string[] = ls.bills_included || [];
  const lines: any[] = [{ kind: 'rent', label: 'ค่าเช่า', amount: Number(ls.rent_minor), sort: 0 }];
  const skipped: string[] = [];                                   // metered utilities configured but not billable yet
  const meterLine = async (utility: 'electricity' | 'water', label: string, rate: number, sort: number) => {
    if (!(rate > 0) || bills.includes(utility)) return;           // not charged (no rate, or included in rent)
    // Usage is chained PER LEASE, not "the room's last 2 raw readings" — so a new tenant never inherits the
    // previous tenant's units across a move-out. Readings for this tenancy = stamped lease_id OR read on/after
    // the lease start. curr = latest such reading; prev = last billed curr_reading for this lease (from a NON-void
    // invoice — so a voided bill drops out of the chain), else the move-in baseline (earliest reading in tenancy).
    const [cur] = await q<{ reading_value: string }>(
      `SELECT reading_value FROM stay_meter_reading WHERE room_id=$1 AND utility=$2 AND (lease_id=$3 OR read_on >= $4::date)
        ORDER BY read_on DESC, created_at DESC LIMIT 1`, [ls.room_id, utility, ls.id, ls.start_ymd]);
    if (!cur) { skipped.push(utility); return; }
    const curr = Number(cur.reading_value);
    const [billed] = await q<{ curr_reading: string }>(
      `SELECT il.curr_reading FROM stay_invoice_line il JOIN stay_invoice i ON i.id=il.invoice_id
        WHERE i.lease_id=$1 AND i.status<>'void' AND i.deleted_at IS NULL AND il.kind=$2 AND il.curr_reading IS NOT NULL
        ORDER BY i.period_ym DESC, i.created_at DESC LIMIT 1`, [ls.id, utility]);
    let prev: number;
    if (billed) prev = Number(billed.curr_reading);
    else {
      const [base] = await q<{ reading_value: string }>(
        `SELECT reading_value FROM stay_meter_reading WHERE room_id=$1 AND utility=$2 AND (lease_id=$3 OR read_on >= $4::date)
          ORDER BY read_on ASC, created_at ASC LIMIT 1`, [ls.room_id, utility, ls.id, ls.start_ymd]);
      if (!base) { skipped.push(utility); return; }
      prev = Number(base.reading_value);
    }
    const units = curr - prev;
    if (!(units > 0)) { skipped.push(utility); return; }           // no new usage (or meter reset/typo) → omit + warn
    lines.push({ kind: utility, label, units, rate_minor: rate, prev, curr, amount: Math.round(units * rate), sort });
  };
  await meterLine('electricity', 'ค่าไฟ', Number(rates.electricity_minor_per_unit || 0), 1);
  if ((rates.water_mode || 'metered') === 'flat') {
    const wf = Number(rates.water_flat_minor || 0);
    if (wf > 0 && !bills.includes('water')) lines.push({ kind: 'water', label: 'ค่าน้ำ (เหมาจ่าย)', amount: wf, sort: 2 });
  } else {
    await meterLine('water', 'ค่าน้ำ', Number(rates.water_minor_per_unit || 0), 2);
  }
  const common = Number(rates.common_fee_minor || 0);
  if (common > 0 && !bills.includes('common_fee')) lines.push({ kind: 'common_fee', label: 'ค่าส่วนกลาง', amount: common, sort: 3 });
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  let invId: string;
  try {
    const [inv] = await q<{ id: string }>(
      `INSERT INTO stay_invoice(place_id, lease_id, room_id, tenant_id, period_ym, issue_date, due_date, subtotal_minor, total_minor, status, created_by, public_token)
         VALUES($1,$2,$3,$4,$5,$6::date,$7::date,$8,$8,'issued',$9,$10) RETURNING id`,
      [acc.place_id, ls.id, ls.room_id, ls.tenant_id, dt.period, dt.issue, dt.due, subtotal, acc.id, crypto.randomBytes(9).toString('hex')]);
    invId = inv.id;
  } catch (e: any) {
    if (e?.code === '23505') return { status: 'exists', skipped };   // one bill per lease per month
    throw e;
  }
  for (const l of lines) {
    await q(`INSERT INTO stay_invoice_line(invoice_id, kind, label, units, rate_minor, prev_reading, curr_reading, amount_minor, sort)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [invId, l.kind, l.label, l.units ?? null, l.rate_minor ?? null, l.prev ?? null, l.curr ?? null, l.amount, l.sort]);
  }
  await q(`UPDATE stay_invoice SET ref=$2 WHERE id=$1`, [invId, 'INV-' + invId.slice(0, 6).toUpperCase()]);
  return { status: 'ok', skipped };
}

/** Sweep every active lease of one property, generating each one's invoice for the period (idempotent per
 *  lease/month). Returns tallies. Used by the merchant batch button AND the auto-billing cron route. */
export async function runMonthlyBilling(acc: any, periodIn: string): Promise<{ made: number; existing: number; norent: number; nometer: number }> {
  const leases = await q<any>(
    `SELECT ${LEASE_FOR_BILL} WHERE l.place_id=$1 AND l.status='active' AND l.deleted_at IS NULL`, [acc.place_id]);
  let made = 0, existing = 0, norent = 0, nometer = 0;
  for (const ls of leases) {
    const r = await genInvoiceForLease(acc, ls, periodIn);
    if (r.status === 'ok') { made++; if (r.skipped.length) nometer++; }
    else if (r.status === 'exists') existing++;
    else norent++;
  }
  return { made, existing, norent, nometer };
}
