import { env } from '@/config/env';
import { paymentReference, registrationId } from '@/lib/ids';
import { computePrice } from '@/lib/pricing';
import type { Coupon, CourseStats, NewRegistrationInput, Registration, RegistrationStatus } from './types';

/** Statuses that occupy a seat in the counter. */
export const SEAT_HOLDING: RegistrationStatus[] = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'APPROVED'];

export function holdsSeat(status: RegistrationStatus): boolean {
  return SEAT_HOLDING.includes(status);
}

export function isHoldExpired(reg: Pick<Registration, 'status' | 'holdExpiresAt'>, now: Date = new Date()): boolean {
  return reg.status === 'PENDING_PAYMENT' && new Date(reg.holdExpiresAt).getTime() <= now.getTime();
}

/** Effective status as the learner should see it (expiry is evaluated on read). */
export function effectiveStatus(reg: Pick<Registration, 'status' | 'holdExpiresAt'>, now: Date = new Date()): RegistrationStatus {
  return isHoldExpired(reg, now) ? 'EXPIRED' : reg.status;
}

export function seatsLeft(seatLimit: number, stats: CourseStats | undefined | null): number | null {
  if (!seatLimit) return null; // unlimited
  return Math.max(0, seatLimit - (stats?.seatsTaken ?? 0));
}

/** A registration that can be restarted by the learner (fresh hold, new counter increment). */
export function canRestart(status: RegistrationStatus): boolean {
  return status === 'EXPIRED' || status === 'REJECTED';
}

export function buildRegistration(
  input: NewRegistrationInput,
  coupon: Coupon | null,
  now: Date = new Date(),
): Registration {
  const { course, participant, uid } = input;
  const price = computePrice(course, coupon, now);
  const iso = now.toISOString();
  const free = price.total === 0;
  return {
    id: registrationId(uid, course.id),
    uid,
    courseId: course.id,
    courseTitle: course.title,
    courseSlug: course.slug,
    courseType: course.type,
    startsAt: course.startsAt,
    participant: {
      name: participant.name.trim(),
      email: participant.email.trim().toLowerCase(),
      phone: participant.phone,
      city: participant.city.trim(),
    },
    basePriceInr: price.base,
    discountInr: price.discount,
    amountInr: price.total,
    couponCode: price.coupon ? price.coupon.code : null,
    reference: paymentReference(),
    // Free seats skip payment and go straight to the admin queue.
    status: free ? 'PENDING_VERIFICATION' : 'PENDING_PAYMENT',
    utr: null,
    utrSubmittedAt: null,
    holdExpiresAt: new Date(now.getTime() + env.seatHoldHours * 3_600_000 - 60_000).toISOString(),
    createdAt: iso,
    updatedAt: iso,
    decidedAt: null,
    decidedBy: null,
    rejectionReason: null,
    confirmationSentAt: null,
    reminder24SentAt: null,
    reminder1SentAt: null,
  };
}
