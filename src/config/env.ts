/**
 * Typed runtime configuration. Values come from Vite env variables that GitHub Actions
 * injects from repository Variables / Secrets at build time (see README → "Repository variables").
 *
 * The Firebase web config is public by design; Firestore Security Rules are the security.
 */
import { siteConfig } from './site.config';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string' || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const e = import.meta.env;

const fb = siteConfig.firebase;
export const firebaseConfig = {
  apiKey: str(e.VITE_FIREBASE_API_KEY, fb.apiKey),
  authDomain: str(e.VITE_FIREBASE_AUTH_DOMAIN, fb.authDomain),
  projectId: str(e.VITE_FIREBASE_PROJECT_ID, fb.projectId),
  storageBucket: str(e.VITE_FIREBASE_STORAGE_BUCKET, fb.storageBucket),
  messagingSenderId: str(e.VITE_FIREBASE_MESSAGING_SENDER_ID, fb.messagingSenderId),
  appId: str(e.VITE_FIREBASE_APP_ID, fb.appId),
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export type BackendKind = 'firebase' | 'demo';

export const env = {
  /** "firebase" when configured, otherwise a fully working in-browser demo backend. */
  backend: (str(e.VITE_BACKEND) === 'demo' || !isFirebaseConfigured ? 'demo' : 'firebase') as BackendKind,
  siteUrl: str(e.VITE_SITE_URL, typeof window !== 'undefined' ? window.location.origin + import.meta.env.BASE_URL : ''),
  basePath: import.meta.env.BASE_URL,

  upi: {
    vpa: str(e.VITE_UPI_VPA, str(siteConfig.upi.vpa, 'sadhanasanskritam@upi')),
    payeeName: str(e.VITE_UPI_PAYEE_NAME, str(siteConfig.upi.payeeName, 'Sadhana Sanskritam')),
    /** True when the placeholder VPA is still in use — the UI warns admins. */
    isPlaceholder: !str(e.VITE_UPI_VPA, siteConfig.upi.vpa),
  },

  contact: {
    email: str(e.VITE_CONTACT_EMAIL, siteConfig.contact.email),
    whatsapp: str(e.VITE_CONTACT_WHATSAPP, siteConfig.contact.whatsapp),
    whatsappChannelUrl: str(e.VITE_WHATSAPP_CHANNEL_URL, siteConfig.contact.whatsappChannelUrl),
    adminAlertEmail: str(e.VITE_ADMIN_ALERT_EMAIL, str(siteConfig.contact.adminAlertEmail, str(e.VITE_CONTACT_EMAIL, siteConfig.contact.email))),
  },

  providers: {
    payment: str(e.VITE_PAYMENT_PROVIDER, 'manual-upi') as 'manual-upi' | 'razorpay',
    email: str(e.VITE_EMAIL_PROVIDER, str(e.VITE_EMAILJS_PUBLIC_KEY, siteConfig.emailjs.publicKey) ? 'emailjs' : 'console') as
      | 'emailjs'
      | 'console'
      | 'server',
    whatsapp: str(e.VITE_WHATSAPP_PROVIDER, 'wa-me') as 'wa-me' | 'cloud-api',
    access: str(e.VITE_ACCESS_PROVIDER, 'firestore-rules') as 'firestore-rules' | 'signed-url',
  },

  emailjs: {
    publicKey: str(e.VITE_EMAILJS_PUBLIC_KEY, siteConfig.emailjs.publicKey),
    serviceId: str(e.VITE_EMAILJS_SERVICE_ID, siteConfig.emailjs.serviceId),
    templateId: str(e.VITE_EMAILJS_TEMPLATE_ID, siteConfig.emailjs.templateId),
    /** Free plan: 200 emails / month. Used for the quota meter. */
    monthlyQuota: Number(str(e.VITE_EMAILJS_MONTHLY_QUOTA, '200')) || 200,
    batchSize: Number(str(e.VITE_EMAIL_BATCH_SIZE, '10')) || 10,
    batchDelayMs: Number(str(e.VITE_EMAIL_BATCH_DELAY_MS, '1500')) || 1500,
  },

  flags: {
    intro: bool(e.VITE_FLAG_INTRO, true),
    assistant: bool(e.VITE_FLAG_ASSISTANT, true),
    ambient: bool(e.VITE_FLAG_AMBIENT, true),
    emailLinkSignIn: bool(e.VITE_FLAG_EMAIL_LINK, true),
    googleSignIn: bool(e.VITE_FLAG_GOOGLE, true),
    onlinePayments: bool(e.VITE_FLAG_ONLINE_PAYMENTS, false),
    whatsappCloudApi: bool(e.VITE_FLAG_WHATSAPP_CLOUD_API, false),
  },

  /** Hours a PENDING_PAYMENT seat hold lasts. */
  seatHoldHours: 24,
} as const;

export type Env = typeof env;
