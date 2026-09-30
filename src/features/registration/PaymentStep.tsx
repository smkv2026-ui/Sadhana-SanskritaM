import { motion } from 'framer-motion';
import { AlarmClock, ExternalLink, Info, QrCode, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { env } from '@/config/env';
import { backend, BackendError } from '@/data';
import type { Registration } from '@/data/types';
import { countdown } from '@/lib/format';
import { formatInr } from '@/lib/pricing';
import { normalizeUtr, utrError } from '@/lib/utr';
import { getPaymentProvider, type PaymentInstructions } from '@/providers/payment';
import { CopyButton } from '@/shared/components/Bits';
import { useIsMobile, useNow } from '@/shared/hooks';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/primitives';

function HoldCountdown({ until }: { until: string }) {
  const now = useNow(1000);
  const c = countdown(until, now);
  const urgent = c.days === 0 && c.hours < 2;
  return (
    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${urgent ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-muted'}`}>
      <AlarmClock className="h-4 w-4" aria-hidden />
      Seat held for{' '}
      <span className="tabular-nums" aria-live="off">
        {String(c.hours + c.days * 24).padStart(2, '0')}:{String(c.minutes).padStart(2, '0')}:{String(c.seconds).padStart(2, '0')}
      </span>
    </p>
  );
}

export function PaymentStep({ reg, onSubmitted }: { reg: Registration; onSubmitted: (r: Registration) => void }) {
  const [instr, setInstr] = useState<PaymentInstructions | null>(null);
  const [qr, setQr] = useState<string>('');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mobile = useIsMobile();

  useEffect(() => {
    let alive = true;
    getPaymentProvider()
      .createPayment({ amountInr: reg.amountInr, reference: reg.reference, courseTitle: reg.courseTitle })
      .then(async (p) => {
        if (!alive) return;
        setInstr(p);
        if (p.kind === 'upi-manual') {
          const svg = await QRCode.toString(p.upiLink, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B1026', light: '#FFFFFF' } });
          if (alive) setQr(svg);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Payment is unavailable right now.'));
    return () => {
      alive = false;
    };
  }, [reg.amountInr, reg.reference, reg.courseTitle]);

  const submit = async () => {
    const err = utrError(utr);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      const updated = await (await backend()).submitUtr(reg.id, normalizeUtr(utr));
      toast.success('UTR submitted — we’re verifying your payment.');
      onSubmitted(updated);
    } catch (e) {
      setError(e instanceof BackendError ? e.message : 'Could not submit. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  if (instr?.kind === 'redirect') {
    return (
      <Button asChild size="lg" variant="gold">
        <a href={instr.url}>Continue to secure payment</a>
      </Button>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HoldCountdown until={reg.holdExpiresAt} />
        {env.upi.isPlaceholder && (
          <p className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">Demo UPI ID — do not pay real money</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16 }}
          className="mx-auto w-full max-w-[260px] self-start rounded-3xl border bg-white p-4 shadow-lift"
        >
          {qr ? (
            <div className="aspect-square w-full [&_svg]:h-full [&_svg]:w-full" role="img" aria-label={`UPI QR code to pay ${formatInr(reg.amountInr)}`} dangerouslySetInnerHTML={{ __html: qr }} />
          ) : (
            <div className="skeleton aspect-square w-full" />
          )}
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-midnight/70">
            <QrCode className="h-3.5 w-3.5" /> Scan with any UPI app
          </p>
        </motion.div>

        <div className="space-y-3">
          <dl className="divide-y rounded-2xl border bg-card">
            {[
              { k: 'Amount', v: formatInr(reg.amountInr), copy: reg.amountInr.toFixed(0) },
              { k: 'Reference (add in note)', v: reg.reference, copy: reg.reference },
              { k: 'Pay to UPI ID', v: instr?.kind === 'upi-manual' ? instr.vpa : '…', copy: instr?.kind === 'upi-manual' ? instr.vpa : '' },
              { k: 'Payee', v: instr?.kind === 'upi-manual' ? instr.payeeName : '…' },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{row.k}</dt>
                  <dd className="truncate font-display text-lg font-semibold">{row.v}</dd>
                </div>
                {row.copy ? <CopyButton value={row.copy} label={row.k.split(' ')[0]} /> : null}
              </div>
            ))}
          </dl>
          {instr?.kind === 'upi-manual' && (
            <Button asChild variant="gold" size="lg" className="w-full">
              <a href={instr.upiLink}>
                <Smartphone /> Open my UPI app
              </a>
            </Button>
          )}
          {!mobile && <p className="text-center text-xs text-muted-foreground">“Open my UPI app” works on phones; on a computer, scan the QR.</p>}
        </div>
      </div>

      <details className="rounded-2xl border bg-muted/40 p-4 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium">
          <Info className="h-4 w-4 text-accent" /> How to pay in 3 steps
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Scan the QR (or tap “Open my UPI app”). Check the amount is exactly {formatInr(reg.amountInr)}.</li>
          <li>
            Keep <strong className="text-foreground">{reg.reference}</strong> in the payment note so we can match it.
          </li>
          <li>After paying, open the payment in your app’s history and copy the 12-digit UTR / UPI Ref No. Paste it below.</li>
        </ol>
      </details>

      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <Field id="utr" label="12-digit UTR / UPI reference" error={error ?? undefined} hint="Find it in your UPI app under the payment details.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="utr"
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              placeholder="e.g. 412345678901"
              value={utr}
              onChange={(e) => {
                setUtr(e.target.value.replace(/[^\d\s-]/g, ''));
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'utr-error' : 'utr-hint'}
              className="font-mono text-lg tracking-widest"
            />
            <Button size="lg" onClick={() => void submit()} loading={busy} disabled={normalizeUtr(utr).length < 12}>
              Submit UTR
            </Button>
          </div>
        </Field>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" /> No screenshots needed. Each UTR can be used for one registration only.
        </p>
      </div>
    </div>
  );
}
