/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_UPI_VPA?: string;
  readonly VITE_UPI_PAYEE_NAME?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_WHATSAPP?: string;
  readonly VITE_WHATSAPP_CHANNEL_URL?: string;
  readonly VITE_ADMIN_ALERT_EMAIL?: string;
  readonly VITE_PAYMENT_PROVIDER?: string;
  readonly VITE_EMAIL_PROVIDER?: string;
  readonly VITE_WHATSAPP_PROVIDER?: string;
  readonly VITE_ACCESS_PROVIDER?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
  readonly VITE_EMAILJS_MONTHLY_QUOTA?: string;
  readonly VITE_EMAIL_BATCH_SIZE?: string;
  readonly VITE_EMAIL_BATCH_DELAY_MS?: string;
  readonly VITE_FLAG_INTRO?: string;
  readonly VITE_FLAG_ASSISTANT?: string;
  readonly VITE_FLAG_AMBIENT?: string;
  readonly VITE_FLAG_EMAIL_LINK?: string;
  readonly VITE_FLAG_GOOGLE?: string;
  readonly VITE_FLAG_ONLINE_PAYMENTS?: string;
  readonly VITE_FLAG_WHATSAPP_CLOUD_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
