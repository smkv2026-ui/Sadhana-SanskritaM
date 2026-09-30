/**
 * Domain model. Dates are ISO-8601 strings in the app; the Firestore adapter converts them
 * to/from Timestamps (Security Rules compare timestamps, e.g. for seat-hold expiry).
 */

export type ISODate = string;

export type CourseKind = 'course' | 'event';
export type CourseType = 'recorded' | 'live' | 'hybrid';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type PublishStatus = 'draft' | 'published' | 'archived';
export type Goal = 'speak' | 'read-texts' | 'chanting' | 'grammar' | 'philosophy' | 'kids';

export interface SyllabusModule {
  id: string;
  title: string;
  items: string[];
  durationMinutes?: number;
}

export interface Course {
  id: string;
  slug: string;
  kind: CourseKind;
  title: string;
  titleSa?: string;
  type: CourseType;
  level: Level;
  goals: Goal[];
  tags: string[];
  summary: string;
  description: string;
  outcomes: string[];
  syllabus: SyllabusModule[];
  teacherIds: string[];
  /** First session / event start. */
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  timezone: string;
  /** Length of one session in minutes (live) or total runtime (recorded). */
  durationMinutes: number;
  sessionsCount: number;
  weeklyHours: number;
  scheduleText: string;
  language: string;
  priceInr: number;
  earlyBirdPriceInr: number | null;
  earlyBirdEndsAt: ISODate | null;
  /** 0 = unlimited seats. */
  seatLimit: number;
  coverImage: string;
  accent: string;
  status: PublishStatus;
  featured: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Counter document `courseStats/{courseId}` — seats currently held/approved. */
export interface CourseStats {
  courseId: string;
  seatsTaken: number;
}

export interface Recording {
  id: string;
  title: string;
  url: string;
  durationMinutes: number;
}

/** `courseSecrets/{courseId}` — readable only by admins and APPROVED registrants. */
export interface CourseSecrets {
  courseId: string;
  meetingLink: string;
  meetingNotes: string;
  recordings: Recording[];
  resources: { title: string; url: string }[];
}

export interface Teacher {
  id: string;
  name: string;
  nameSa?: string;
  title: string;
  bio: string;
  photoUrl?: string;
  order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  order: number;
}

export interface Subhashita {
  id: string;
  deva: string;
  iast: string;
  meaning: string;
  source?: string;
  active: boolean;
  order: number;
}

export type CouponKind = 'percent' | 'flat';

export interface Coupon {
  /** Upper-case code, also the document id. */
  code: string;
  kind: CouponKind;
  value: number;
  /** Empty = valid for every course. */
  courseIds: string[];
  validUntil: ISODate | null;
  active: boolean;
  description: string;
}

export interface SiteStats {
  learners: number;
  courses: number;
  countries: number;
  hoursTaught: number;
}

export interface SiteSettings {
  whatsappChannelUrl: string;
  announcement: string;
}

export type RegistrationStatus = 'PENDING_PAYMENT' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Participant {
  name: string;
  email: string;
  /** E.164, e.g. +919876543210 */
  phone: string;
  city: string;
}

/** `registrations/{uid}_{courseId}` */
export interface Registration {
  id: string;
  uid: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseType: CourseType;
  startsAt: ISODate | null;
  participant: Participant;
  basePriceInr: number;
  discountInr: number;
  amountInr: number;
  couponCode: string | null;
  reference: string;
  status: RegistrationStatus;
  utr: string | null;
  utrSubmittedAt: ISODate | null;
  holdExpiresAt: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
  decidedAt: ISODate | null;
  decidedBy: string | null;
  rejectionReason: string | null;
  confirmationSentAt: ISODate | null;
  reminder24SentAt: ISODate | null;
  reminder1SentAt: ISODate | null;
}

export interface NewRegistrationInput {
  uid: string;
  course: Course;
  participant: Participant;
  couponCode: string | null;
}

/** `progress/{uid}_{courseId}` — user-owned, separate from registration status. */
export interface LearningProgress {
  id: string;
  uid: string;
  courseId: string;
  completed: Record<string, ISODate>;
  lastRecordingId: string | null;
  updatedAt: ISODate;
}

/** `users/{uid}` */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  streakCount: number;
  streakLastDay: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ConsentRecord {
  granted: boolean;
  at: ISODate;
  source: string;
  /** Version of the consent wording shown to the visitor. */
  textVersion: string;
}

export type SubscriberStatus = 'PENDING' | 'CONFIRMED' | 'UNSUBSCRIBED';

/** `subscribers/{id}` — public create, never publicly readable. */
export interface Subscriber {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  interests: string[];
  channels: { email: boolean; whatsapp: boolean };
  consent: { email: ConsentRecord | null; whatsapp: ConsentRecord | null };
  status: SubscriberStatus;
  token: string;
  source: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  confirmedAt: ISODate | null;
  unsubscribedAt: ISODate | null;
}

export interface NewSubscriberInput {
  name: string;
  email: string;
  whatsapp: string | null;
  interests: string[];
  channels: { email: boolean; whatsapp: boolean };
  source: string;
}

export type SubscriberPatch = Partial<Pick<Subscriber, 'interests' | 'channels' | 'status'>>;

export type CustomRequestStatus = 'RECEIVED' | 'IN_REVIEW' | 'PROPOSAL_SENT' | 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED';

export const CUSTOM_REQUEST_STATUSES: CustomRequestStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'PROPOSAL_SENT',
  'ACCEPTED',
  'IN_PROGRESS',
  'DELIVERED',
];

export interface CustomRequest {
  id: string;
  uid: string;
  reference: string;
  contact: { name: string; email: string; phone: string; organisation: string };
  projectType: string;
  problem: string;
  targetUsers: string;
  features: string[];
  referenceLinks: string[];
  budgetInr: { min: number; max: number };
  timelineWeeks: number;
  preferredChannel: 'email' | 'whatsapp' | 'phone';
  status: CustomRequestStatus;
  statusHistory: { status: CustomRequestStatus; at: ISODate; note: string }[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type NewCustomRequestInput = Omit<CustomRequest, 'id' | 'reference' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'>;

export interface AdminNote {
  id: string;
  text: string;
  at: ISODate;
  by: string;
}

export type NotificationKind =
  | 'announcement'
  | 'confirmation'
  | 'reminder-24h'
  | 'reminder-1h'
  | 'custom-request'
  | 'test';

export interface NotificationLogEntry {
  id: string;
  kind: NotificationKind;
  channel: 'email' | 'whatsapp';
  /** Masked recipient (never the full address/number). */
  recipient: string;
  refId: string;
  subject: string;
  status: 'sent' | 'failed' | 'opened';
  error: string | null;
  at: ISODate;
  by: string;
}

export interface AuditEntry {
  id: string;
  at: ISODate;
  by: string;
  action: string;
  target: string;
  details: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  kind: 'contact' | 'delete-my-data';
  uid: string | null;
  createdAt: ISODate;
}

export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page, null at the end. */
  next: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
