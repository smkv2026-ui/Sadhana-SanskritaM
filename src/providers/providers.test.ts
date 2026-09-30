import { describe, expect, it } from 'vitest';
import type { Registration, Subscriber } from '@/data/types';
import { seedCourses } from '@/data/seed';
import { parseUpiLink } from '@/lib/upi';
import { ConsoleProvider, EmailJsProvider, ServerEmailProvider, sendInBatches, type EmailMessage, type EmailProvider } from './email';
import { courseAnnouncementEmail, escapeHtml, registrationConfirmedEmail, subscribeConfirmEmail, whatsappTexts } from './emailTemplates';
import { ManualUpiProvider, RazorpayProvider } from './payment';
import { CloudApiProvider, WaMeLinkProvider, waMeLink } from './whatsapp';

const sub: Pick<Subscriber, 'token' | 'name' | 'email'> = { token: 'a'.repeat(40), name: 'Priya Sharma', email: 'priya@example.com' };

describe('PaymentProvider', () => {
  it('ManualUpiProvider returns a UPI deep link with the exact amount and reference', async () => {
    const p = new ManualUpiProvider('sadhana@okaxis', 'Sadhana Sanskritam');
    const res = await p.createPayment({ amountInr: 1799, reference: 'SS-7K3QX9', courseTitle: 'x' });
    expect(res.kind).toBe('upi-manual');
    if (res.kind !== 'upi-manual') return;
    expect(parseUpiLink(res.upiLink)).toMatchObject({ pa: 'sadhana@okaxis', am: '1799.00', tn: 'SS-7K3QX9' });
    expect(p.requiresManualVerification).toBe(true);
  });
  it('RazorpayProvider is a stub that fails loudly', async () => {
    await expect(new RazorpayProvider().createPayment()).rejects.toThrow(/not enabled/);
  });
});

describe('EmailProvider', () => {
  it('ConsoleProvider keeps an outbox without logging full addresses', async () => {
    const p = new ConsoleProvider();
    const logs: string[] = [];
    const orig = console.info;
    console.info = (m: string) => logs.push(m);
    await p.send(subscribeConfirmEmail(sub));
    console.info = orig;
    expect(p.outbox).toHaveLength(1);
    expect(logs[0]).not.toContain('priya@example.com');
    expect(logs[0]).toContain('pr***@example.com');
  });
  it('EmailJsProvider reports unconfigured state instead of throwing', async () => {
    const p = new EmailJsProvider({ publicKey: '', serviceId: '', templateId: '' });
    expect(p.configured).toBe(false);
    expect(await p.send(subscribeConfirmEmail(sub))).toEqual({ ok: false, error: 'EmailJS is not configured' });
    expect((await new ServerEmailProvider().send()).ok).toBe(false);
  });
  it('sendInBatches throttles, reports progress and can be aborted', async () => {
    const sent: string[] = [];
    const flaky: EmailProvider = {
      id: 'console',
      label: 'test',
      configured: true,
      send: async (m) => (sent.push(m.to), m.to.startsWith('bad') ? { ok: false, error: 'nope' } : { ok: true }),
    };
    const msgs: EmailMessage[] = ['a@x.co', 'bad@x.co', 'c@x.co'].map((to) => ({ to, subject: 's', text: 't', html: 'h' }));
    const progress: number[] = [];
    const res = await sendInBatches(flaky, msgs, { batchSize: 2, delayMs: 1, onProgress: (p) => progress.push(p.sent + p.failed) });
    expect(res).toEqual({ sent: 2, failed: 1, total: 3 });
    expect(progress).toEqual([1, 2, 3]);
    const ctrl = new AbortController();
    ctrl.abort();
    expect((await sendInBatches(flaky, msgs, { signal: ctrl.signal })).sent).toBe(0);
  });
});

describe('email templates', () => {
  it('every subscriber email carries unsubscribe + preferences links', () => {
    for (const m of [subscribeConfirmEmail(sub), courseAnnouncementEmail(sub, seedCourses()[0])]) {
      expect(m.html).toContain(`/subscribe/unsubscribe?t=${sub.token}`);
      expect(m.html).toContain(`/subscribe/preferences?t=${sub.token}`);
      expect(m.text).toContain('Unsubscribe:');
    }
    expect(subscribeConfirmEmail(sub).html).toContain(`/subscribe/confirm?t=${sub.token}`);
  });
  it('escapes user-supplied text', () => {
    expect(escapeHtml('<img onerror=x>"')).toBe('&lt;img onerror=x&gt;&quot;');
    const reg = { participant: { name: '<b>Eve</b>', email: 'e@x.co', phone: '+911234567890', city: '' }, amountInr: 10, reference: 'SS-AAAAAA', courseTitle: 'T', courseType: 'recorded', id: 'x', startsAt: null } as unknown as Registration;
    expect(registrationConfirmedEmail(reg).html).not.toContain('<b>Eve</b>');
  });
});

describe('WhatsAppProvider', () => {
  it('builds wa.me links with digits only and encoded text', () => {
    expect(waMeLink({ to: '+91 98765-43210', text: 'Namaste 🙏 & welcome' })).toBe(
      `https://wa.me/919876543210?text=${encodeURIComponent('Namaste 🙏 & welcome')}`,
    );
    expect(new WaMeLinkProvider().mode).toBe('manual-link');
    expect(new CloudApiProvider().mode).toBe('api');
  });
  it('message bodies include the course and a link', () => {
    const text = whatsappTexts.announcement('Priya Sharma', seedCourses()[0]);
    expect(text).toContain('Namaste Priya');
    expect(text).toContain('/courses/speak-sanskrit-in-30-days');
    expect(text).toContain('STOP');
  });
});
