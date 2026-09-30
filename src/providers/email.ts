import { env } from '@/config/env';
import { maskEmail } from '@/lib/format';
import { sleep } from '@/lib/utils';

/**
 * EmailProvider — transactional + announcement email.
 *
 * Now: EmailJsProvider (browser → EmailJS free plan, 200 emails/month, no server).
 * Dev / not configured: ConsoleProvider (logs a masked line and keeps an in-memory outbox).
 * Later: ServerEmailProvider (POST to your own endpoint, e.g. SES/Resend behind a function).
 */
export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

export interface EmailProvider {
  readonly id: 'emailjs' | 'console' | 'server';
  readonly label: string;
  readonly configured: boolean;
  send(message: EmailMessage): Promise<SendResult>;
}

export class EmailJsProvider implements EmailProvider {
  readonly id = 'emailjs' as const;
  readonly label = 'EmailJS';

  constructor(
    private readonly cfg: { publicKey: string; serviceId: string; templateId: string },
  ) {}

  get configured(): boolean {
    return Boolean(this.cfg.publicKey && this.cfg.serviceId && this.cfg.templateId);
  }

  async send(m: EmailMessage): Promise<SendResult> {
    if (!this.configured) return { ok: false, error: 'EmailJS is not configured' };
    try {
      const emailjs = (await import('@emailjs/browser')).default;
      await emailjs.send(
        this.cfg.serviceId,
        this.cfg.templateId,
        {
          to_email: m.to,
          to_name: m.toName ?? '',
          subject: m.subject,
          message_html: m.html,
          message_text: m.text,
          reply_to: m.replyTo ?? env.contact.email,
        },
        { publicKey: this.cfg.publicKey },
      );
      return { ok: true };
    } catch (err) {
      const text = err && typeof err === 'object' && 'text' in err ? String((err as { text: unknown }).text) : String(err);
      return { ok: false, error: text.slice(0, 200) };
    }
  }
}

export interface OutboxItem extends EmailMessage {
  at: string;
}

export class ConsoleProvider implements EmailProvider {
  readonly id = 'console' as const;
  readonly label = 'Console (mock — nothing is actually sent)';
  readonly configured = true;
  readonly outbox: OutboxItem[] = [];

  async send(m: EmailMessage): Promise<SendResult> {
    this.outbox.unshift({ ...m, at: new Date().toISOString() });
    if (this.outbox.length > 50) this.outbox.length = 50;
    // Never log full addresses (no PII in logs).
    console.info(`[email:mock] → ${maskEmail(m.to)} · ${m.subject}`);
    return { ok: true };
  }
}

/** Stub for a future server-side sender. */
export class ServerEmailProvider implements EmailProvider {
  readonly id = 'server' as const;
  readonly label = 'Server endpoint';
  readonly configured = false;

  async send(): Promise<SendResult> {
    return { ok: false, error: 'ServerEmailProvider is a stub: implement POST to your endpoint and set VITE_EMAIL_PROVIDER=server.' };
  }
}

export interface BatchProgress {
  sent: number;
  failed: number;
  total: number;
}

/**
 * Throttled batch sending (EmailJS rate-limits bursts). Sends `batchSize` at a time with a pause
 * between batches; reports progress; stoppable through an AbortSignal.
 */
export async function sendInBatches(
  provider: EmailProvider,
  messages: EmailMessage[],
  opts: {
    batchSize?: number;
    delayMs?: number;
    signal?: AbortSignal;
    onProgress?: (p: BatchProgress) => void;
    onResult?: (m: EmailMessage, r: SendResult) => void | Promise<void>;
  } = {},
): Promise<BatchProgress> {
  const batchSize = Math.max(1, opts.batchSize ?? env.emailjs.batchSize);
  const delayMs = opts.delayMs ?? env.emailjs.batchDelayMs;
  const progress: BatchProgress = { sent: 0, failed: 0, total: messages.length };
  for (let i = 0; i < messages.length; i += batchSize) {
    if (opts.signal?.aborted) break;
    const chunk = messages.slice(i, i + batchSize);
    // Sequential inside a batch keeps us well below provider rate limits.
    for (const m of chunk) {
      if (opts.signal?.aborted) break;
      const r = await provider.send(m);
      if (r.ok) progress.sent++;
      else progress.failed++;
      await opts.onResult?.(m, r);
      opts.onProgress?.({ ...progress });
    }
    if (i + batchSize < messages.length) await sleep(delayMs);
  }
  return progress;
}

let instance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (instance) return instance;
  const kind = env.providers.email;
  if (kind === 'emailjs') {
    const p = new EmailJsProvider(env.emailjs);
    instance = p.configured ? p : new ConsoleProvider();
  } else if (kind === 'server') instance = new ServerEmailProvider();
  else instance = new ConsoleProvider();
  return instance;
}

/** For tests. */
export function setEmailProvider(p: EmailProvider | null): void {
  instance = p;
}
