import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { loadAmenityCatalog } from '@/lib/amenities';
import { isUuid } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { RoomForm } from '../RoomForm';
import { createStayUnitAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewRoom({ searchParams }: { searchParams: { error?: string; from?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const typeNoun = acc.room_mode === 'unique' ? 'ห้อง' : 'รูปแบบห้อง';
  const backLabel = acc.room_mode === 'unique' ? 'ห้อง' : 'ห้องพัก';
  const cat = await loadAmenityCatalog();

  // "ทำสำเนาจากสาขาอื่น": room types in the owner's OTHER branches (ownership via brand). Prefill only —
  // each branch keeps its own price/photos/vacancy, so cloning copies the descriptive fields as a starting point.
  const cloneRows = await q<any>(
    `SELECT su.id, su.name_i18n, p.name_i18n AS place_name
       FROM stay_units su JOIN places p ON p.id = su.place_id JOIN brands b ON b.id = p.brand_id AND b.deleted_at IS NULL
      WHERE b.owner_account_id = $1 AND su.place_id <> $2 AND su.deleted_at IS NULL AND su.status = 'published'
      ORDER BY p.created_at, su.sort, su.created_at LIMIT 40`, [acc.id, acc.place_id]);
  const cloneSources = cloneRows.map((r) => ({ id: r.id, label: `${i18n(r.place_name)} · ${i18n(r.name_i18n)}` }));

  // a chosen template (?from=) must belong to the SAME account (any branch) — never trust the id blindly.
  let tmpl: any = null;
  if (searchParams?.from && isUuid(searchParams.from)) {
    [tmpl] = await q<any>(
      `SELECT su.* FROM stay_units su JOIN places p ON p.id = su.place_id JOIN brands b ON b.id = p.brand_id AND b.deleted_at IS NULL
        WHERE su.id = $1 AND b.owner_account_id = $2 AND su.place_id <> $3 AND su.deleted_at IS NULL`,
      [searchParams.from, acc.id, acc.place_id]);
  }

  return (
    <>
      <MTopbar back="/merchant/rooms" backLabel={backLabel} title={`เพิ่ม${typeNoun}`} />
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อ{typeNoun}</div>}
      <RoomForm action={createStayUnitAction} submitLabel={`เพิ่ม${typeNoun}`} noun={typeNoun} stayKind={acc.stay_kind} amenOpts={cat.amenity} buildOpts={cat.building} billOpts={cat.bills} cloneSources={cloneSources} tmpl={tmpl} />
    </>
  );
}
