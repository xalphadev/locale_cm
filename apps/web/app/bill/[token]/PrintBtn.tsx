'use client';
export default function PrintBtn() {
  return <button className="dbtn sm primary printbtn" type="button" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>;
}
