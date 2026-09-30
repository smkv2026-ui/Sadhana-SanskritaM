import { autoId, paymentReference, registrationId, secureToken } from '@/lib/ids';
import { localDayKey, nextStreak } from '@/lib/format';
import { readJson, STORAGE_KEYS, writeJson } from '@/lib/storage';
import { couponError } from '@/lib/pricing';
import { normalizeUtr, utrError } from '@/lib/utr';
import { BackendError, type AuthApi, type Backend, type RegistrationQuery, type Unsubscribe } from '../backend';
import { accessUntilFor, buildRegistration, canRestart, effectiveStatus, holdsSeat, isAccessExpired, isHoldExpired } from '../registrationLogic';
import type { Taxonomy } from '../taxonomy';
import {
  seedCoupons,
  seedCourses,
  seedSecrets,
  seedSettings,
  seedStats,
  seedSubhashitas,
  seedTeachers,
  seedTestimonials,
} from '../seed';
import type {
  AdminNote,
  AuditEntry,
  AuthUser,
  ContactMessage,
  Coupon,
  Course,
  CourseSecrets,
  CourseStats,
  CustomRequest,
  LearningProgress,
  NotificationLogEntry,
  Page,
  Registration,
  SiteSettings,
  SiteStats,
  Subhashita,
  Subscriber,
  Teacher,
  Testimonial,
  UserProfile,
} from '../types';

/**
 * In-browser backend used when Firebase is not configured (or VITE_BACKEND=demo).
 * It mirrors the Security Rules' behaviour (ownership, admin-only writes, seat limits,
 * UTR uniqueness, secrets gated on approval) so the product can be explored end-to-end.
 * Data lives in localStorage of this browser only.
 */
interface DemoDb {
  version: 2;
  taxonomy: Taxonomy | null;
  courses: Record<string, Course>;
  secrets: Record<string, CourseSecrets>;
  stats: Record<string, CourseStats>;
  teachers: Record<string, Teacher>;
  testimonials: Record<string, Testimonial>;
  subhashitas: Record<string, Subhashita>;
  coupons: Record<string, Coupon>;
  siteStats: SiteStats;
  settings: SiteSettings;
  registrations: Record<string, Registration>;
  utrIndex: Record<string, string>;
  progress: Record<string, LearningProgress>;
  users: Record<string, UserProfile>;
  subscribers: Record<string, Subscriber>;
  customRequests: Record<string, CustomRequest>;
  notes: Record<string, AdminNote[]>;
  notificationLog: NotificationLogEntry[];
  audit: AuditEntry[];
  contact: ContactMessage[];
  admins: string[];
}

const byId = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((i) => [i.id, i]));

function freshDb(): DemoDb {
  const courses = seedCourses();
  return {
    version: 2,
    taxonomy: null,
    courses: byId(courses),
    secrets: Object.fromEntries(seedSecrets(courses).map((s) => [s.courseId, s])),
    stats: Object.fromEntries(
      courses.map((c) => [c.id, { courseId: c.id, seatsTaken: c.seatLimit ? Math.floor(c.seatLimit * 0.55) : 37 }]),
    ),
    teachers: byId(seedTeachers),
    testimonials: byId(seedTestimonials),
    subhashitas: byId(seedSubhashitas),
    coupons: Object.fromEntries(seedCoupons.map((c) => [c.code, c])),
    siteStats: seedStats,
    settings: seedSettings,
    registrations: {},
    utrIndex: {},
    progress: {},
    users: {},
    subscribers: {},
    customRequests: {},
    notes: {},
    notificationLog: [],
    audit: [],
    contact: [],
    admins: ['demo-admin'],
  };
}

const PERSONAS: Record<'learner' | 'admin', AuthUser> = {
  learner: { uid: 'demo-learner', email: 'learner@example.com', displayName: 'Demo Learner', photoURL: null },
  admin: { uid: 'demo-admin', email: 'admin@example.com', displayName: 'Demo Admin', photoURL: null },
};

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class DemoBackend implements Backend {
  readonly kind = 'demo' as const;
  private db: DemoDb;
  private listeners = new Set<() => void>();
  private user: AuthUser | null;
  private authListeners = new Set<(u: AuthUser | null) => void>();
  readonly auth: AuthApi;

  constructor(private readonly persist = true) {
    const stored = persist ? readJson<DemoDb | null>('local', STORAGE_KEYS.demoDb, null) : null;
    this.db = stored && stored.version === 2 ? stored : freshDb();
    this.user = persist ? readJson<AuthUser | null>('local', STORAGE_KEYS.demoAuth, null) : null;

    if (persist && typeof window !== 'undefined') {
      // Keep several tabs in sync (e.g. learner tab + admin tab → live approval celebration).
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.demoDb && e.newValue) {
          try {
            this.db = JSON.parse(e.newValue) as DemoDb;
            this.emit();
          } catch {
            /* ignore */
          }
        }
      });
    }

    const setUser = (u: AuthUser | null) => {
      this.user = u;
      if (this.persist) writeJson('local', STORAGE_KEYS.demoAuth, u);
      this.authListeners.forEach((cb) => cb(u));
    };

    this.auth = {
      onChange: (cb) => {
        this.authListeners.add(cb);
        queueMicrotask(() => cb(this.user));
        return () => this.authListeners.delete(cb);
      },
      signInWithGoogle: async () => {
        await delay(300);
        setUser(PERSONAS.learner);
      },
      sendEmailLink: async (email) => {
        await delay(300);
        const name = email.split('@')[0];
        setUser({ uid: `demo-${name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'user'}`, email, displayName: name, photoURL: null });
      },
      completeEmailLink: async () => 'not-a-link',
      signOut: async () => setUser(null),
      demoSignIn: async (persona) => {
        await delay(150);
        setUser(PERSONAS[persona]);
      },
    };
  }

  // ---------- internals ----------
  private save() {
    if (this.persist) writeJson('local', STORAGE_KEYS.demoDb, this.db);
    this.emit();
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }
  private subscribe(fn: () => void): Unsubscribe {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private requireUser(uid?: string): AuthUser {
    if (!this.user) throw new BackendError('permission-denied', 'Please sign in first.');
    if (uid && this.user.uid !== uid) throw new BackendError('permission-denied', 'Not allowed.');
    return this.user;
  }
  private requireAdmin(): AuthUser {
    const u = this.requireUser();
    if (!this.db.admins.includes(u.uid)) throw new BackendError('permission-denied', 'Admins only.');
    return u;
  }
  private isAdminSync(): boolean {
    return Boolean(this.user && this.db.admins.includes(this.user.uid));
  }
  private bumpSeat(courseId: string, delta: number) {
    const s = this.db.stats[courseId] ?? { courseId, seatsTaken: 0 };
    this.db.stats[courseId] = { courseId, seatsTaken: Math.max(0, s.seatsTaken + delta) };
  }

  /** Test helper. */
  resetForTests(user: AuthUser | null = null) {
    this.db = freshDb();
    this.user = user;
  }
  setUserForTests(user: AuthUser | null) {
    this.user = user;
  }

  // ---------- catalog ----------
  async listCourses(opts?: { includeUnpublished?: boolean }) {
    await delay();
    const all = Object.values(this.db.courses);
    const visible = opts?.includeUnpublished && this.isAdminSync() ? all : all.filter((c) => c.status === 'published');
    return clone(visible);
  }
  async getCourseBySlug(slug: string) {
    await delay();
    const c = Object.values(this.db.courses).find((x) => x.slug === slug);
    if (!c || (c.status !== 'published' && !this.isAdminSync())) return null;
    return clone(c);
  }
  async getCourse(id: string) {
    await delay(40);
    const c = this.db.courses[id];
    if (!c || (c.status !== 'published' && !this.isAdminSync())) return null;
    return clone(c);
  }
  async listCourseStats() {
    await delay(40);
    return clone(Object.values(this.db.stats));
  }
  watchCourseStats(courseId: string, cb: (s: CourseStats) => void): Unsubscribe {
    const push = () => cb(clone(this.db.stats[courseId] ?? { courseId, seatsTaken: 0 }));
    queueMicrotask(push);
    return this.subscribe(push);
  }
  async listTeachers() {
    return clone(Object.values(this.db.teachers).sort((a, b) => a.order - b.order));
  }
  async listTestimonials() {
    return clone(Object.values(this.db.testimonials).sort((a, b) => a.order - b.order));
  }
  async listSubhashitas() {
    return clone(Object.values(this.db.subhashitas).sort((a, b) => a.order - b.order));
  }
  async getSiteStats() {
    return clone(this.db.siteStats);
  }
  async getSettings() {
    return clone(this.db.settings);
  }
  async getTaxonomy() {
    return clone(this.db.taxonomy ?? null);
  }
  async getCoupon(code: string) {
    await delay(200);
    const c = this.db.coupons[code.trim().toUpperCase()];
    return c ? clone(c) : null;
  }

  // ---------- learner ----------
  async isAdmin(uid: string) {
    return this.db.admins.includes(uid);
  }
  async getProfile(uid: string) {
    this.requireUser(uid);
    return clone(this.db.users[uid] ?? null);
  }
  async recordActivity(user: AuthUser) {
    this.requireUser(user.uid);
    const now = new Date();
    const prev = this.db.users[user.uid];
    const streak = nextStreak(prev?.streakCount ?? 0, prev?.streakLastDay ?? null, localDayKey(now));
    const profile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName ?? prev?.displayName ?? '',
      email: user.email ?? prev?.email ?? '',
      streakCount: streak.count,
      streakLastDay: streak.day,
      createdAt: prev?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.db.users[user.uid] = profile;
    this.save();
    return clone(profile);
  }
  async getRegistration(id: string) {
    const r = this.db.registrations[id];
    if (!r) return null;
    if (!this.isAdminSync() && r.uid !== this.user?.uid) throw new BackendError('permission-denied', 'Not allowed.');
    return clone(r);
  }
  watchRegistration(id: string, cb: (r: Registration | null) => void): Unsubscribe {
    const push = () => {
      const r = this.db.registrations[id];
      cb(r && (r.uid === this.user?.uid || this.isAdminSync()) ? clone(r) : null);
    };
    queueMicrotask(push);
    return this.subscribe(push);
  }
  async listMyRegistrations(uid: string) {
    this.requireUser(uid);
    await delay();
    return clone(
      Object.values(this.db.registrations)
        .filter((r) => r.uid === uid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  async createRegistration(input: Parameters<Backend['createRegistration']>[0]) {
    this.requireUser(input.uid);
    await delay(350);
    const course = this.db.courses[input.course.id];
    if (!course || course.status !== 'published') throw new BackendError('not-found', 'This course is not open for registration.');
    const id = registrationId(input.uid, course.id);
    const existing = this.db.registrations[id];
    if (existing && !canRestart(effectiveStatus(existing))) {
      throw new BackendError('already-registered', 'You already have a registration for this course.');
    }
    const stillHolding = existing && holdsSeat(existing.status); // expired-on-read but not yet released
    const stats = this.db.stats[course.id]?.seatsTaken ?? 0;
    if (!stillHolding && course.seatLimit && stats + 1 > course.seatLimit) {
      throw new BackendError('sold-out', 'Sorry — all seats are taken.');
    }
    const coupon = input.couponCode ? this.db.coupons[input.couponCode.toUpperCase()] ?? null : null;
    if (input.couponCode && couponError(coupon, course.id)) throw new BackendError('invalid', couponError(coupon, course.id) as string);
    const reg = buildRegistration({ ...input, course }, coupon);
    this.db.registrations[id] = reg;
    if (!stillHolding) this.bumpSeat(course.id, +1);
    this.save();
    return clone(reg);
  }
  async submitUtr(id: string, rawUtr: string) {
    const r = this.db.registrations[id];
    if (!r) throw new BackendError('not-found', 'Registration not found.');
    this.requireUser(r.uid);
    await delay(400);
    const err = utrError(rawUtr);
    if (err) throw new BackendError('invalid', err);
    const utr = normalizeUtr(rawUtr);
    if (r.status !== 'PENDING_PAYMENT' && r.status !== 'PENDING_VERIFICATION') {
      throw new BackendError('invalid', 'This registration can no longer be updated.');
    }
    if (isHoldExpired(r)) throw new BackendError('hold-expired', 'Your seat hold expired. Renew it and try again.');
    const owner = this.db.utrIndex[utr];
    if (owner && owner !== id) throw new BackendError('utr-taken', 'This UTR is already linked to another registration.');
    this.db.utrIndex[utr] = id;
    const now = new Date().toISOString();
    Object.assign(r, { utr, utrSubmittedAt: now, status: 'PENDING_VERIFICATION', updatedAt: now });
    this.save();
    return clone(r);
  }
  async renewHold(id: string) {
    const r = this.db.registrations[id];
    if (!r) throw new BackendError('not-found', 'Registration not found.');
    this.requireUser(r.uid);
    if (r.status !== 'PENDING_PAYMENT' || !isHoldExpired(r)) throw new BackendError('invalid', 'Nothing to renew.');
    const now = Date.now();
    Object.assign(r, { holdExpiresAt: new Date(now + 24 * 3_600_000 - 60_000).toISOString(), updatedAt: new Date(now).toISOString() });
    this.save();
    return clone(r);
  }
  async getCourseSecrets(courseId: string) {
    await delay();
    const u = this.requireUser();
    const reg = this.db.registrations[registrationId(u.uid, courseId)];
    if (!this.isAdminSync() && reg?.status !== 'APPROVED') {
      throw new BackendError('permission-denied', 'Access unlocks after your payment is verified.');
    }
    if (!this.isAdminSync() && reg && isAccessExpired(reg)) {
      throw new BackendError('permission-denied', 'Your access window for this course has ended.');
    }
    return clone(this.db.secrets[courseId] ?? null);
  }
  async getProgress(uid: string, courseId: string) {
    this.requireUser(uid);
    return clone(this.db.progress[registrationId(uid, courseId)] ?? null);
  }
  async setRecordingComplete(uid: string, courseId: string, recordingId: string, done: boolean) {
    this.requireUser(uid);
    const id = registrationId(uid, courseId);
    const now = new Date().toISOString();
    const p: LearningProgress = this.db.progress[id] ?? { id, uid, courseId, completed: {}, lastRecordingId: null, updatedAt: now };
    if (done) p.completed[recordingId] = now;
    else delete p.completed[recordingId];
    p.lastRecordingId = recordingId;
    p.updatedAt = now;
    this.db.progress[id] = p;
    this.save();
    return clone(p);
  }
  async createCustomRequest(input: Parameters<Backend['createCustomRequest']>[0]) {
    this.requireUser(input.uid);
    await delay(400);
    const now = new Date().toISOString();
    const req: CustomRequest = {
      ...input,
      id: autoId(),
      reference: paymentReference('CR'),
      status: 'RECEIVED',
      statusHistory: [{ status: 'RECEIVED', at: now, note: 'Request received' }],
      createdAt: now,
      updatedAt: now,
    };
    this.db.customRequests[req.id] = req;
    this.save();
    return clone(req);
  }
  async listMyCustomRequests(uid: string) {
    this.requireUser(uid);
    return clone(
      Object.values(this.db.customRequests)
        .filter((r) => r.uid === uid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  // ---------- public writes ----------
  async createSubscriber(input: Parameters<Backend['createSubscriber']>[0]) {
    await delay(300);
    const now = new Date().toISOString();
    const consent = (granted: boolean) => (granted ? { granted: true, at: now, source: input.source, textVersion: 'v1' } : null);
    const token = secureToken();
    const sub: Subscriber = {
      id: token,
      token,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      whatsapp: input.whatsapp,
      interests: input.interests,
      channels: input.channels,
      consent: { email: consent(input.channels.email), whatsapp: consent(input.channels.whatsapp) },
      status: 'PENDING',
      source: input.source,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      unsubscribedAt: null,
    };
    this.db.subscribers[sub.id] = sub;
    this.save();
    return { id: sub.id, token: sub.token };
  }
  async updateSubscriberByToken(token: string, patch: Parameters<Backend['updateSubscriberByToken']>[1]) {
    await delay(250);
    const s = this.db.subscribers[token];
    if (!s || s.token !== token) throw new BackendError('permission-denied', 'This link is invalid or has expired.');
    const now = new Date().toISOString();
    if (patch.interests) s.interests = patch.interests;
    if (patch.channels) {
      s.channels = patch.channels;
      s.consent = {
        email: patch.channels.email ? s.consent.email ?? { granted: true, at: now, source: 'preferences', textVersion: 'v1' } : null,
        whatsapp: patch.channels.whatsapp
          ? s.consent.whatsapp ?? { granted: true, at: now, source: 'preferences', textVersion: 'v1' }
          : null,
      };
    }
    if (patch.status) {
      s.status = patch.status;
      if (patch.status === 'CONFIRMED') s.confirmedAt = s.confirmedAt ?? now;
      if (patch.status === 'UNSUBSCRIBED') s.unsubscribedAt = now;
    }
    s.updatedAt = now;
    this.save();
  }
  async createContactMessage(input: Omit<ContactMessage, 'id' | 'createdAt'>) {
    await delay(300);
    this.db.contact.unshift({ ...input, id: autoId(), createdAt: new Date().toISOString() });
    this.save();
  }

  // ---------- admin ----------
  private adminWrite(fn: () => void) {
    this.requireAdmin();
    fn();
    this.save();
    return Promise.resolve();
  }
  saveCourse(c: Course) {
    return this.adminWrite(() => {
      this.db.courses[c.id] = { ...c, updatedAt: new Date().toISOString() };
      this.db.stats[c.id] ??= { courseId: c.id, seatsTaken: 0 };
    });
  }
  saveCourseSecrets(s: CourseSecrets) {
    return this.adminWrite(() => void (this.db.secrets[s.courseId] = s));
  }
  saveTeacher(t: Teacher) {
    return this.adminWrite(() => void (this.db.teachers[t.id] = t));
  }
  deleteTeacher(id: string) {
    return this.adminWrite(() => void delete this.db.teachers[id]);
  }
  saveTestimonial(t: Testimonial) {
    return this.adminWrite(() => void (this.db.testimonials[t.id] = t));
  }
  deleteTestimonial(id: string) {
    return this.adminWrite(() => void delete this.db.testimonials[id]);
  }
  saveSubhashita(s: Subhashita) {
    return this.adminWrite(() => void (this.db.subhashitas[s.id] = s));
  }
  deleteSubhashita(id: string) {
    return this.adminWrite(() => void delete this.db.subhashitas[id]);
  }
  async listCoupons() {
    this.requireAdmin();
    return clone(Object.values(this.db.coupons));
  }
  saveCoupon(c: Coupon) {
    return this.adminWrite(() => void (this.db.coupons[c.code] = c));
  }
  deleteCoupon(code: string) {
    return this.adminWrite(() => void delete this.db.coupons[code]);
  }
  saveSiteStats(s: SiteStats) {
    return this.adminWrite(() => void (this.db.siteStats = s));
  }
  saveSettings(s: SiteSettings) {
    return this.adminWrite(() => void (this.db.settings = s));
  }
  saveTaxonomy(t: Taxonomy) {
    return this.adminWrite(() => void (this.db.taxonomy = clone(t)));
  }

  async listRegistrations(q: RegistrationQuery): Promise<Page<Registration>> {
    this.requireAdmin();
    await delay();
    const size = q.pageSize ?? 25;
    const all = Object.values(this.db.registrations)
      .filter((r) => (!q.status || r.status === q.status) && (!q.courseId || r.courseId === q.courseId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = q.cursor ? Number(q.cursor) : 0;
    const items = all.slice(start, start + size);
    return { items: clone(items), next: start + size < all.length ? String(start + size) : null };
  }
  watchVerificationQueue(cb: (items: Registration[]) => void): Unsubscribe {
    const push = () => {
      if (!this.isAdminSync()) return cb([]);
      cb(
        clone(
          Object.values(this.db.registrations)
            .filter((r) => r.status === 'PENDING_VERIFICATION')
            .sort((a, b) => (a.utrSubmittedAt ?? a.createdAt).localeCompare(b.utrSubmittedAt ?? b.createdAt))
            .slice(0, 50),
        ),
      );
    };
    queueMicrotask(push);
    return this.subscribe(push);
  }
  async decideRegistration(id: string, decision: 'APPROVED' | 'REJECTED', adminUid: string, reason?: string) {
    this.requireAdmin();
    await delay(250);
    const r = this.db.registrations[id];
    if (!r) throw new BackendError('not-found', 'Registration not found.');
    const now = new Date().toISOString();
    if (decision === 'REJECTED' && holdsSeat(r.status)) this.bumpSeat(r.courseId, -1);
    const accessUntil = decision === 'APPROVED' ? accessUntilFor(this.db.courses[r.courseId]?.accessDays) : null;
    Object.assign(r, { status: decision, decidedAt: now, decidedBy: adminUid, rejectionReason: reason ?? null, updatedAt: now, accessUntil });
    this.db.audit.unshift({ id: autoId(), at: now, by: adminUid, action: `registration.${decision.toLowerCase()}`, target: id, details: reason ?? '' });
    this.save();
  }
  async setAccessUntil(id: string, accessUntil: string | null, adminUid: string) {
    this.requireAdmin();
    const r = this.db.registrations[id];
    if (!r) throw new BackendError('not-found', 'Registration not found.');
    const now = new Date().toISOString();
    Object.assign(r, { accessUntil, updatedAt: now });
    this.db.audit.unshift({ id: autoId(), at: now, by: adminUid, action: 'registration.access', target: id, details: accessUntil ?? 'unlimited' });
    this.save();
  }
  async releaseExpiredHolds(adminUid: string) {
    this.requireAdmin();
    let n = 0;
    const now = new Date().toISOString();
    for (const r of Object.values(this.db.registrations)) {
      if (isHoldExpired(r)) {
        r.status = 'EXPIRED';
        r.updatedAt = now;
        this.bumpSeat(r.courseId, -1);
        n++;
      }
    }
    if (n) this.db.audit.unshift({ id: autoId(), at: now, by: adminUid, action: 'registration.release-expired', target: `${n}`, details: '' });
    this.save();
    return n;
  }
  markRegistrationNotified(id: string, field: 'confirmationSentAt' | 'reminder24SentAt' | 'reminder1SentAt') {
    return this.adminWrite(() => {
      const r = this.db.registrations[id];
      if (r) r[field] = new Date().toISOString();
    });
  }
  async countRegistrations(status?: Registration['status']) {
    this.requireAdmin();
    return Object.values(this.db.registrations).filter((r) => !status || r.status === status).length;
  }
  async listSubscribers(q: { pageSize?: number; cursor?: string | null }) {
    this.requireAdmin();
    const size = q.pageSize ?? 25;
    const all = Object.values(this.db.subscribers).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = q.cursor ? Number(q.cursor) : 0;
    return { items: clone(all.slice(start, start + size)), next: start + size < all.length ? String(start + size) : null };
  }
  async listSubscribersForSend(interests: string[]) {
    this.requireAdmin();
    return clone(
      Object.values(this.db.subscribers).filter(
        (s) => s.status !== 'UNSUBSCRIBED' && (interests.length === 0 || s.interests.some((i) => interests.includes(i))),
      ),
    );
  }
  async countSubscribers() {
    this.requireAdmin();
    return Object.values(this.db.subscribers).filter((s) => s.status !== 'UNSUBSCRIBED').length;
  }
  async listCustomRequests() {
    this.requireAdmin();
    return clone(Object.values(this.db.customRequests).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  updateCustomRequestStatus(id: string, status: CustomRequest['status'], note: string) {
    return this.adminWrite(() => {
      const r = this.db.customRequests[id];
      if (!r) return;
      const now = new Date().toISOString();
      r.status = status;
      r.statusHistory.push({ status, at: now, note });
      r.updatedAt = now;
    });
  }
  async listCustomRequestNotes(id: string) {
    this.requireAdmin();
    return clone(this.db.notes[id] ?? []);
  }
  addCustomRequestNote(id: string, text: string, by: string) {
    return this.adminWrite(() => {
      (this.db.notes[id] ??= []).unshift({ id: autoId(), text, by, at: new Date().toISOString() });
    });
  }
  logNotification(entry: Omit<NotificationLogEntry, 'id' | 'at'>) {
    return this.adminWrite(() => {
      this.db.notificationLog.unshift({ ...entry, id: autoId(), at: new Date().toISOString() });
      this.db.notificationLog = this.db.notificationLog.slice(0, 500);
    });
  }
  async listNotificationLog(max = 100) {
    this.requireAdmin();
    return clone(this.db.notificationLog.slice(0, max));
  }
  async countNotificationsThisMonth(channel: 'email' | 'whatsapp') {
    this.requireAdmin();
    const month = new Date().toISOString().slice(0, 7);
    return this.db.notificationLog.filter((n) => n.channel === channel && n.status === 'sent' && n.at.startsWith(month)).length;
  }
  writeAudit(entry: Omit<AuditEntry, 'id' | 'at'>) {
    return this.adminWrite(() => {
      this.db.audit.unshift({ ...entry, id: autoId(), at: new Date().toISOString() });
      this.db.audit = this.db.audit.slice(0, 500);
    });
  }
  async listAudit(max = 100) {
    this.requireAdmin();
    return clone(this.db.audit.slice(0, max));
  }
  async listContactMessages() {
    this.requireAdmin();
    return clone(this.db.contact);
  }
  async loadDemoData(adminUid: string) {
    this.requireAdmin();
    const keep = { registrations: this.db.registrations, subscribers: this.db.subscribers, audit: this.db.audit };
    this.db = { ...freshDb(), ...keep, admins: this.db.admins };
    this.db.audit.unshift({ id: autoId(), at: new Date().toISOString(), by: adminUid, action: 'demo.load', target: 'all', details: '' });
    this.save();
  }
}
