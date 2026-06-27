'use client';
import { useState } from 'react';
import DateRangePicker from '../../DateRangePicker';

// The only client code on the หาห้องว่าง page: the date-range picker in a GET form that navigates to
// ?from=YYYY-MM-DD&to=YYYY-MM-DD (DateRangePicker writes those as hidden inputs).
export default function AvailabilitySearch() {
  const [ok, setOk] = useState(false);
  return (
    <form method="get" className="avail-search">
      <DateRangePicker fromName="from" toName="to" labelFrom="เช็คอิน" labelTo="เช็คเอาท์ (วันออก)" onChange={(f, t) => setOk(!!(f && t))} />
      <button type="submit" className="dbtn primary avail-go" disabled={!ok}>ดูห้องที่ว่าง</button>
    </form>
  );
}
