import type { Coupon, Course } from '@/data/types';

/**
 * Price computation shared by the UI, both backends and mirrored in firestore.rules
 * (`expectedAmount()`), so a registration's amount can be verified server-side.
 */
export interface PriceBreakdown {
  base: number;
  earlyBird: boolean;
  discount: number;
  total: number;
  coupon: Coupon | null;
}

export function isEarlyBird(course: Pick<Course, 'earlyBirdPriceInr' | 'earlyBirdEndsAt'>, now: Date = new Date()): boolean {
  return (
    course.earlyBirdPriceInr !== null &&
    course.earlyBirdEndsAt !== null &&
    now.getTime() < new Date(course.earlyBirdEndsAt).getTime()
  );
}

export function couponError(coupon: Coupon | null, courseId: string, now: Date = new Date()): string | null {
  if (!coupon) return 'This code does not exist.';
  if (!coupon.active) return 'This code is no longer active.';
  if (coupon.validUntil && now.getTime() >= new Date(coupon.validUntil).getTime()) return 'This code has expired.';
  if (coupon.courseIds.length > 0 && !coupon.courseIds.includes(courseId)) return 'This code is not valid for this course.';
  return null;
}

export function applyCoupon(base: number, coupon: Coupon): number {
  if (coupon.kind === 'percent') {
    const pct = Math.min(100, Math.max(0, coupon.value));
    return Math.round((base * pct) / 100);
  }
  return Math.min(base, Math.max(0, Math.round(coupon.value)));
}

export function computePrice(
  course: Pick<Course, 'id' | 'priceInr' | 'earlyBirdPriceInr' | 'earlyBirdEndsAt'>,
  coupon: Coupon | null = null,
  now: Date = new Date(),
): PriceBreakdown {
  const earlyBird = isEarlyBird(course, now);
  const base = earlyBird ? (course.earlyBirdPriceInr as number) : course.priceInr;
  const valid = coupon && couponError(coupon, course.id, now) === null ? coupon : null;
  const discount = valid ? applyCoupon(base, valid) : 0;
  return { base, earlyBird, discount, total: base - discount, coupon: valid };
}

export function formatInr(amount: number): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
