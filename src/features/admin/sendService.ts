import { backend } from '@/data';
import type { NotificationKind, Registration } from '@/data/types';
import { maskEmail, maskPhone } from '@/lib/format';
import { getEmailProvider, type EmailMessage } from '@/providers/email';
import { registrationConfirmedEmail, reminderEmail, whatsappTexts } from '@/providers/emailTemplates';
import { getWhatsAppProvider } from '@/providers/whatsapp';

export interface WaQueueItem {
  id: string;
  name: string;
  to: string;
  text: string;
  refId: string;
  kind: NotificationKind;
}

/** Send one email through the configured provider and write a (masked) send-log entry. */
export async function sendLoggedEmail(message: EmailMessage, kind: NotificationKind, refId: string, adminUid: string) {
  const res = await getEmailProvider().send(message);
  await (await backend()).logNotification({
    kind,
    channel: 'email',
    recipient: maskEmail(message.to),
    refId,
    subject: message.subject,
    status: res.ok ? 'sent' : 'failed',
    error: res.ok ? null : res.error,
    by: adminUid,
  });
  return res;
}

export async function logWhatsApp(item: WaQueueItem, adminUid: string) {
  await (await backend()).logNotification({
    kind: item.kind,
    channel: 'whatsapp',
    recipient: maskPhone(item.to),
    refId: item.refId,
    subject: item.text.split('\n')[0].slice(0, 80),
    status: 'opened',
    error: null,
    by: adminUid,
  });
}

export function waLink(item: Pick<WaQueueItem, 'to' | 'text'>): string {
  return getWhatsAppProvider().buildLink({ to: item.to, text: item.text });
}

export async function sendConfirmation(reg: Registration, adminUid: string) {
  const res = await sendLoggedEmail(registrationConfirmedEmail(reg), 'confirmation', reg.id, adminUid);
  if (res.ok) await (await backend()).markRegistrationNotified(reg.id, 'confirmationSentAt');
  const wa: WaQueueItem = {
    id: `${reg.id}-confirm`,
    name: reg.participant.name,
    to: reg.participant.phone,
    text: whatsappTexts.confirmation(reg),
    refId: reg.id,
    kind: 'confirmation',
  };
  return { email: res, wa };
}

export function reminderMessages(regs: Registration[], when: '24h' | '1h') {
  return {
    emails: regs.map((r) => ({ reg: r, message: reminderEmail(r, when) })),
    wa: regs.map<WaQueueItem>((r) => ({
      id: `${r.id}-rem-${when}`,
      name: r.participant.name,
      to: r.participant.phone,
      text: whatsappTexts.reminder(r, when),
      refId: r.id,
      kind: when === '24h' ? 'reminder-24h' : 'reminder-1h',
    })),
  };
}
