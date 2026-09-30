import { env } from '@/config/env';

/**
 * WhatsAppProvider.
 *
 * Now: WaMeLinkProvider — builds a prefilled https://wa.me link; an admin taps "Send next"
 * and presses send in WhatsApp (free, no API, no Blaze).
 * Later: CloudApiProvider — WhatsApp Business Cloud API via a server (templates + opt-in).
 */
export interface WhatsAppMessage {
  /** E.164 number, e.g. +919876543210 */
  to: string;
  text: string;
}

export interface WhatsAppProvider {
  readonly id: 'wa-me' | 'cloud-api';
  readonly mode: 'manual-link' | 'api';
  buildLink(message: WhatsAppMessage): string;
  send?(message: WhatsAppMessage): Promise<{ ok: boolean; error?: string }>;
}

export function waMeLink({ to, text }: WhatsAppMessage): string {
  const digits = to.replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export class WaMeLinkProvider implements WhatsAppProvider {
  readonly id = 'wa-me' as const;
  readonly mode = 'manual-link' as const;
  buildLink(message: WhatsAppMessage): string {
    return waMeLink(message);
  }
}

export class CloudApiProvider implements WhatsAppProvider {
  readonly id = 'cloud-api' as const;
  readonly mode = 'api' as const;
  buildLink(message: WhatsAppMessage): string {
    return waMeLink(message);
  }
  async send(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: 'CloudApiProvider is a stub: requires a server holding the WhatsApp Business token.' };
  }
}

let instance: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  instance ??=
    env.providers.whatsapp === 'cloud-api' && env.flags.whatsappCloudApi ? new CloudApiProvider() : new WaMeLinkProvider();
  return instance;
}
