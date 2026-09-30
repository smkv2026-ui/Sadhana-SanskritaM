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
  CustomRequestStatus,
  LearningProgress,
  NewCustomRequestInput,
  NewRegistrationInput,
  NewSubscriberInput,
  NotificationLogEntry,
  Page,
  Registration,
  RegistrationStatus,
  SiteSettings,
  SiteStats,
  Subhashita,
  Subscriber,
  SubscriberPatch,
  Teacher,
  Testimonial,
  UserProfile,
} from './types';

export type Unsubscribe = () => void;

/** Errors surfaced to the UI with a stable code. */
export class BackendError extends Error {
  constructor(
    public readonly code:
      | 'not-found'
      | 'permission-denied'
      | 'sold-out'
      | 'utr-taken'
      | 'hold-expired'
      | 'already-registered'
      | 'invalid'
      | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export interface AuthApi {
  onChange(cb: (user: AuthUser | null) => void): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  sendEmailLink(email: string, continuePath: string): Promise<void>;
  /** Completes an email-link sign-in if the current URL is one. Returns true when it did. */
  completeEmailLink(url: string, email: string | null): Promise<'signed-in' | 'need-email' | 'not-a-link'>;
  signOut(): Promise<void>;
  /** Demo backend only: quick personas. */
  demoSignIn?(persona: 'learner' | 'admin'): Promise<void>;
}

export interface RegistrationQuery {
  status?: RegistrationStatus;
  courseId?: string;
  pageSize?: number;
  cursor?: string | null;
}

/**
 * The single data contract. `FirestoreBackend` implements it against Firestore (Spark plan);
 * `DemoBackend` implements it in the browser so the site works before Firebase is configured.
 */
export interface Backend {
  readonly kind: 'firebase' | 'demo';
  readonly auth: AuthApi;

  // ---- public catalog ----
  listCourses(opts?: { includeUnpublished?: boolean }): Promise<Course[]>;
  getCourseBySlug(slug: string): Promise<Course | null>;
  getCourse(id: string): Promise<Course | null>;
  listCourseStats(): Promise<CourseStats[]>;
  watchCourseStats(courseId: string, cb: (s: CourseStats) => void): Unsubscribe;
  listTeachers(): Promise<Teacher[]>;
  listTestimonials(): Promise<Testimonial[]>;
  listSubhashitas(): Promise<Subhashita[]>;
  getSiteStats(): Promise<SiteStats>;
  getSettings(): Promise<SiteSettings>;
  /** Stored overrides for categories/sub-categories (merged over DEFAULT_TAXONOMY by the caller). */
  getTaxonomy(): Promise<import('./taxonomy').Taxonomy | null>;
  getCoupon(code: string): Promise<Coupon | null>;

  // ---- signed-in learner ----
  isAdmin(uid: string): Promise<boolean>;
  getProfile(uid: string): Promise<UserProfile | null>;
  recordActivity(user: AuthUser): Promise<UserProfile>;
  getRegistration(id: string): Promise<Registration | null>;
  watchRegistration(id: string, cb: (r: Registration | null) => void): Unsubscribe;
  listMyRegistrations(uid: string): Promise<Registration[]>;
  createRegistration(input: NewRegistrationInput): Promise<Registration>;
  submitUtr(registrationId: string, utr: string): Promise<Registration>;
  renewHold(registrationId: string): Promise<Registration>;
  getCourseSecrets(courseId: string): Promise<CourseSecrets | null>;
  getProgress(uid: string, courseId: string): Promise<LearningProgress | null>;
  setRecordingComplete(uid: string, courseId: string, recordingId: string, done: boolean): Promise<LearningProgress>;
  createCustomRequest(input: NewCustomRequestInput): Promise<CustomRequest>;
  listMyCustomRequests(uid: string): Promise<CustomRequest[]>;

  // ---- public writes ----
  /** Returns the secret token, which is also the document id (capability link). */
  createSubscriber(input: NewSubscriberInput): Promise<Pick<Subscriber, 'id' | 'token'>>;
  updateSubscriberByToken(token: string, patch: SubscriberPatch): Promise<void>;
  createContactMessage(input: Omit<ContactMessage, 'id' | 'createdAt'>): Promise<void>;

  // ---- admin ----
  saveCourse(course: Course): Promise<void>;
  saveCourseSecrets(secrets: CourseSecrets): Promise<void>;
  saveTeacher(t: Teacher): Promise<void>;
  deleteTeacher(id: string): Promise<void>;
  saveTestimonial(t: Testimonial): Promise<void>;
  deleteTestimonial(id: string): Promise<void>;
  saveSubhashita(s: Subhashita): Promise<void>;
  deleteSubhashita(id: string): Promise<void>;
  listCoupons(): Promise<Coupon[]>;
  saveCoupon(c: Coupon): Promise<void>;
  deleteCoupon(code: string): Promise<void>;
  saveSiteStats(s: SiteStats): Promise<void>;
  saveSettings(s: SiteSettings): Promise<void>;
  saveTaxonomy(t: import('./taxonomy').Taxonomy): Promise<void>;

  listRegistrations(q: RegistrationQuery): Promise<Page<Registration>>;
  watchVerificationQueue(cb: (items: Registration[]) => void): Unsubscribe;
  decideRegistration(id: string, decision: 'APPROVED' | 'REJECTED', adminUid: string, reason?: string): Promise<void>;
  /** Sets the end of the learner's access window (null = unlimited). */
  setAccessUntil(id: string, accessUntil: string | null, adminUid: string): Promise<void>;
  releaseExpiredHolds(adminUid: string): Promise<number>;
  markRegistrationNotified(id: string, field: 'confirmationSentAt' | 'reminder24SentAt' | 'reminder1SentAt'): Promise<void>;
  countRegistrations(status?: RegistrationStatus): Promise<number>;

  listSubscribers(q: { pageSize?: number; cursor?: string | null }): Promise<Page<Subscriber>>;
  listSubscribersForSend(interests: string[]): Promise<Subscriber[]>;
  countSubscribers(): Promise<number>;

  listCustomRequests(): Promise<CustomRequest[]>;
  updateCustomRequestStatus(id: string, status: CustomRequestStatus, note: string): Promise<void>;
  listCustomRequestNotes(id: string): Promise<AdminNote[]>;
  addCustomRequestNote(id: string, text: string, by: string): Promise<void>;

  logNotification(entry: Omit<NotificationLogEntry, 'id' | 'at'>): Promise<void>;
  listNotificationLog(max?: number): Promise<NotificationLogEntry[]>;
  countNotificationsThisMonth(channel: 'email' | 'whatsapp'): Promise<number>;
  writeAudit(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<void>;
  listAudit(max?: number): Promise<AuditEntry[]>;
  listContactMessages(): Promise<ContactMessage[]>;

  loadDemoData(adminUid: string): Promise<void>;
}
