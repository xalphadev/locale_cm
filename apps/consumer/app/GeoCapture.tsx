'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Grab-style "near me" lens: writes the user's COARSE position (3 decimals ≈ a 110m grid —
// deliberately imprecise, same PDPA stance as users.last_geo_coarse) into a `c_geo` cookie so
// server queries can rank by real distance. Two behaviours:
//   • want=true  (user tapped ใกล้ฉัน) — that tap is the user gesture, so prompting is fine.
//   • otherwise  — refresh silently ONLY when permission was already granted; never prompt.
// router.refresh() re-runs the server component with the new cookie, so the list re-ranks in place.
export default function GeoCapture({ want, has }: { want: boolean; has: boolean }) {
  const router = useRouter();
  useEffect(() => {
    let gone = false;
    const save = (pos: GeolocationPosition) => {
      if (gone) return;
      const next = `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`;
      const cur = document.cookie.match(/(?:^|; )c_geo=([^;]*)/)?.[1];
      document.cookie = `c_geo=${next}; path=/; max-age=${60 * 60 * 6}; samesite=lax`;
      if (cur !== next) router.refresh();
    };
    const grab = () => navigator.geolocation?.getCurrentPosition(save, () => {}, { maximumAge: 300000, timeout: 8000 });
    if (want && !has) grab();
    else if (!has && typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((p) => { if (p.state === 'granted') grab(); })
        .catch(() => {});
    }
    return () => { gone = true; };
  }, [want, has, router]);
  return null;
}
