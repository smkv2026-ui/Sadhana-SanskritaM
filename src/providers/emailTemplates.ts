import { BRAND } from '@/brand/logoGeometry';
import { env } from '@/config/env';
import type { Course, CustomRequest, Registration, Subscriber } from '@/data/types';
import { formatDateTime } from '@/lib/format';
import { absUrl, routes } from '@/lib/links';
import { formatInr } from '@/lib/pricing';
import type { EmailMessage } from './email';

/** Escape user-controlled text before it goes into HTML email bodies. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

interface Layout {
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footerLinks?: { label: string; url: string }[];
}

function render({ heading, paragraphs, cta, footerLinks = [] }: Layout): { html: string; text: string } {
  const html = `<!doctype html><html><body style="margin:0;background:#FFFBF2;font-family:Georgia,serif;color:#0B1026">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #EFE3CC;border-radius:16px">
<tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#B7832A">${escapeHtml(BRAND.name)}</td></tr>
<tr><td style="padding:0 32px"><h1 style="font-size:24px;line-height:1.3;margin:8px 0 16px">${escapeHtml(heading)}</h1>
${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${p}</p>`).join('')}
${cta ? `<p style="margin:24px 0"><a href="${cta.url}" style="background:#1B2350;color:#FFFBF2;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">${escapeHtml(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #F3EAD8;font-size:12px;color:#5b6078;font-family:Arial,sans-serif">
${escapeHtml(BRAND.tagline)} · ${escapeHtml(env.contact.email)}<br/>
${footerLinks.map((l) => `<a href="${l.url}" style="color:#5b6078">${escapeHtml(l.label)}</a>`).join(' · ')}
</td></tr></table></td></tr></table></body></html>`;
  const strip = (s: string) => s.replace(/<[^>]+>/g, '');
  const text = [
    heading,
    '',
    ...paragraphs.map(strip),
    cta ? `\n${cta.label}: ${cta.url}` : '',
    '',
    '—',
    `${BRAND.name} · ${env.contact.email}`,
    ...footerLinks.map((l) => `${l.label}: ${l.url}`),
  ].join('\n');
  return { html, text };
}

function subscriberFooter(s: Pick<Subscriber, 'token'>) {
  return [
    { label: 'Manage preferences', url: absUrl(routes.preferences(s.token)) },
    { label: 'Unsubscribe', url: absUrl(routes.unsubscribe(s.token)) },
  ];
}

export function subscribeConfirmEmail(s: Pick<Subscriber, 'token' | 'name' | 'email'>): EmailMessage {
  const body = render({
    heading: `Please confirm your subscription, ${s.name.split(' ')[0]}`,
    paragraphs: [
      `You asked to hear from ${escapeHtml(BRAND.name)} about new courses and events. Tap the button below to confirm your email address.`,
      'If you did not request this, simply ignore this email — you will not be subscribed.',
    ],
    cta: { label: 'Confirm my subscription', url: absUrl(routes.subscribeConfirm(s.token)) },
    footerLinks: subscriberFooter(s),
  });
  return { to: s.email, toName: s.name, subject: `Confirm your ${BRAND.name} subscription`, ...body };
}

export function courseAnnouncementEmail(
  s: Pick<Subscriber, 'token' | 'name' | 'email'>,
  course: Course,
  customMessage?: string,
): EmailMessage {
  const body = render({
    heading: `New: ${course.title}`,
    paragraphs: [
      `Namaste ${escapeHtml(s.name.split(' ')[0])},`,
      escapeHtml(customMessage || course.summary),
      `<strong>${course.kind === 'event' ? 'Event' : 'Starts'}:</strong> ${escapeHtml(formatDateTime(course.startsAt, course.timezone))} · <strong>Fee:</strong> ${escapeHtml(formatInr(course.earlyBirdPriceInr ?? course.priceInr))}`,
    ],
    cta: { label: 'View details & register', url: absUrl(routes.course(course.slug)) },
    footerLinks: subscriberFooter(s),
  });
  return { to: s.email, toName: s.name, subject: `${course.kind === 'event' ? 'New event' : 'New course'}: ${course.title}`, ...body };
}

export function registrationConfirmedEmail(reg: Registration): EmailMessage {
  const body = render({
    heading: `You're in! ${reg.courseTitle}`,
    paragraphs: [
      `Namaste ${escapeHtml(reg.participant.name.split(' ')[0])}, your payment of <strong>${escapeHtml(formatInr(reg.amountInr))}</strong> (ref ${escapeHtml(reg.reference)}) has been verified.`,
      reg.courseType === 'recorded'
        ? 'Your recordings are now unlocked in My Learning.'
        : `Your live-class link is now available in My Learning. First session: ${escapeHtml(formatDateTime(reg.startsAt))}.`,
    ],
    cta: { label: 'Open My Learning', url: absUrl(routes.myLearning) },
    footerLinks: [{ label: 'Receipt', url: absUrl(routes.receipt(reg.id)) }],
  });
  return { to: reg.participant.email, toName: reg.participant.name, subject: `Confirmed: ${reg.courseTitle}`, ...body };
}

export function reminderEmail(reg: Registration, when: '24h' | '1h'): EmailMessage {
  const body = render({
    heading: when === '24h' ? `Tomorrow: ${reg.courseTitle}` : `Starting in 1 hour: ${reg.courseTitle}`,
    paragraphs: [
      `Namaste ${escapeHtml(reg.participant.name.split(' ')[0])}, a gentle reminder that your session begins ${escapeHtml(formatDateTime(reg.startsAt))}.`,
      'The joining link is in My Learning. Keep a notebook and a glass of water ready.',
    ],
    cta: { label: 'Join from My Learning', url: absUrl(routes.myLearning) },
  });
  return { to: reg.participant.email, toName: reg.participant.name, subject: `Reminder: ${reg.courseTitle}`, ...body };
}

export function customRequestReceivedEmail(req: CustomRequest): EmailMessage {
  const body = render({
    heading: 'We received your custom app request',
    paragraphs: [
      `Namaste ${escapeHtml(req.contact.name.split(' ')[0])}, thank you for sharing your idea. Your reference is <strong>${escapeHtml(req.reference)}</strong>.`,
      'We usually reply within 3 working days. You can follow every step of the progress online.',
    ],
    cta: { label: 'Track my request', url: absUrl(routes.customAppsTrack) },
  });
  return { to: req.contact.email, toName: req.contact.name, subject: `Request received · ${req.reference}`, ...body };
}

export function customRequestAdminAlertEmail(req: CustomRequest): EmailMessage {
  const body = render({
    heading: `New custom app request ${req.reference}`,
    paragraphs: [
      `<strong>${escapeHtml(req.projectType)}</strong> · budget ${escapeHtml(formatInr(req.budgetInr.min))}–${escapeHtml(formatInr(req.budgetInr.max))} · ${req.timelineWeeks} weeks`,
      escapeHtml(req.problem.slice(0, 400)),
      `Features: ${escapeHtml(req.features.slice(0, 8).join(', '))}`,
    ],
    cta: { label: 'Open admin', url: absUrl(`${routes.admin}/requests`) },
  });
  return { to: env.contact.adminAlertEmail, subject: `New request ${req.reference}: ${req.projectType}`, ...body };
}

/** WhatsApp message bodies (plain text, prefilled into wa.me links). */
export const whatsappTexts = {
  announcement: (name: string, course: Course) =>
    `Namaste ${name.split(' ')[0]} 🙏\n\nNew at ${BRAND.name}: *${course.title}*\n${course.summary}\n\nDetails & registration: ${absUrl(routes.course(course.slug))}\n\n(Reply STOP to opt out)`,
  confirmation: (reg: Registration) =>
    `Namaste ${reg.participant.name.split(' ')[0]} 🙏\n\nYour registration for *${reg.courseTitle}* is confirmed (ref ${reg.reference}).\nOpen My Learning for your ${reg.courseType === 'recorded' ? 'recordings' : 'class link'}: ${absUrl(routes.myLearning)}`,
  reminder: (reg: Registration, when: '24h' | '1h') =>
    `Namaste ${reg.participant.name.split(' ')[0]} 🙏\n\nReminder: *${reg.courseTitle}* starts ${when === '24h' ? 'tomorrow' : 'in 1 hour'} (${formatDateTime(reg.startsAt)}).\nJoin from: ${absUrl(routes.myLearning)}`,
};
