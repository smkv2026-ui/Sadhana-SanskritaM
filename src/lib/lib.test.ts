import { describe, expect, it } from 'vitest';
import type { Coupon, Course } from '@/data/types';
import { seedCourses } from '@/data/seed';
import { parseCsv, toCsv } from './csv';
import { countdown, localDayKey, maskEmail, maskPhone, nextStreak } from './format';
import { buildIcs } from './ics';
import { paymentReference, randomCode, secureToken, slugify } from './ids';
import { isE164, toE164 } from './phone';
import { applyCoupon, computePrice, couponError, isEarlyBird } from './pricing';
import { buildUpiLink, isValidVpa, parseUpiLink, sanitizeNote } from './upi';
import { findDuplicateUtr, isValidUtr, normalizeUtr, utrError } from './utr';

const course = (o: Partial<Course> = {}): Course => ({ ...seedCourses()[0], id: 'c1', priceInr: 2000, earlyBirdPriceInr: null, earlyBirdEndsAt: null, ...o });
const coupon = (o: Partial<Coupon> = {}): Coupon => ({ code: 'X10', kind: 'percent', value: 10, courseIds: [], validUntil: null, active: true, description: '', ...o });

describe('UPI link generation', () => {
  it('builds a spec-compliant upi://pay link with amount, currency and reference', () => {
    const link = buildUpiLink({ vpa: 'sadhana@okaxis', payeeName: 'Sadhana Sanskritam', amountInr: 1799, reference: 'SS-7K3QX9' });
    expect(link.startsWith('upi://pay?')).toBe(true);
    const p = parseUpiLink(link);
    expect(p).toMatchObject({ pa: 'sadhana@okaxis', pn: 'Sadhana Sanskritam', am: '1799.00', cu: 'INR', tn: 'SS-7K3QX9', tr: 'SS-7K3QX9' });
    expect(link).not.toContain('+');
    expect(link).toContain('pn=Sadhana%20Sanskritam');
  });

  it('rejects invalid VPA, amount or reference', () => {
    expect(() => buildUpiLink({ vpa: 'not a vpa', payeeName: 'x', amountInr: 10, reference: 'SS-AAAAAA' })).toThrow();
    expect(() => buildUpiLink({ vpa: 'a@upi', payeeName: 'x', amountInr: 0, reference: 'SS-AAAAAA' })).toThrow();
    expect(() => buildUpiLink({ vpa: 'ab@upi', payeeName: 'x', amountInr: 10, reference: 'bad ref!' })).toThrow();
  });

  it('validates VPAs and sanitises notes', () => {
    expect(isValidVpa('name.surname@oksbi')).toBe(true);
    expect(isValidVpa('9876543210@paytm')).toBe(true);
    expect(isValidVpa('@upi')).toBe(false);
    expect(sanitizeNote('SS-1 <script>&"')).toBe('SS-1 script');
    expect(sanitizeNote('x'.repeat(80))).toHaveLength(50);
  });
});

describe('UTR validation', () => {
  it('accepts exactly 12 digits (spaces/dashes ignored)', () => {
    expect(isValidUtr('412345678901')).toBe(true);
    expect(isValidUtr('4123 4567 8901')).toBe(true);
    expect(normalizeUtr('4123-4567-8901')).toBe('412345678901');
  });
  it('explains what is wrong', () => {
    expect(utrError('')).toMatch(/12-digit/);
    expect(utrError('12345')).toMatch(/5/);
    expect(utrError('41234567890a')).toMatch(/digits/);
    expect(utrError('111111111111')).toMatch(/real UTR/);
  });
  it('detects duplicates across registrations', () => {
    const regs = [
      { id: 'a', utr: '412345678901' },
      { id: 'b', utr: null },
    ];
    expect(findDuplicateUtr(regs, '4123 4567 8901', 'b')?.id).toBe('a');
    expect(findDuplicateUtr(regs, '412345678901', 'a')).toBeUndefined();
  });
});

describe('pricing (mirrors firestore.rules)', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  it('uses the early-bird price until the deadline', () => {
    const c = course({ earlyBirdPriceInr: 1500, earlyBirdEndsAt: '2026-10-05T00:00:00Z' });
    expect(isEarlyBird(c, now)).toBe(true);
    expect(computePrice(c, null, now)).toMatchObject({ base: 1500, total: 1500, earlyBird: true });
    expect(computePrice(c, null, new Date('2026-10-06T00:00:00Z')).base).toBe(2000);
  });
  it('applies percent and flat coupons with rounding and caps', () => {
    expect(applyCoupon(1999, coupon({ value: 10 }))).toBe(200);
    expect(applyCoupon(1000, coupon({ kind: 'flat', value: 5000 }))).toBe(1000);
    expect(computePrice(course(), coupon(), now)).toMatchObject({ base: 2000, discount: 200, total: 1800 });
  });
  it('ignores invalid coupons', () => {
    expect(couponError(null, 'c1')).toMatch(/exist/);
    expect(couponError(coupon({ active: false }), 'c1')).toMatch(/active/);
    expect(couponError(coupon({ validUntil: '2020-01-01T00:00:00Z' }), 'c1', now)).toMatch(/expired/);
    expect(couponError(coupon({ courseIds: ['other'] }), 'c1')).toMatch(/not valid/);
    expect(computePrice(course(), coupon({ active: false }), now).total).toBe(2000);
  });
});

describe('ids', () => {
  it('references and tokens have the expected shape', () => {
    expect(paymentReference()).toMatch(/^SS-[A-Z2-9]{6}$/);
    expect(paymentReference('CR')).toMatch(/^CR-[A-Z2-9]{6}$/);
    expect(secureToken()).toMatch(/^[a-f0-9]{40}$/);
    expect(new Set(Array.from({ length: 200 }, () => randomCode(8))).size).toBe(200);
  });
  it('slugifies diacritics', () => {
    expect(slugify('Pāṇini Made Friendly!')).toBe('panini-made-friendly');
  });
});

describe('format helpers', () => {
  it('streaks: same day keeps, next day increments, gap resets', () => {
    expect(nextStreak(3, '2026-09-29', '2026-09-30')).toEqual({ count: 4, day: '2026-09-30' });
    expect(nextStreak(3, '2026-09-30', '2026-09-30')).toEqual({ count: 3, day: '2026-09-30' });
    expect(nextStreak(3, '2026-09-20', '2026-09-30')).toEqual({ count: 1, day: '2026-09-30' });
    expect(nextStreak(0, null, '2026-09-30')).toEqual({ count: 1, day: '2026-09-30' });
    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('countdown', () => {
    const c = countdown('2026-10-02T01:02:03Z', new Date('2026-10-01T00:00:00Z'));
    expect(c).toEqual({ days: 1, hours: 1, minutes: 2, seconds: 3, done: false });
    expect(countdown('2020-01-01', new Date()).done).toBe(true);
  });
  it('masks PII for logs', () => {
    expect(maskEmail('priya@example.com')).toBe('pr***@example.com');
    expect(maskPhone('+919876543210')).toBe('+91•••••3210');
  });
});

describe('phone numbers (E.164)', () => {
  it('converts national numbers and validates', () => {
    expect(toE164('98765 43210', 'IN')).toBe('+919876543210');
    expect(toE164('123', 'IN')).toBeNull();
    expect(isE164('+919876543210')).toBe(true);
    expect(isE164('919876543210')).toBe(false);
  });
});

describe('ics', () => {
  it('produces a valid VCALENDAR with folded lines and an alarm', () => {
    const ics = buildIcs([{ uid: 'c1', title: 'Gītā, reading; week 1', start: new Date('2026-10-10T13:30:00Z'), durationMinutes: 75, description: 'x'.repeat(200) }]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261010T133000Z');
    expect(ics).toContain('DTEND:20261010T144500Z');
    expect(ics).toContain('SUMMARY:Gītā\\, reading\\; week 1');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });
});

describe('csv', () => {
  it('round-trips quotes and commas, and neutralises formulas', () => {
    const csv = toCsv([{ a: 'x, "y"', b: '=HYPERLINK()' }]);
    expect(csv).toBe('a,b\r\n"x, ""y""",\'=HYPERLINK()');
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['x, "y"', "'=HYPERLINK()"],
    ]);
  });
  it('detects ; and tab delimiters', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
