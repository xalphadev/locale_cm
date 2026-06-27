'use client';
import { useEffect, useState } from 'react';

// Toggle .in one frame AFTER mount so a freshly-mounted fixed bottom sheet actually transitions up
// (a React-conditional element rendered straight at translateY(0) won't animate). Shared by every
// calendar bottom sheet (date-picker, today-moves, tools, manage) so they all slide identically.
export function useSheetAnim(open: boolean) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) { setShown(false); return; }
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [open]);
  return shown;
}
