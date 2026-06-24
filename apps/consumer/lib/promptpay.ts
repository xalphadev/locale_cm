// PromptPay QR payload (EMVCo / Bank of Thailand standard) with the amount embedded, so the guest scans
// and the transfer amount is pre-filled. Pure string maths — no money moves; the QR just addresses the
// host's own PromptPay (phone / national id). Pair with a QR renderer (qrcode) on the client.
function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value;
}
function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = ((crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function formatTarget(id: string): string {
  const n = id.replace(/[^0-9]/g, '');
  if (n.length >= 13) return n;                              // national id (13) / e-wallet (15)
  return ('0000000000000' + n.replace(/^0/, '66')).slice(-13); // phone → 0066xxxxxxxxx
}

/** EMVCo payload string for the host's PromptPay + amount (THB). Returns '' if no valid target. */
export function promptpayPayload(target: string, amount: number): string {
  const acc = formatTarget(target);
  if (acc.replace(/0/g, '').length === 0) return '';
  const merchant = tlv('29', tlv('00', 'A000000677010111') + tlv(acc.length === 15 ? '03' : '01', acc));
  // field order matches the de-facto standard (dtinth/promptpay-qr): country, then currency, then amount
  let payload = tlv('00', '01') + tlv('01', amount > 0 ? '12' : '11') + merchant
    + tlv('58', 'TH') + tlv('53', '764') + (amount > 0 ? tlv('54', amount.toFixed(2)) : '');
  payload += '6304';
  return payload + crc16(payload);
}
