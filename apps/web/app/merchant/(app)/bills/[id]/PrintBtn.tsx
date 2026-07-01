'use client';

// Manual print (no auto-trigger — the owner opens the bill to view, then prints/saves PDF if they want).
// .printbtn is hidden in @media print (globals.css) so the button itself never appears on the sheet.
export default function PrintBtn() {
  return <button className="dbtn sm primary printbtn" type="button" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>;
}
