import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { q } from '@/lib/db';
import { runMonthlyBilling } from '@/lib/billing';

export const dynamic = 'force-dynamic';

// Headless auto-billing (record-only). Generates THIS MONTH's rent+utility invoice for every active lease of
// every monthly/both property that turned on auto-billing (utility_rates.auto_bill = true). Idempotent per
// (lease, month) — safe to run daily; already-billed leases return 'exists' and are skipped. There is no login
// here, so per property we act AS the owner account (b.owner_account_id → stay_invoice.created_by).
//
// SECURITY: guarded by CRON_SECRET (fail-closed) via the `x-cron-secret` header only, compared in constant time.
// This route is ALSO blocked at the public Caddy vhosts (see Caddyfile), so it is only reachable from INSIDE the
// web container. Trigger it from the VM crontab on the 1st by running the request inside the container, e.g.:
//   0 6 1 * *  docker exec locale-web wget -qO- --header="x-cron-secret: $CRON_SECRET" http://localhost:3002/api/cron/generate-bills
// (set CRON_SECRET in .env.prod → docker-compose.prod.yml web env). Keep it out of any public path.

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || '';
  const given = req.headers.get('x-cron-secret') || '';
  if (!secret || given.length !== secret.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  } catch {
    return false;
  }
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Same scope as the merchant "ออกบิลทั้งหอ" button (which has no publish gate) — auto_bill is an explicit
  // per-property opt-in, and manages_stay is orthogonal to marketplace publishing, so an unpublished-but-
  // operating rental still gets billed. Only monthly/both properties with a resolvable owner account.
  const places = await q<{ place_id: string; owner_id: string }>(
    `SELECT p.id place_id, b.owner_account_id owner_id
       FROM places p JOIN brands b ON b.id=p.brand_id AND b.deleted_at IS NULL
      WHERE p.manages_stay = true AND p.stay_mode IN ('monthly','both')
        AND COALESCE(p.utility_rates->>'auto_bill','') = 'true' AND b.owner_account_id IS NOT NULL`);

  const results: any[] = [];
  const totals = { made: 0, existing: 0, norent: 0, nometer: 0 };
  for (const p of places) {
    try {
      const r = await runMonthlyBilling({ id: p.owner_id, place_id: p.place_id }, '');   // '' → current month
      totals.made += r.made; totals.existing += r.existing; totals.norent += r.norent; totals.nometer += r.nometer;
      results.push({ place_id: p.place_id, ...r });
    } catch (e: any) {
      results.push({ place_id: p.place_id, error: String(e?.message || e) });
    }
  }
  return NextResponse.json({ ok: true, properties: places.length, totals, results });
}

export async function POST(req: NextRequest) { return run(req); }
export async function GET(req: NextRequest) { return run(req); }
