import type { Registration } from '@/data/types';
import { parseCsv } from '@/lib/csv';

/**
 * Bank-statement CSV import. Banks export wildly different layouts, so we detect columns
 * heuristically: any 12-digit number in a row is a UTR candidate, the credit/amount column is
 * found by header name, and the narration is scanned for our "SS-XXXXXX" reference.
 */
export interface StatementRow {
  line: number;
  amount: number | null;
  utrs: string[];
  reference: string | null;
  narration: string;
}

export interface MatchSuggestion {
  row: StatementRow;
  registration: Registration;
  confidence: 'high' | 'medium';
  reason: string;
}

const AMOUNT_HEADERS = /(credit|deposit|amount|cr\b|amt)/i;

function toNumber(s: string): number | null {
  const cleaned = s.replace(/[₹,\s]/g, '').replace(/cr$/i, '');
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function parseStatement(text: string): StatementRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const hasHeader = header.some((h) => /[a-z]/i.test(h) && !/^\d/.test(h));
  const amountCols = hasHeader
    ? header.map((h, i) => (AMOUNT_HEADERS.test(h) && !/debit|withdraw|balance/i.test(h) ? i : -1)).filter((i) => i >= 0)
    : [];
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map((r, idx) => {
    const joined = r.join(' ');
    const utrs = Array.from(new Set(joined.match(/(?<!\d)\d{12}(?!\d)/g) ?? []));
    const refMatch = joined.toUpperCase().match(/\bSS[-\s]?([A-Z0-9]{6})\b/);
    let amount: number | null = null;
    for (const c of amountCols) {
      const n = toNumber(r[c] ?? '');
      if (n !== null && n > 0) {
        amount = n;
        break;
      }
    }
    if (amount === null && !hasHeader) {
      const nums = r.map(toNumber).filter((n): n is number => n !== null && n > 0 && n < 10_000_000 && !Number.isInteger(n / 1e11));
      amount = nums[0] ?? null;
    }
    return {
      line: idx + (hasHeader ? 2 : 1),
      amount,
      utrs,
      reference: refMatch ? `SS-${refMatch[1]}` : null,
      narration: joined.slice(0, 160),
    };
  });
}

export function matchStatement(rows: StatementRow[], pending: Registration[]): MatchSuggestion[] {
  const out: MatchSuggestion[] = [];
  const used = new Set<string>();
  for (const row of rows) {
    // 1) exact UTR match (+ amount agreement when available)
    const byUtr = pending.find((r) => r.utr && row.utrs.includes(r.utr) && !used.has(r.id));
    if (byUtr) {
      const amountOk = row.amount === null || Math.abs(row.amount - byUtr.amountInr) < 0.5;
      out.push({
        row,
        registration: byUtr,
        confidence: amountOk ? 'high' : 'medium',
        reason: amountOk ? 'UTR and amount match' : `UTR matches but amount differs (₹${row.amount})`,
      });
      used.add(byUtr.id);
      continue;
    }
    // 2) reference in narration + same amount
    if (row.reference) {
      const byRef = pending.find((r) => r.reference === row.reference && !used.has(r.id));
      if (byRef && row.amount !== null && Math.abs(row.amount - byRef.amountInr) < 0.5) {
        out.push({ row, registration: byRef, confidence: 'medium', reason: 'Reference in note and amount match (UTR differs)' });
        used.add(byRef.id);
      }
    }
  }
  return out;
}
