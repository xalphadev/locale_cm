'use client';
import { useEffect } from 'react';

// Opens the browser print dialog on load (small delay so the sheet is painted first) + a manual button.
export default function PrintTrigger() {
  useEffect(() => { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }, []);
  return <button className="btn btn-primary printbtn" type="button" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>;
}
