import type { SiteSettings } from '@/data/types';
import { setEmailProvider } from '@/providers/email';
import { resetPaymentProvider } from '@/providers/payment';
import { env } from './env';

/**
 * Values an admin can set in Admin → Categories & content → Site (stored in `site/settings`)
 * without a redeploy: UPI payee details and EmailJS public credentials. They override the
 * build-time defaults as soon as settings load. All of them are public by nature.
 */
type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] };
const live = env as unknown as Mutable<typeof env> & { providers: { email: string } };

let applied = '';

export function applyRuntimeSettings(s: SiteSettings | null | undefined, reset: () => void = resetProviders): void {
  if (!s) return;
  const key = JSON.stringify([s.upiVpa, s.upiPayeeName, s.emailjsPublicKey, s.emailjsServiceId, s.emailjsTemplateId]);
  if (key === applied) return;
  applied = key;
  const vpa = s.upiVpa?.trim();
  if (vpa) {
    live.upi.vpa = vpa;
    live.upi.isPlaceholder = false;
  }
  if (s.upiPayeeName?.trim()) live.upi.payeeName = s.upiPayeeName.trim();
  if (s.emailjsPublicKey?.trim() && s.emailjsServiceId?.trim() && s.emailjsTemplateId?.trim()) {
    live.emailjs.publicKey = s.emailjsPublicKey.trim();
    live.emailjs.serviceId = s.emailjsServiceId.trim();
    live.emailjs.templateId = s.emailjsTemplateId.trim();
    live.providers.email = 'emailjs';
  }
  reset();
}

function resetProviders(): void {
  setEmailProvider(null);
  resetPaymentProvider();
}
