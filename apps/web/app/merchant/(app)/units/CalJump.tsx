'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui';

// Jump the property calendar straight to any date (the prev/next arrows only step one window at a time).
export function CalJump({ value, month }: { value: string; month: boolean }) {
  const router = useRouter();
  return (
    <label className="caljump" title="ไปวันที่">
      <Icon n="calendar" size={15} />
      <input
        type="date"
        defaultValue={value}
        aria-label="ไปวันที่"
        onChange={(e) => { if (e.target.value) router.push(`/merchant/units/calendar?d=${e.target.value}${month ? '&w=month' : ''}`); }}
      />
    </label>
  );
}
