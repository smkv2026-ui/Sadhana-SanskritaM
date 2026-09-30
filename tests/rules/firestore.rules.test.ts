/**
 * Firestore Security Rules tests — run against the local emulator:
 *   npm run test:rules:emulator
 * CI runs this on every push; a failure blocks deployment.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setLogLevel,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildRegistration } from '../../src/data/registrationLogic';
import { seedCourses } from '../../src/data/seed';

const PROJECT_ID = 'demo-sadhana';
let env: RulesTestEnvironment;

const HOUR = 3_600_000;
const COURSE = 'c-speak';
const FREE = 'c-free';
const TINY = 'c-tiny';
const ALICE = 'aliceUid000000000000000001';
const BOB = 'bobUid00000000000000000002';
const ADMIN = 'adminUid000000000000000003';

function db(uid?: string): Firestore {
  return (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as Firestore;
}

function courseDoc(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'speak',
    kind: 'course',
    title: 'Speak Sanskrit',
    type: 'live',
    status: 'published',
    priceInr: 2000,
    earlyBirdPriceInr: null,
    earlyBirdEndsAt: null,
    seatLimit: 40,
    ...overrides,
  };
}

function regData(uid: string, courseId: string, overrides: Record<string, unknown> = {}) {
  return {
    uid,
    courseId,
    courseTitle: courseId === FREE ? 'Free Satsang' : courseId === TINY ? 'Tiny' : 'Speak Sanskrit',
    courseSlug: courseId === FREE ? 'free' : courseId === TINY ? 'tiny' : 'speak',
    courseType: 'live',
    startsAt: null,
    participant: { name: 'Alice Learner', email: 'alice@example.com', phone: '+919876543210', city: 'Pune' },
    basePriceInr: 2000,
    discountInr: 0,
    amountInr: 2000,
    couponCode: null,
    reference: 'SS-ABC234',
    status: 'PENDING_PAYMENT',
    utr: null,
    utrSubmittedAt: null,
    holdExpiresAt: Timestamp.fromMillis(Date.now() + 23 * HOUR),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    decidedAt: null,
    decidedBy: null,
    rejectionReason: null,
    confirmationSentAt: null,
    reminder24SentAt: null,
    reminder1SentAt: null,
    ...overrides,
  };
}

/** The app's real write: registration + seat counter in one batch. */
async function register(uid: string, courseId: string, overrides: Record<string, unknown> = {}, seatsBefore = 0, seatDelta = 1) {
  const d = db(uid);
  const batch = writeBatch(d);
  batch.set(doc(d, 'registrations', `${uid}_${courseId}`), regData(uid, courseId, overrides));
  if (seatDelta) batch.update(doc(d, 'courseStats', courseId), { seatsTaken: seatsBefore + seatDelta });
  return batch.commit();
}

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data);
  });
}

async function seedApprovedRegistration(uid: string, courseId: string) {
  await seed(`registrations/${uid}_${courseId}`, { ...regData(uid, courseId), status: 'APPROVED', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
}

beforeAll(async () => {
  setLogLevel('silent'); // denied writes are expected in these tests
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(`admins/${ADMIN}`, { role: 'owner' });
  await seed(`courses/${COURSE}`, courseDoc());
  await seed(`courses/${FREE}`, courseDoc({ slug: 'free', title: 'Free Satsang', priceInr: 0 }));
  await seed(`courses/${TINY}`, courseDoc({ slug: 'tiny', title: 'Tiny', seatLimit: 1 }));
  await seed('courses/c-draft', courseDoc({ slug: 'draft', title: 'Draft', status: 'draft' }));
  for (const id of [COURSE, FREE, TINY, 'c-draft']) await seed(`courseStats/${id}`, { seatsTaken: 0 });
  await seed(`courseSecrets/${COURSE}`, { meetingLink: 'https://meet.example/secret', meetingNotes: '', recordings: [], resources: [] });
  await seed('coupons/NAMASTE10', { kind: 'percent', value: 10, courseIds: [], validUntil: null, active: true, description: '' });
  await seed('coupons/OLD', { kind: 'flat', value: 500, courseIds: [], validUntil: Timestamp.fromMillis(Date.now() - HOUR), active: true, description: '' });
});

describe('contract', () => {
  it('the registration shape written by the app matches the keys the rules require', () => {
    const course = seedCourses()[0];
    const appKeys = Object.keys(
      buildRegistration({ uid: ALICE, course, couponCode: null, participant: { name: 'A B', email: 'a@b.co', phone: '+919876543210', city: '' } }, null),
    )
      .filter((k) => k !== 'id')
      .sort();
    expect(appKeys).toEqual(Object.keys(regData(ALICE, COURSE)).sort());
    const rulesSrc = readFileSync('firestore.rules', 'utf8');
    for (const k of appKeys) expect(rulesSrc).toContain(`'${k}'`);
  });
});

describe('catalogue', () => {
  it('anyone can read published courses but not drafts', async () => {
    await assertSucceeds(getDoc(doc(db(), 'courses', COURSE)));
    await assertFails(getDoc(doc(db(), 'courses', 'c-draft')));
    await assertSucceeds(getDocs(query(collection(db(), 'courses'), where('status', '==', 'published'))));
    await assertFails(getDocs(collection(db(), 'courses')));
  });

  it('only admins write courses and content', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'courses', 'c-x'), courseDoc()));
    await assertFails(setDoc(doc(db(ALICE), 'subhashitas', 's-x'), { deva: 'x' }));
    await assertSucceeds(setDoc(doc(db(ADMIN), 'courses', 'c-x'), courseDoc()));
  });

  it('coupons can be fetched by code but not listed', async () => {
    await assertSucceeds(getDoc(doc(db(), 'coupons', 'NAMASTE10')));
    await assertFails(getDocs(collection(db(ALICE), 'coupons')));
  });
});

describe('course secrets (recordings / live links)', () => {
  it('are unreadable by visitors and by signed-in users without a registration', async () => {
    await assertFails(getDoc(doc(db(), 'courseSecrets', COURSE)));
    await assertFails(getDoc(doc(db(BOB), 'courseSecrets', COURSE)));
  });

  it('are unreadable while payment is pending verification', async () => {
    await seed(`registrations/${ALICE}_${COURSE}`, { ...regData(ALICE, COURSE), status: 'PENDING_VERIFICATION', utr: '412345678901', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await assertFails(getDoc(doc(db(ALICE), 'courseSecrets', COURSE)));
  });

  it('become readable once the registration is APPROVED — and only for that learner', async () => {
    await seedApprovedRegistration(ALICE, COURSE);
    await assertSucceeds(getDoc(doc(db(ALICE), 'courseSecrets', COURSE)));
    await assertFails(getDoc(doc(db(BOB), 'courseSecrets', COURSE)));
  });

  it('cannot be listed or written by learners; admins can read', async () => {
    await seedApprovedRegistration(ALICE, COURSE);
    await assertFails(getDocs(collection(db(ALICE), 'courseSecrets')));
    await assertFails(setDoc(doc(db(ALICE), 'courseSecrets', COURSE), { meetingLink: 'x' }));
    await assertSucceeds(getDoc(doc(db(ADMIN), 'courseSecrets', COURSE)));
  });
});

describe('registrations: create', () => {
  it('a learner can create their own PENDING_PAYMENT registration with the correct price and one seat', async () => {
    await assertSucceeds(register(ALICE, COURSE));
  });

  it('rejects a price that does not match the course', async () => {
    await assertFails(register(ALICE, COURSE, { amountInr: 1, basePriceInr: 2000, discountInr: 1999 }));
    await assertFails(register(ALICE, COURSE, { amountInr: 1500, basePriceInr: 1500 }));
  });

  it('rejects self-approval at creation time', async () => {
    await assertFails(register(ALICE, COURSE, { status: 'APPROVED' }));
  });

  it('rejects a registration for another user', async () => {
    const d = db(BOB);
    const batch = writeBatch(d);
    batch.set(doc(d, 'registrations', `${ALICE}_${COURSE}`), regData(ALICE, COURSE));
    batch.update(doc(d, 'courseStats', COURSE), { seatsTaken: 1 });
    await assertFails(batch.commit());
  });

  it('requires the seat counter to be incremented in the same batch', async () => {
    await assertFails(register(ALICE, COURSE, {}, 0, 0));
    await assertFails(register(ALICE, COURSE, {}, 0, 2));
  });

  it('enforces the seat limit', async () => {
    await assertSucceeds(register(ALICE, TINY, { basePriceInr: 2000, amountInr: 2000 }));
    await assertFails(register(BOB, TINY, { participant: { name: 'Bob Learner', email: 'bob@example.com', phone: '+919876543211', city: '' } }, 1));
  });

  it('applies coupons exactly as the app computes them', async () => {
    await assertSucceeds(register(ALICE, COURSE, { couponCode: 'NAMASTE10', discountInr: 200, amountInr: 1800 }));
    await assertFails(register(BOB, COURSE, { couponCode: 'NAMASTE10', discountInr: 1000, amountInr: 1000 }, 1));
    await assertFails(register(BOB, COURSE, { couponCode: 'OLD', discountInr: 500, amountInr: 1500 }, 1));
  });

  it('honours an active early-bird price and rejects it after expiry', async () => {
    await seed(`courses/${COURSE}`, courseDoc({ earlyBirdPriceInr: 1500, earlyBirdEndsAt: Timestamp.fromMillis(Date.now() + 24 * HOUR) }));
    await assertSucceeds(register(ALICE, COURSE, { basePriceInr: 1500, amountInr: 1500 }));
    await seed(`courses/${FREE}`, courseDoc({ slug: 'free', title: 'Free Satsang', earlyBirdPriceInr: 1500, earlyBirdEndsAt: Timestamp.fromMillis(Date.now() - HOUR) }));
    await assertFails(register(BOB, FREE, { basePriceInr: 1500, amountInr: 1500 }));
  });

  it('free seats go straight to PENDING_VERIFICATION', async () => {
    await assertSucceeds(register(ALICE, FREE, { basePriceInr: 0, amountInr: 0, status: 'PENDING_VERIFICATION' }));
    await assertFails(register(BOB, FREE, { basePriceInr: 0, amountInr: 0, status: 'APPROVED' }));
  });

  it('rejects registrations for unpublished courses', async () => {
    await assertFails(register(ALICE, 'c-draft', { courseTitle: 'Draft', courseSlug: 'draft' }));
  });
});

describe('registrations: no self-approval, UTR rules', () => {
  beforeEach(async () => {
    await register(ALICE, COURSE);
  });

  it('a learner cannot approve or reject their own registration', async () => {
    const ref = doc(db(ALICE), 'registrations', `${ALICE}_${COURSE}`);
    await assertFails(updateDoc(ref, { status: 'APPROVED' }));
    await assertFails(updateDoc(ref, { status: 'REJECTED' }));
    await assertFails(updateDoc(ref, { amountInr: 1 }));
  });

  it('only an admin can approve', async () => {
    await assertSucceeds(updateDoc(doc(db(ADMIN), 'registrations', `${ALICE}_${COURSE}`), { status: 'APPROVED', decidedBy: ADMIN, decidedAt: serverTimestamp() }));
  });

  it('a learner submits a 12-digit UTR together with its uniqueness index', async () => {
    const d = db(ALICE);
    const batch = writeBatch(d);
    batch.update(doc(d, 'registrations', `${ALICE}_${COURSE}`), { utr: '412345678901', utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp() });
    batch.set(doc(d, 'utrIndex', '412345678901'), { uid: ALICE, registrationId: `${ALICE}_${COURSE}`, createdAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
  });

  it('rejects a UTR update without the index, a malformed UTR, or extra field changes', async () => {
    const d = db(ALICE);
    const ref = doc(d, 'registrations', `${ALICE}_${COURSE}`);
    await assertFails(updateDoc(ref, { utr: '412345678901', utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp() }));
    const b1 = writeBatch(d);
    b1.update(ref, { utr: '4123', utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp() });
    b1.set(doc(d, 'utrIndex', '4123'), { uid: ALICE, registrationId: `${ALICE}_${COURSE}`, createdAt: serverTimestamp() });
    await assertFails(b1.commit());
    const b2 = writeBatch(d);
    b2.update(ref, { utr: '412345678901', utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp(), amountInr: 1 });
    b2.set(doc(d, 'utrIndex', '412345678901'), { uid: ALICE, registrationId: `${ALICE}_${COURSE}`, createdAt: serverTimestamp() });
    await assertFails(b2.commit());
  });

  it('a UTR already used by another registration is rejected (uniqueness)', async () => {
    await seed('utrIndex/412345678901', { uid: BOB, registrationId: `${BOB}_${COURSE}`, createdAt: Timestamp.now() });
    const d = db(ALICE);
    await assertFails(getDoc(doc(d, 'utrIndex', '412345678901')));
    const batch = writeBatch(d);
    batch.update(doc(d, 'registrations', `${ALICE}_${COURSE}`), { utr: '412345678901', utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp() });
    batch.set(doc(d, 'utrIndex', '412345678901'), { uid: ALICE, registrationId: `${ALICE}_${COURSE}`, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  it('a UTR cannot be submitted after the 24h hold expired', async () => {
    await seed(`registrations/${BOB}_${COURSE}`, {
      ...regData(BOB, COURSE),
      holdExpiresAt: Timestamp.fromMillis(Date.now() - HOUR),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const d = db(BOB);
    const batch = writeBatch(d);
    batch.update(doc(d, 'registrations', `${BOB}_${COURSE}`), { utr: '498765432109', utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp() });
    batch.set(doc(d, 'utrIndex', '498765432109'), { uid: BOB, registrationId: `${BOB}_${COURSE}`, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
    // …but the learner may renew the lapsed hold.
    await assertSucceeds(
      updateDoc(doc(d, 'registrations', `${BOB}_${COURSE}`), { holdExpiresAt: Timestamp.fromMillis(Date.now() + 23 * HOUR), updatedAt: serverTimestamp() }),
    );
  });
});

describe('privacy: nobody reads other people’s data', () => {
  beforeEach(async () => {
    await register(ALICE, COURSE);
  });

  it('learners read only their own registrations', async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), 'registrations', `${ALICE}_${COURSE}`)));
    await assertFails(getDoc(doc(db(BOB), 'registrations', `${ALICE}_${COURSE}`)));
    await assertFails(getDoc(doc(db(), 'registrations', `${ALICE}_${COURSE}`)));
    await assertSucceeds(getDocs(query(collection(db(ALICE), 'registrations'), where('uid', '==', ALICE))));
    await assertFails(getDocs(collection(db(BOB), 'registrations')));
    await assertSucceeds(getDocs(collection(db(ADMIN), 'registrations')));
  });

  it('learning progress is private and user-owned', async () => {
    const mine = doc(db(ALICE), 'progress', `${ALICE}_${COURSE}`);
    await assertSucceeds(setDoc(mine, { uid: ALICE, courseId: COURSE, completed: {}, lastRecordingId: null, updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(db(BOB), 'progress', `${ALICE}_${COURSE}`)));
    await assertFails(setDoc(doc(db(BOB), 'progress', `${ALICE}_${COURSE}`), { uid: BOB, courseId: COURSE, completed: {}, lastRecordingId: null, updatedAt: serverTimestamp() }));
  });

  it('user profiles are private', async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), 'users', ALICE), { displayName: 'Alice', email: 'a@example.com', streakCount: 1, streakLastDay: '2026-09-30', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
    await assertFails(getDoc(doc(db(BOB), 'users', ALICE)));
  });

  it('admin-only logs are closed to learners', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'auditLog', 'x'), { action: 'fake' }));
    await assertFails(getDocs(collection(db(ALICE), 'notificationLog')));
    await assertFails(getDocs(collection(db(ALICE), 'admins')));
  });
});

describe('subscribers', () => {
  const TOKEN = 'a'.repeat(40);
  const valid = () => ({
    name: 'Priya',
    email: 'priya@example.com',
    whatsapp: '+919876543210',
    interests: ['spoken'],
    channels: { email: true, whatsapp: true },
    consent: {
      email: { granted: true, at: serverTimestamp(), source: 'subscribe-page', textVersion: 'v1' },
      whatsapp: { granted: true, at: serverTimestamp(), source: 'subscribe-page', textVersion: 'v1' },
    },
    status: 'PENDING',
    token: TOKEN,
    source: 'subscribe-page',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    confirmedAt: null,
    unsubscribedAt: null,
  });

  it('anyone can subscribe with valid fields and explicit consent', async () => {
    await assertSucceeds(setDoc(doc(db(), 'subscribers', TOKEN), valid()));
  });

  it('rejects missing consent, bad numbers, pre-confirmed status or a non-token id', async () => {
    await assertFails(setDoc(doc(db(), 'subscribers', TOKEN), { ...valid(), consent: { email: null, whatsapp: null } }));
    await assertFails(setDoc(doc(db(), 'subscribers', TOKEN), { ...valid(), whatsapp: '98765' }));
    await assertFails(setDoc(doc(db(), 'subscribers', TOKEN), { ...valid(), status: 'CONFIRMED' }));
    await assertFails(setDoc(doc(db(), 'subscribers', 'priya-at-example'), { ...valid(), token: 'priya-at-example' }));
    await assertFails(setDoc(doc(db(), 'subscribers', TOKEN), { ...valid(), isAdmin: true }));
  });

  it('can never be read or listed publicly — not even by signed-in users', async () => {
    await seed(`subscribers/${TOKEN}`, { ...valid(), consent: { email: null, whatsapp: null }, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await assertFails(getDoc(doc(db(), 'subscribers', TOKEN)));
    await assertFails(getDocs(collection(db(), 'subscribers')));
    await assertFails(getDocs(collection(db(ALICE), 'subscribers')));
    await assertSucceeds(getDocs(collection(db(ADMIN), 'subscribers')));
  });

  it('the token link can confirm / unsubscribe but cannot change identity fields', async () => {
    await assertSucceeds(setDoc(doc(db(), 'subscribers', TOKEN), valid()));
    const ref = doc(db(), 'subscribers', TOKEN);
    await assertSucceeds(updateDoc(ref, { status: 'CONFIRMED', confirmedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { email: 'attacker@example.com', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { token: 'b'.repeat(40), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { status: 'UNSUBSCRIBED', unsubscribedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  });
});

describe('custom app requests', () => {
  const req = (uid: string, overrides: Record<string, unknown> = {}) => ({
    uid,
    reference: 'CR-ABC234',
    contact: { name: 'Alice', email: 'alice@example.com', phone: '', organisation: '' },
    projectType: 'Learning app',
    problem: 'Students need to practise chanting between classes.',
    targetUsers: 'Students',
    features: ['Sign-in & profiles'],
    referenceLinks: [],
    budgetInr: { min: 50000, max: 100000 },
    timelineWeeks: 8,
    preferredChannel: 'email',
    status: 'RECEIVED',
    statusHistory: [{ status: 'RECEIVED', at: Timestamp.now(), note: 'Request received' }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  });

  it('owner creates and reads; others cannot read; only admins change status', async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), 'customRequests', 'r1'), req(ALICE)));
    await assertFails(setDoc(doc(db(ALICE), 'customRequests', 'r2'), req(ALICE, { status: 'ACCEPTED' })));
    await assertFails(setDoc(doc(db(BOB), 'customRequests', 'r3'), req(ALICE)));
    await assertSucceeds(getDoc(doc(db(ALICE), 'customRequests', 'r1')));
    await assertFails(getDoc(doc(db(BOB), 'customRequests', 'r1')));
    await assertFails(updateDoc(doc(db(ALICE), 'customRequests', 'r1'), { status: 'DELIVERED' }));
    await assertSucceeds(updateDoc(doc(db(ADMIN), 'customRequests', 'r1'), { status: 'IN_REVIEW' }));
    await assertFails(getDoc(doc(db(ALICE), 'customRequests', 'r1', 'notes', 'n1')));
  });
});
