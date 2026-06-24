import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Icon } from '../../../icons';
import { q, i18n } from '@/lib/db';
import { createPaidBookingAction } from '../../../actions';
import { BookPayForm } from '../BookPayForm';

export const dynamic = 'force-dynamic';

// Online booking + slip payment (host-direct). Only reachable when the place turned on pay_online_enabled
// and set a receiving account. The guest picks dates → sees the amount → transfers to the host → uploads a
// slip. createPaidBookingAction records it (payment_status='submitted') for the host to verify. No money held.
export default async function BookPay({ params, searchParams }: { params: { id: string }; searchParams: { err?: string } }) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
  const [u] = isUuid ? await q<any>(
    `SELECT su.id, su.name_i18n, su.rental_mode, su.price_minor, su.capacity, su.image_urls,
            p.id place_id, p.name_i18n place_name, p.offers_stay, p.pay_online_enabled,
            p.pay_promptpay, p.pay_bank, p.pay_account_no, p.pay_account_name
       FROM stay_units su JOIN places p ON p.id = su.place_id
      WHERE su.id=$1 AND su.deleted_at IS NULL AND p.status='published' AND p.is_visible`, [params.id]) : [];
  if (!u || !u.offers_stay || !u.pay_online_enabled || u.price_minor == null) redirect(`/stay/${params.id}`);

  // seasonal rates (for a date-accurate quote — same maths the server records)
  const rateRows = await q<any>(
    `SELECT r.price_minor, to_char(r.start_date,'YYYY-MM-DD') start, to_char(r.end_date,'YYYY-MM-DD') "end",
            to_char(s.start_date,'YYYY-MM-DD') sstart, to_char(s.end_date,'YYYY-MM-DD') send, COALESCE(s.recurs_yearly,false) recurs
       FROM stay_rate r LEFT JOIN stay_season s ON s.id = r.season_id
      WHERE r.stay_unit_id=$1 AND r.deleted_at IS NULL AND (s.id IS NULL OR s.deleted_at IS NULL)
      ORDER BY r.price_minor`, [u.id]);
  const rates = rateRows.map((r) => ({ price: Number(r.price_minor), start: r.start, end: r.end, seasonStart: r.sstart, seasonEnd: r.send, recurs: !!r.recurs }));

  return (
    <div className="staybg">
      <div className="staytop">
        <Link className="back" href={`/stay/${params.id}`}><Icon n="back" size={18} /> {i18n(u.name_i18n)}</Link>
      </div>
      <h1 style={{ padding: '0 16px', margin: '6px 0 2px', fontSize: '1.5rem' }}>จองและชำระเงิน</h1>
      <p className="shopnote" style={{ margin: '2px 16px 14px' }}><Icon n="bed" size={13} /> {i18n(u.place_name)} · {i18n(u.name_i18n)}</p>

      <BookPayForm
        action={createPaidBookingAction.bind(null, u.place_id, u.id)}
        mode={u.rental_mode}
        basePriceMinor={Number(u.price_minor)}
        rates={rates}
        capacity={u.capacity || null}
        pay={{ promptpay: u.pay_promptpay || null, bank: u.pay_bank || null, accountNo: u.pay_account_no || null, accountName: u.pay_account_name || null }}
        err={searchParams?.err || null}
      />
    </div>
  );
}
