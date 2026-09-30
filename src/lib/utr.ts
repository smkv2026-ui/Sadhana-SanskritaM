/**
 * UPI transaction reference (UTR / RRN) — 12 digits for UPI credits.
 * Uniqueness across registrations is enforced server-side by the `utrIndex/{utr}`
 * document that must be created in the same batch (see firestore.rules).
 */
export const UTR_RE = /^\d{12}$/;

export function normalizeUtr(input: string): string {
  return input.replace(/[\s-]/g, '');
}

export function utrError(input: string): string | null {
  const utr = normalizeUtr(input);
  if (!utr) return 'Enter the 12-digit UTR from your UPI app.';
  if (!/^\d+$/.test(utr)) return 'The UTR contains only digits.';
  if (utr.length !== 12) return `The UTR has 12 digits (you entered ${utr.length}).`;
  if (/^(\d)\1{11}$/.test(utr)) return 'That does not look like a real UTR.';
  return null;
}

export function isValidUtr(input: string): boolean {
  return utrError(input) === null;
}

/** Client-side duplicate check used by the demo backend and the CSV matcher. */
export function findDuplicateUtr<T extends { id: string; utr: string | null }>(items: T[], utr: string, selfId?: string): T | undefined {
  const n = normalizeUtr(utr);
  return items.find((r) => r.utr === n && r.id !== selfId);
}
