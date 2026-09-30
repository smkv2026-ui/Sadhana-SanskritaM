import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthUser, Participant } from '../types';
import { seedCourses } from '../seed';
import { DemoBackend } from './demoBackend';

const ALICE: AuthUser = { uid: 'alice', email: 'alice@example.com', displayName: 'Alice', photoURL: null };
const BOB: AuthUser = { uid: 'bob', email: 'bob@example.com', displayName: 'Bob', photoURL: null };
const ADMIN: AuthUser = { uid: 'demo-admin', email: 'admin@example.com', displayName: 'Admin', photoURL: null };
const person: Participant = { name: 'Alice Learner', email: 'alice@example.com', phone: '+919876543210', city: '' };

let b: DemoBackend;
const as = (u: AuthUser | null) => b.setUserForTests(u);
const course = (slug: string) => seedCourses().find((c) => c.slug === slug)!;

beforeEach(() => {
  b = new DemoBackend(false);
});

describe('registration + seat limit (transaction semantics)', () => {
  it('creates a PENDING_PAYMENT registration and takes one seat', async () => {
    as(ALICE);
    const c = course('speak-sanskrit-in-30-days');
    const before = (await b.listCourseStats()).find((s) => s.courseId === c.id)!.seatsTaken;
    const reg = await b.createRegistration({ uid: ALICE.uid, course: c, participant: person, couponCode: 'NAMASTE10' });
    expect(reg.status).toBe('PENDING_PAYMENT');
    expect(reg.amountInr).toBe(reg.basePriceInr - reg.discountInr);
    expect(reg.discountInr).toBeGreaterThan(0);
    expect((await b.listCourseStats()).find((s) => s.courseId === c.id)!.seatsTaken).toBe(before + 1);
  });

  it('refuses when the course is full', async () => {
    const c = course('panini-made-friendly'); // demo counter starts at 13/25
    for (let i = 0; i < 12; i++) {
      as({ ...ALICE, uid: `u${i}` });
      await b.createRegistration({ uid: `u${i}`, course: c, participant: person, couponCode: null });
    }
    as(BOB);
    await expect(b.createRegistration({ uid: BOB.uid, course: c, participant: person, couponCode: null })).rejects.toMatchObject({ code: 'sold-out' });
  });

  it('refuses a second active registration and registrations for someone else', async () => {
    as(ALICE);
    const c = course('speak-sanskrit-in-30-days');
    await b.createRegistration({ uid: ALICE.uid, course: c, participant: person, couponCode: null });
    await expect(b.createRegistration({ uid: ALICE.uid, course: c, participant: person, couponCode: null })).rejects.toMatchObject({ code: 'already-registered' });
    await expect(b.createRegistration({ uid: BOB.uid, course: c, participant: person, couponCode: null })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('UTR uniqueness and approval gate', () => {
  it('rejects a UTR already used by another registration', async () => {
    const c = course('speak-sanskrit-in-30-days');
    as(ALICE);
    const a = await b.createRegistration({ uid: ALICE.uid, course: c, participant: person, couponCode: null });
    await b.submitUtr(a.id, '412345678901');
    as(BOB);
    const r = await b.createRegistration({ uid: BOB.uid, course: c, participant: person, couponCode: null });
    await expect(b.submitUtr(r.id, '4123 4567 8901')).rejects.toMatchObject({ code: 'utr-taken' });
    await expect(b.submitUtr(r.id, '12')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('keeps secrets locked until an admin approves; learners cannot self-approve', async () => {
    const c = course('speak-sanskrit-in-30-days');
    as(ALICE);
    const r = await b.createRegistration({ uid: ALICE.uid, course: c, participant: person, couponCode: null });
    await b.submitUtr(r.id, '412345678901');
    await expect(b.getCourseSecrets(c.id)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(b.decideRegistration(r.id, 'APPROVED', ALICE.uid)).rejects.toMatchObject({ code: 'permission-denied' });
    as(ADMIN);
    await b.decideRegistration(r.id, 'APPROVED', ADMIN.uid);
    as(ALICE);
    const secrets = await b.getCourseSecrets(c.id);
    expect(secrets?.meetingLink).toMatch(/^https:/);
    as(BOB);
    await expect(b.getCourseSecrets(c.id)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(b.getRegistration(r.id)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rejection releases the seat', async () => {
    const c = course('speak-sanskrit-in-30-days');
    as(ALICE);
    const r = await b.createRegistration({ uid: ALICE.uid, course: c, participant: person, couponCode: null });
    const taken = (await b.listCourseStats()).find((s) => s.courseId === c.id)!.seatsTaken;
    as(ADMIN);
    await b.decideRegistration(r.id, 'REJECTED', ADMIN.uid, 'No credit found');
    expect((await b.listCourseStats()).find((s) => s.courseId === c.id)!.seatsTaken).toBe(taken - 1);
  });
});

describe('subscribe → confirm → preferences → unsubscribe', () => {
  it('works only with the secret token and never exposes the list publicly', async () => {
    as(null);
    const { id, token } = await b.createSubscriber({
      name: 'Priya',
      email: 'Priya@Example.com ',
      whatsapp: null,
      interests: ['spoken'],
      channels: { email: true, whatsapp: false },
      source: 'test',
    });
    expect(id).toBe(token);
    await expect(b.listSubscribers({})).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(b.updateSubscriberByToken('f'.repeat(40), { status: 'CONFIRMED' })).rejects.toMatchObject({ code: 'permission-denied' });
    await b.updateSubscriberByToken(token, { status: 'CONFIRMED' });
    await b.updateSubscriberByToken(token, { interests: ['grammar'], channels: { email: true, whatsapp: false } });
    as(ADMIN);
    let s = (await b.listSubscribers({})).items[0];
    expect(s).toMatchObject({ status: 'CONFIRMED', email: 'priya@example.com', interests: ['grammar'] });
    expect(s.consent.email?.granted).toBe(true);
    expect(s.consent.whatsapp).toBeNull();
    as(null);
    await b.updateSubscriberByToken(token, { status: 'UNSUBSCRIBED' });
    as(ADMIN);
    s = (await b.listSubscribers({})).items[0];
    expect(s.status).toBe('UNSUBSCRIBED');
    expect(s.unsubscribedAt).not.toBeNull();
    expect(await b.listSubscribersForSend([])).toHaveLength(0);
  });
});

describe('custom requests and progress', () => {
  it('owner can create/track; admin moves status', async () => {
    as(ALICE);
    const req = await b.createCustomRequest({
      uid: ALICE.uid,
      contact: { name: 'Alice', email: 'a@example.com', phone: '', organisation: '' },
      projectType: 'Learning app',
      problem: 'Need chanting practice between classes',
      targetUsers: 'Students',
      features: ['Quizzes'],
      referenceLinks: [],
      budgetInr: { min: 1, max: 2 },
      timelineWeeks: 8,
      preferredChannel: 'email',
    });
    expect(req.reference).toMatch(/^CR-/);
    as(ADMIN);
    await b.updateCustomRequestStatus(req.id, 'IN_REVIEW', 'Looking');
    as(ALICE);
    const mine = await b.listMyCustomRequests(ALICE.uid);
    expect(mine[0].status).toBe('IN_REVIEW');
    expect(mine[0].statusHistory).toHaveLength(2);
    as(BOB);
    await expect(b.listMyCustomRequests(ALICE.uid)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('progress is per user and toggles', async () => {
    as(ALICE);
    await b.setRecordingComplete(ALICE.uid, 'c1', 'r1', true);
    const p = await b.setRecordingComplete(ALICE.uid, 'c1', 'r2', true);
    expect(Object.keys(p.completed)).toEqual(['r1', 'r2']);
    expect(Object.keys((await b.setRecordingComplete(ALICE.uid, 'c1', 'r1', false)).completed)).toEqual(['r2']);
    as(BOB);
    await expect(b.getProgress(ALICE.uid, 'c1')).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
