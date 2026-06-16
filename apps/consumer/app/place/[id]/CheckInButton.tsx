'use client';
import { useState, useTransition } from 'react';
import { stampCheckInAction } from '../../actions';
import { Icon } from '../../icons';

// Sends the DEVICE's GPS to the server-authoritative geofence (fn_shop_checkin). The server, not the
// client, decides if you're in range — runs on a real PostGIS DB (the local stub can't run ST_DWithin).
export default function CheckInButton({ placeId, pointsName }: { placeId: string; pointsName: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  function go() {
    setMsg(null);
    if (!navigator.geolocation) { setMsg({ ok: false, t: 'อุปกรณ์ไม่รองรับตำแหน่ง' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => start(async () => {
        try {
          await stampCheckInAction(placeId, pos.coords.longitude, pos.coords.latitude);
          setMsg({ ok: true, t: `✓ เช็คอินสำเร็จ — รับ${pointsName}แล้ว!` });
        } catch {
          setMsg({ ok: false, t: 'เช็คอินไม่สำเร็จ — ต้องอยู่ในรัศมีร้าน' });
        }
      }),
      () => setMsg({ ok: false, t: 'เปิดสิทธิ์ตำแหน่งก่อนนะ' }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <>
      <button className="pstamp-checkin" onClick={go} disabled={pending} type="button">
        <Icon n="pin" size={17} /> {pending ? 'กำลังเช็คอิน…' : `เช็คอินรับ${pointsName}`}
      </button>
      {msg && <div className={`pstamp-msg ${msg.ok ? 'ok' : 'no'}`}>{msg.t}</div>}
    </>
  );
}
