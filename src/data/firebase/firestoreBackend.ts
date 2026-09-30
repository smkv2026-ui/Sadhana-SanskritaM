import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { absUrl, routes } from '@/lib/links';
import { localDayKey, nextStreak } from '@/lib/format';
import { autoId, paymentReference, registrationId, secureToken } from '@/lib/ids';
import { couponError } from '@/lib/pricing';
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import { normalizeUtr, utrError } from '@/lib/utr';
import { BackendError, type AuthApi, type Backend, type RegistrationQuery, type Unsubscribe } from '../backend';
import { buildRegistration, canRestart, holdsSeat, isHoldExpired } from '../registrationLogic';
import { seedCoupons, seedCourses, seedSecrets, seedSettings, seedStats, seedSubhashitas, seedTeachers, seedTestimonials } from '../seed';
import type {
  AuthUser,
  Coupon,
  Course,
  CourseSecrets,
  CourseStats,
  CustomRequest,
  LearningProgress,
  Registration,
  SiteSettings,
  SiteStats,
  Subscriber,
  UserProfile,
} from '../types';
import { firebase } from './app';

// ---------- conversion helpers ----------

/** Recursively turn Firestore Timestamps into ISO strings. */
export function fromFs<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => fromFs(v)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, fromFs(v)])) as T;
  }
  return value as T;
}

const ts = (iso: string | null | undefined) => (iso ? Timestamp.fromDate(new Date(iso)) : null);

function snap<T>(d: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData | undefined }): T {
  return { id: d.id, ...fromFs<Record<string, unknown>>(d.data() ?? {}) } as T;
}

function mapError(err: unknown, fallback = 'Something went wrong. Please try again.'): never {
  if (err instanceof BackendError) throw err;
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) throw new BackendError('permission-denied', 'You do not have access to this.');
  if (code.includes('unavailable') || code.includes('deadline')) throw new BackendError('unavailable', 'You appear to be offline. Please retry.');
  if (code.includes('not-found')) throw new BackendError('not-found', 'Not found.');
  throw new BackendError('invalid', fallback);
}

function courseToFs(c: Course) {
  const { id: _id, ...rest } = c;
  return {
    ...rest,
    startsAt: ts(c.startsAt),
    endsAt: ts(c.endsAt),
    earlyBirdEndsAt: ts(c.earlyBirdEndsAt),
    createdAt: ts(c.createdAt) ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

const COL = {
  admins: 'admins',
  courses: 'courses',
  stats: 'courseStats',
  secrets: 'courseSecrets',
  teachers: 'teachers',
  testimonials: 'testimonials',
  subhashitas: 'subhashitas',
  coupons: 'coupons',
  site: 'site',
  registrations: 'registrations',
  utrIndex: 'utrIndex',
  progress: 'progress',
  users: 'users',
  subscribers: 'subscribers',
  customRequests: 'customRequests',
  notificationLog: 'notificationLog',
  auditLog: 'auditLog',
  contactMessages: 'contactMessages',
} as const;

export class FirestoreBackend implements Backend {
  readonly kind = 'firebase' as const;
  readonly auth: AuthApi;
  private readonly db = firebase().db;
  private readonly fbAuth = firebase().auth;
  private cursors = new Map<string, QueryDocumentSnapshot<DocumentData>>();

  constructor() {
    const fbAuth = this.fbAuth;
    this.auth = {
      onChange: (cb) =>
        onAuthStateChanged(fbAuth, (u) =>
          cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL } : null),
        ),
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          await signInWithPopup(fbAuth, provider);
        } catch (err) {
          const code = (err as { code?: string }).code ?? '';
          if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(fbAuth, provider);
            return;
          }
          if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
          if (code === 'auth/unauthorized-domain') {
            throw new BackendError('invalid', 'This domain is not yet authorised in Firebase Authentication (see README).');
          }
          throw err;
        }
      },
      sendEmailLink: async (email, continuePath) => {
        await sendSignInLinkToEmail(fbAuth, email, {
          url: absUrl(`${routes.authFinish}?next=${encodeURIComponent(continuePath)}`),
          handleCodeInApp: true,
        });
        writeStorage('local', STORAGE_KEYS.emailForSignIn, email);
      },
      completeEmailLink: async (url, email) => {
        if (!isSignInWithEmailLink(fbAuth, url)) return 'not-a-link';
        const address = email ?? readStorage('local', STORAGE_KEYS.emailForSignIn);
        if (!address) return 'need-email';
        await signInWithEmailLink(fbAuth, address, url);
        removeStorage('local', STORAGE_KEYS.emailForSignIn);
        return 'signed-in';
      },
      signOut: () => signOut(fbAuth),
    };
  }

  private uid(): string {
    const u = this.fbAuth.currentUser;
    if (!u) throw new BackendError('permission-denied', 'Please sign in first.');
    return u.uid;
  }

  private async page<T>(key: string, constraints: QueryConstraint[], colName: string, size: number, cursor?: string | null) {
    const c = [...constraints];
    if (cursor) {
      const after = this.cursors.get(cursor);
      if (after) c.push(startAfter(after));
    }
    c.push(limit(size));
    const res = await getDocs(query(collection(this.db, colName), ...c));
    const last = res.docs[res.docs.length - 1];
    let next: string | null = null;
    if (last && res.docs.length === size) {
      next = `${key}:${last.id}`;
      this.cursors.set(next, last);
    }
    return { items: res.docs.map((d) => snap<T>(d)), next };
  }

  // ---------- catalog ----------
  async listCourses(opts?: { includeUnpublished?: boolean }) {
    try {
      const constraints = opts?.includeUnpublished ? [limit(200)] : [where('status', '==', 'published'), limit(100)];
      const res = await getDocs(query(collection(this.db, COL.courses), ...constraints));
      return res.docs.map((d) => snap<Course>(d));
    } catch (e) {
      return mapError(e);
    }
  }
  async getCourseBySlug(slug: string) {
    try {
      const res = await getDocs(
        query(collection(this.db, COL.courses), where('slug', '==', slug), where('status', '==', 'published'), limit(1)),
      );
      if (res.docs[0]) return snap<Course>(res.docs[0]);
      // Admins can preview drafts.
      if (this.fbAuth.currentUser && (await this.isAdmin(this.fbAuth.currentUser.uid))) {
        const any = await getDocs(query(collection(this.db, COL.courses), where('slug', '==', slug), limit(1)));
        return any.docs[0] ? snap<Course>(any.docs[0]) : null;
      }
      return null;
    } catch (e) {
      return mapError(e);
    }
  }
  async getCourse(id: string) {
    try {
      const d = await getDoc(doc(this.db, COL.courses, id));
      return d.exists() ? snap<Course>(d) : null;
    } catch (e) {
      if ((e as { code?: string }).code === 'permission-denied') return null;
      return mapError(e);
    }
  }
  async listCourseStats() {
    const res = await getDocs(query(collection(this.db, COL.stats), limit(200)));
    return res.docs.map((d) => ({ courseId: d.id, seatsTaken: Number(d.data().seatsTaken ?? 0) }));
  }
  watchCourseStats(courseId: string, cb: (s: CourseStats) => void): Unsubscribe {
    return onSnapshot(
      doc(this.db, COL.stats, courseId),
      (d) => cb({ courseId, seatsTaken: Number(d.data()?.seatsTaken ?? 0) }),
      () => cb({ courseId, seatsTaken: 0 }),
    );
  }
  private async listOrdered<T>(col: string) {
    const res = await getDocs(query(collection(this.db, col), orderBy('order'), limit(100)));
    return res.docs.map((d) => snap<T>(d));
  }
  listTeachers() {
    return this.listOrdered<import('../types').Teacher>(COL.teachers);
  }
  listTestimonials() {
    return this.listOrdered<import('../types').Testimonial>(COL.testimonials);
  }
  listSubhashitas() {
    return this.listOrdered<import('../types').Subhashita>(COL.subhashitas);
  }
  async getSiteStats() {
    const d = await getDoc(doc(this.db, COL.site, 'stats'));
    return (d.exists() ? fromFs<SiteStats>(d.data()) : { learners: 0, courses: 0, countries: 0, hoursTaught: 0 }) as SiteStats;
  }
  async getSettings() {
    const d = await getDoc(doc(this.db, COL.site, 'settings'));
    return (d.exists() ? fromFs<SiteSettings>(d.data()) : seedSettings) as SiteSettings;
  }
  async getCoupon(code: string) {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(clean)) return null;
    try {
      const d = await getDoc(doc(this.db, COL.coupons, clean));
      return d.exists() ? ({ ...fromFs<Coupon>(d.data()), code: d.id } as Coupon) : null;
    } catch {
      return null;
    }
  }

  // ---------- learner ----------
  async isAdmin(uid: string) {
    try {
      return (await getDoc(doc(this.db, COL.admins, uid))).exists();
    } catch {
      return false;
    }
  }
  async getProfile(uid: string) {
    const d = await getDoc(doc(this.db, COL.users, uid));
    return d.exists() ? ({ uid, ...fromFs<Omit<UserProfile, 'uid'>>(d.data()) } as UserProfile) : null;
  }
  async recordActivity(user: AuthUser) {
    const ref = doc(this.db, COL.users, user.uid);
    const prev = await this.getProfile(user.uid).catch(() => null);
    const today = localDayKey();
    const streak = nextStreak(prev?.streakCount ?? 0, prev?.streakLastDay ?? null, today);
    const data = {
      displayName: (user.displayName ?? prev?.displayName ?? '').slice(0, 80),
      email: user.email ?? prev?.email ?? '',
      streakCount: streak.count,
      streakLastDay: streak.day,
      createdAt: prev ? ts(prev.createdAt) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // Skip the write when nothing changed today (saves writes).
    if (!prev || prev.streakLastDay !== today) await setDoc(ref, data);
    const now = new Date().toISOString();
    return { uid: user.uid, ...data, createdAt: prev?.createdAt ?? now, updatedAt: now } as UserProfile;
  }
  async getRegistration(id: string) {
    try {
      const d = await getDoc(doc(this.db, COL.registrations, id));
      return d.exists() ? snap<Registration>(d) : null;
    } catch (e) {
      return mapError(e);
    }
  }
  watchRegistration(id: string, cb: (r: Registration | null) => void): Unsubscribe {
    return onSnapshot(
      doc(this.db, COL.registrations, id),
      (d) => cb(d.exists() ? snap<Registration>(d) : null),
      () => cb(null),
    );
  }
  async listMyRegistrations(uid: string) {
    const res = await getDocs(query(collection(this.db, COL.registrations), where('uid', '==', uid), limit(50)));
    return res.docs.map((d) => snap<Registration>(d)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createRegistration(input: Parameters<Backend['createRegistration']>[0]) {
    const uid = this.uid();
    if (uid !== input.uid) throw new BackendError('permission-denied', 'Not allowed.');
    const regRef = doc(this.db, COL.registrations, registrationId(uid, input.course.id));
    const statsRef = doc(this.db, COL.stats, input.course.id);
    const courseRef = doc(this.db, COL.courses, input.course.id);
    const couponRef = input.couponCode ? doc(this.db, COL.coupons, input.couponCode.toUpperCase()) : null;
    try {
      return await runTransaction(this.db, async (tx) => {
        const [courseSnap, statsSnap, regSnap, couponSnap] = await Promise.all([
          tx.get(courseRef),
          tx.get(statsRef),
          tx.get(regRef),
          couponRef ? tx.get(couponRef) : Promise.resolve(null),
        ]);
        if (!courseSnap.exists()) throw new BackendError('not-found', 'This course is not open for registration.');
        const course = snap<Course>(courseSnap);
        if (course.status !== 'published') throw new BackendError('not-found', 'This course is not open for registration.');
        if (regSnap.exists()) {
          const existing = snap<Registration>(regSnap);
          if (isHoldExpired(existing)) throw new BackendError('hold-expired', 'Your earlier seat hold expired — renew it instead.');
          if (!canRestart(existing.status)) throw new BackendError('already-registered', 'You already have a registration for this course.');
        }
        const taken = Number(statsSnap.data()?.seatsTaken ?? 0);
        if (course.seatLimit && taken + 1 > course.seatLimit) throw new BackendError('sold-out', 'Sorry — all seats are taken.');
        const coupon = couponSnap?.exists() ? ({ ...fromFs<Coupon>(couponSnap.data()), code: couponSnap.id } as Coupon) : null;
        if (input.couponCode) {
          const err = couponError(coupon, course.id);
          if (err) throw new BackendError('invalid', err);
        }
        const reg = buildRegistration({ ...input, course }, coupon);
        const { id: _id, ...data } = reg;
        tx.set(regRef, {
          ...data,
          startsAt: ts(reg.startsAt),
          holdExpiresAt: ts(reg.holdExpiresAt),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (statsSnap.exists()) tx.update(statsRef, { seatsTaken: taken + 1 });
        else throw new BackendError('unavailable', 'Registration is not open yet for this course (missing seat counter).');
        return reg;
      });
    } catch (e) {
      return mapError(e, 'Could not reserve your seat. Please refresh and try again.');
    }
  }

  async submitUtr(id: string, rawUtr: string) {
    const uid = this.uid();
    const err = utrError(rawUtr);
    if (err) throw new BackendError('invalid', err);
    const utr = normalizeUtr(rawUtr);
    const regRef = doc(this.db, COL.registrations, id);
    const idxRef = doc(this.db, COL.utrIndex, utr);
    let idxExistsForThis = false;
    try {
      const idx = await getDoc(idxRef);
      if (idx.exists()) {
        if (idx.data().registrationId !== id) throw new BackendError('utr-taken', 'This UTR is already linked to another registration.');
        idxExistsForThis = true;
      }
    } catch (e) {
      if (e instanceof BackendError) throw e;
      // Rules deny reading another learner's index entry → the UTR is taken.
      if ((e as { code?: string }).code === 'permission-denied') {
        throw new BackendError('utr-taken', 'This UTR is already linked to another registration.');
      }
      return mapError(e);
    }
    const current = await this.getRegistration(id);
    if (!current) throw new BackendError('not-found', 'Registration not found.');
    if (isHoldExpired(current)) throw new BackendError('hold-expired', 'Your seat hold expired. Renew it and try again.');
    const batch = writeBatch(this.db);
    batch.update(regRef, { utr, utrSubmittedAt: serverTimestamp(), status: 'PENDING_VERIFICATION', updatedAt: serverTimestamp() });
    if (!idxExistsForThis) batch.set(idxRef, { uid, registrationId: id, createdAt: serverTimestamp() });
    try {
      await batch.commit();
    } catch (e) {
      return mapError(e, 'Could not submit the UTR. Please check it and try again.');
    }
    const now = new Date().toISOString();
    return { ...current, utr, utrSubmittedAt: now, status: 'PENDING_VERIFICATION', updatedAt: now } as Registration;
  }

  async renewHold(id: string) {
    const current = await this.getRegistration(id);
    if (!current || !isHoldExpired(current)) throw new BackendError('invalid', 'Nothing to renew.');
    const holdExpiresAt = new Date(Date.now() + 24 * 3_600_000 - 60_000).toISOString();
    try {
      await updateDoc(doc(this.db, COL.registrations, id), { holdExpiresAt: ts(holdExpiresAt), updatedAt: serverTimestamp() });
    } catch (e) {
      return mapError(e);
    }
    return { ...current, holdExpiresAt };
  }

  async getCourseSecrets(courseId: string) {
    try {
      const d = await getDoc(doc(this.db, COL.secrets, courseId));
      return d.exists() ? ({ courseId, ...fromFs<Omit<CourseSecrets, 'courseId'>>(d.data()) } as CourseSecrets) : null;
    } catch (e) {
      if ((e as { code?: string }).code === 'permission-denied') {
        throw new BackendError('permission-denied', 'Access unlocks after your payment is verified.');
      }
      return mapError(e);
    }
  }
  async getProgress(uid: string, courseId: string) {
    const d = await getDoc(doc(this.db, COL.progress, registrationId(uid, courseId)));
    return d.exists() ? snap<LearningProgress>(d) : null;
  }
  async setRecordingComplete(uid: string, courseId: string, recordingId: string, done: boolean) {
    const id = registrationId(uid, courseId);
    const prev = await this.getProgress(uid, courseId);
    const completed = { ...(prev?.completed ?? {}) };
    if (done) completed[recordingId] = new Date().toISOString();
    else delete completed[recordingId];
    await setDoc(doc(this.db, COL.progress, id), {
      uid,
      courseId,
      completed: Object.fromEntries(Object.entries(completed).map(([k, v]) => [k, ts(v)])),
      lastRecordingId: recordingId,
      updatedAt: serverTimestamp(),
    });
    return { id, uid, courseId, completed, lastRecordingId: recordingId, updatedAt: new Date().toISOString() };
  }
  async createCustomRequest(input: Parameters<Backend['createCustomRequest']>[0]) {
    const uid = this.uid();
    if (uid !== input.uid) throw new BackendError('permission-denied', 'Not allowed.');
    const id = autoId();
    const now = new Date().toISOString();
    const req: CustomRequest = {
      ...input,
      id,
      reference: paymentReference('CR'),
      status: 'RECEIVED',
      statusHistory: [{ status: 'RECEIVED', at: now, note: 'Request received' }],
      createdAt: now,
      updatedAt: now,
    };
    const { id: _id, ...data } = req;
    try {
      await setDoc(doc(this.db, COL.customRequests, id), {
        ...data,
        statusHistory: [{ status: 'RECEIVED', at: ts(now), note: 'Request received' }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      return mapError(e, 'Could not submit your request. Please check the fields and retry.');
    }
    return req;
  }
  async listMyCustomRequests(uid: string) {
    const res = await getDocs(query(collection(this.db, COL.customRequests), where('uid', '==', uid), limit(50)));
    return res.docs.map((d) => snap<CustomRequest>(d)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---------- public writes ----------
  async createSubscriber(input: Parameters<Backend['createSubscriber']>[0]) {
    const token = secureToken();
    const id = token; // the unguessable token is the document id (capability link)
    const consent = (granted: boolean) =>
      granted ? { granted: true, at: serverTimestamp(), source: input.source, textVersion: 'v1' } : null;
    try {
      await setDoc(doc(this.db, COL.subscribers, id), {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        whatsapp: input.whatsapp,
        interests: input.interests,
        channels: input.channels,
        consent: { email: consent(input.channels.email), whatsapp: consent(input.channels.whatsapp) },
        status: 'PENDING',
        token,
        source: input.source,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        confirmedAt: null,
        unsubscribedAt: null,
      });
    } catch (e) {
      return mapError(e, 'Could not subscribe. Please check the fields and retry.');
    }
    return { id, token };
  }
  async updateSubscriberByToken(token: string, patch: Parameters<Backend['updateSubscriberByToken']>[1]) {
    if (!/^[a-f0-9]{40}$/.test(token)) throw new BackendError('permission-denied', 'This link is invalid or has expired.');
    const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.interests) data.interests = patch.interests;
    if (patch.channels) {
      data.channels = patch.channels;
      data['consent.email'] = patch.channels.email ? { granted: true, at: serverTimestamp(), source: 'preferences', textVersion: 'v1' } : null;
      data['consent.whatsapp'] = patch.channels.whatsapp
        ? { granted: true, at: serverTimestamp(), source: 'preferences', textVersion: 'v1' }
        : null;
    }
    if (patch.status) {
      data.status = patch.status;
      if (patch.status === 'CONFIRMED') data.confirmedAt = serverTimestamp();
      if (patch.status === 'UNSUBSCRIBED') data.unsubscribedAt = serverTimestamp();
    }
    try {
      await updateDoc(doc(this.db, COL.subscribers, token), data);
    } catch (e) {
      if ((e as { code?: string }).code === 'permission-denied' || (e as { code?: string }).code === 'not-found') {
        throw new BackendError('permission-denied', 'This link is invalid or has expired.');
      }
      return mapError(e);
    }
  }
  async createContactMessage(input: Parameters<Backend['createContactMessage']>[0]) {
    try {
      await addDoc(collection(this.db, COL.contactMessages), { ...input, createdAt: serverTimestamp() });
    } catch (e) {
      return mapError(e, 'Could not send your message. Please retry.');
    }
  }

  // ---------- admin ----------
  async saveCourse(c: Course) {
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, COL.courses, c.id), courseToFs(c));
    const stats = await getDoc(doc(this.db, COL.stats, c.id));
    if (!stats.exists()) batch.set(doc(this.db, COL.stats, c.id), { seatsTaken: 0 });
    await batch.commit();
  }
  async saveCourseSecrets(s: CourseSecrets) {
    const { courseId, ...rest } = s;
    await setDoc(doc(this.db, COL.secrets, courseId), rest);
  }
  async saveTeacher(t: import('../types').Teacher) {
    const { id, ...rest } = t;
    await setDoc(doc(this.db, COL.teachers, id), rest);
  }
  async deleteTeacher(id: string) {
    await deleteDoc(doc(this.db, COL.teachers, id));
  }
  async saveTestimonial(t: import('../types').Testimonial) {
    const { id, ...rest } = t;
    await setDoc(doc(this.db, COL.testimonials, id), rest);
  }
  async deleteTestimonial(id: string) {
    await deleteDoc(doc(this.db, COL.testimonials, id));
  }
  async saveSubhashita(s: import('../types').Subhashita) {
    const { id, ...rest } = s;
    await setDoc(doc(this.db, COL.subhashitas, id), rest);
  }
  async deleteSubhashita(id: string) {
    await deleteDoc(doc(this.db, COL.subhashitas, id));
  }
  async listCoupons() {
    const res = await getDocs(query(collection(this.db, COL.coupons), limit(200)));
    return res.docs.map((d) => ({ ...fromFs<Coupon>(d.data()), code: d.id }));
  }
  async saveCoupon(c: Coupon) {
    const { code, ...rest } = c;
    await setDoc(doc(this.db, COL.coupons, code), { ...rest, validUntil: ts(c.validUntil) });
  }
  async deleteCoupon(code: string) {
    await deleteDoc(doc(this.db, COL.coupons, code));
  }
  async saveSiteStats(s: SiteStats) {
    await setDoc(doc(this.db, COL.site, 'stats'), s);
  }
  async saveSettings(s: SiteSettings) {
    await setDoc(doc(this.db, COL.site, 'settings'), s);
  }

  async listRegistrations(q: RegistrationQuery) {
    const c: QueryConstraint[] = [];
    if (q.courseId) c.push(where('courseId', '==', q.courseId));
    if (q.status) c.push(where('status', '==', q.status));
    c.push(orderBy('createdAt', 'desc'));
    return this.page<Registration>(`reg:${q.courseId ?? ''}:${q.status ?? ''}`, c, COL.registrations, q.pageSize ?? 25, q.cursor);
  }
  watchVerificationQueue(cb: (items: Registration[]) => void): Unsubscribe {
    return onSnapshot(
      query(
        collection(this.db, COL.registrations),
        where('status', '==', 'PENDING_VERIFICATION'),
        orderBy('utrSubmittedAt', 'asc'),
        limit(50),
      ),
      (res) => cb(res.docs.map((d) => snap<Registration>(d))),
      () => cb([]),
    );
  }
  async decideRegistration(id: string, decision: 'APPROVED' | 'REJECTED', adminUid: string, reason?: string) {
    const regRef = doc(this.db, COL.registrations, id);
    await runTransaction(this.db, async (tx) => {
      const r = await tx.get(regRef);
      if (!r.exists()) throw new BackendError('not-found', 'Registration not found.');
      const reg = snap<Registration>(r);
      const statsRef = doc(this.db, COL.stats, reg.courseId);
      const stats = await tx.get(statsRef);
      tx.update(regRef, {
        status: decision,
        decidedAt: serverTimestamp(),
        decidedBy: adminUid,
        rejectionReason: reason ?? null,
        updatedAt: serverTimestamp(),
      });
      if (decision === 'REJECTED' && holdsSeat(reg.status)) {
        tx.update(statsRef, { seatsTaken: Math.max(0, Number(stats.data()?.seatsTaken ?? 1) - 1) });
      }
      tx.set(doc(collection(this.db, COL.auditLog)), {
        at: serverTimestamp(),
        by: adminUid,
        action: `registration.${decision.toLowerCase()}`,
        target: id,
        details: reason ?? '',
      });
    });
  }
  async releaseExpiredHolds(adminUid: string) {
    const res = await getDocs(
      query(
        collection(this.db, COL.registrations),
        where('status', '==', 'PENDING_PAYMENT'),
        where('holdExpiresAt', '<=', Timestamp.now()),
        limit(100),
      ),
    );
    let n = 0;
    for (const d of res.docs) {
      const reg = snap<Registration>(d);
      await runTransaction(this.db, async (tx) => {
        const statsRef = doc(this.db, COL.stats, reg.courseId);
        const [fresh, stats] = await Promise.all([tx.get(d.ref), tx.get(statsRef)]);
        if (fresh.data()?.status !== 'PENDING_PAYMENT') return;
        tx.update(d.ref, { status: 'EXPIRED', updatedAt: serverTimestamp() });
        tx.update(statsRef, { seatsTaken: Math.max(0, Number(stats.data()?.seatsTaken ?? 1) - 1) });
        n++;
      });
    }
    if (n) await this.writeAudit({ by: adminUid, action: 'registration.release-expired', target: String(n), details: '' });
    return n;
  }
  async markRegistrationNotified(id: string, field: 'confirmationSentAt' | 'reminder24SentAt' | 'reminder1SentAt') {
    await updateDoc(doc(this.db, COL.registrations, id), { [field]: serverTimestamp() });
  }
  async countRegistrations(status?: Registration['status']) {
    const q = status
      ? query(collection(this.db, COL.registrations), where('status', '==', status))
      : query(collection(this.db, COL.registrations));
    return (await getCountFromServer(q)).data().count;
  }
  async listSubscribers(q: { pageSize?: number; cursor?: string | null }) {
    return this.page<Subscriber>('subs', [orderBy('createdAt', 'desc')], COL.subscribers, q.pageSize ?? 25, q.cursor);
  }
  async listSubscribersForSend(interests: string[]) {
    const base = collection(this.db, COL.subscribers);
    const q =
      interests.length > 0
        ? query(base, where('interests', 'array-contains-any', interests.slice(0, 30)), limit(1000))
        : query(base, orderBy('createdAt', 'desc'), limit(1000));
    const res = await getDocs(q);
    return res.docs.map((d) => snap<Subscriber>(d)).filter((s) => s.status !== 'UNSUBSCRIBED');
  }
  async countSubscribers() {
    return (
      await getCountFromServer(query(collection(this.db, COL.subscribers), where('status', 'in', ['PENDING', 'CONFIRMED'])))
    ).data().count;
  }
  async listCustomRequests() {
    const res = await getDocs(query(collection(this.db, COL.customRequests), orderBy('createdAt', 'desc'), limit(200)));
    return res.docs.map((d) => snap<CustomRequest>(d));
  }
  async updateCustomRequestStatus(id: string, status: CustomRequest['status'], note: string) {
    await updateDoc(doc(this.db, COL.customRequests, id), {
      status,
      statusHistory: arrayUnion({ status, at: Timestamp.now(), note }),
      updatedAt: serverTimestamp(),
    });
  }
  async listCustomRequestNotes(id: string) {
    const res = await getDocs(query(collection(this.db, COL.customRequests, id, 'notes'), orderBy('at', 'desc'), limit(100)));
    return res.docs.map((d) => snap<import('../types').AdminNote>(d));
  }
  async addCustomRequestNote(id: string, text: string, by: string) {
    await addDoc(collection(this.db, COL.customRequests, id, 'notes'), { text: text.slice(0, 2000), by, at: serverTimestamp() });
  }
  async logNotification(entry: Parameters<Backend['logNotification']>[0]) {
    await addDoc(collection(this.db, COL.notificationLog), { ...entry, at: serverTimestamp() });
  }
  async listNotificationLog(max = 100) {
    const res = await getDocs(query(collection(this.db, COL.notificationLog), orderBy('at', 'desc'), limit(max)));
    return res.docs.map((d) => snap<import('../types').NotificationLogEntry>(d));
  }
  async countNotificationsThisMonth(channel: 'email' | 'whatsapp') {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const q = query(
      collection(this.db, COL.notificationLog),
      where('channel', '==', channel),
      where('status', '==', 'sent'),
      where('at', '>=', Timestamp.fromDate(start)),
    );
    return (await getCountFromServer(q)).data().count;
  }
  async writeAudit(entry: Parameters<Backend['writeAudit']>[0]) {
    await addDoc(collection(this.db, COL.auditLog), { ...entry, at: serverTimestamp() });
  }
  async listAudit(max = 100) {
    const res = await getDocs(query(collection(this.db, COL.auditLog), orderBy('at', 'desc'), limit(max)));
    return res.docs.map((d) => snap<import('../types').AuditEntry>(d));
  }
  async listContactMessages() {
    const res = await getDocs(query(collection(this.db, COL.contactMessages), orderBy('createdAt', 'desc'), limit(100)));
    return res.docs.map((d) => snap<import('../types').ContactMessage>(d));
  }

  async loadDemoData(adminUid: string) {
    const courses = seedCourses();
    const batch = writeBatch(this.db);
    for (const c of courses) {
      batch.set(doc(this.db, COL.courses, c.id), courseToFs(c));
      batch.set(doc(this.db, COL.stats, c.id), { seatsTaken: 0 }, { merge: true });
    }
    for (const s of seedSecrets(courses)) {
      const { courseId, ...rest } = s;
      batch.set(doc(this.db, COL.secrets, courseId), rest);
    }
    for (const t of seedTeachers) {
      const { id, ...rest } = t;
      batch.set(doc(this.db, COL.teachers, id), rest);
    }
    for (const t of seedTestimonials) {
      const { id, ...rest } = t;
      batch.set(doc(this.db, COL.testimonials, id), rest);
    }
    for (const s of seedSubhashitas) {
      const { id, ...rest } = s;
      batch.set(doc(this.db, COL.subhashitas, id), rest);
    }
    for (const c of seedCoupons) {
      const { code, ...rest } = c;
      batch.set(doc(this.db, COL.coupons, code), { ...rest, validUntil: ts(c.validUntil) });
    }
    batch.set(doc(this.db, COL.site, 'stats'), seedStats);
    batch.set(doc(this.db, COL.site, 'settings'), seedSettings, { merge: true });
    batch.set(doc(collection(this.db, COL.auditLog)), { at: serverTimestamp(), by: adminUid, action: 'demo.load', target: 'all', details: '' });
    await batch.commit();
  }
}
