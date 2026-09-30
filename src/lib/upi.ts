/**
 * UPI deep links per the NPCI "UPI Linking Specification":
 *   upi://pay?pa=<vpa>&pn=<payee name>&am=<amount>&cu=INR&tn=<note>
 * The unique registration reference goes in `tn` so the admin can match the credit.
 */
export interface UpiPaymentRequest {
  vpa: string;
  payeeName: string;
  amountInr: number;
  reference: string;
  note?: string;
}

const VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}

function enc(value: string): string {
  // encodeURIComponent, but UPI apps expect spaces as %20 (not "+") and no stray reserved chars.
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function sanitizeNote(note: string): string {
  // Many UPI apps reject notes over ~50 chars or with unusual symbols.
  return note
    .replace(/[^a-zA-Z0-9 \-_.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

export function buildUpiLink({ vpa, payeeName, amountInr, reference, note }: UpiPaymentRequest): string {
  if (!isValidVpa(vpa)) throw new Error(`Invalid UPI ID: ${vpa}`);
  if (!Number.isFinite(amountInr) || amountInr <= 0) throw new Error('UPI amount must be a positive number');
  if (!/^[A-Z0-9-]{4,30}$/.test(reference)) throw new Error('Invalid payment reference');
  const params = [
    ['pa', vpa.trim()],
    ['pn', payeeName.trim().slice(0, 50)],
    ['am', amountInr.toFixed(2)],
    ['cu', 'INR'],
    ['tn', sanitizeNote(note ? `${reference} ${note}` : reference)],
    ['tr', reference],
  ] as const;
  return `upi://pay?${params.map(([k, v]) => `${k}=${enc(v)}`).join('&')}`;
}

export function parseUpiLink(link: string): Record<string, string> {
  const query = link.split('?')[1] ?? '';
  return Object.fromEntries(
    query
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const [k, v = ''] = pair.split('=');
        return [k, decodeURIComponent(v)];
      }),
  );
}
