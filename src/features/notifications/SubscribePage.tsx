import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { MailCheck, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { LogoMark } from '@/brand/Logo';
import { env } from '@/config/env';
import { backend, BackendError } from '@/data';
import { useSettings } from '@/data/queries';
import { Celebration } from '@/features/experience/Celebration';
import { isE164 } from '@/lib/phone';
import { routes } from '@/lib/links';
import { cn } from '@/lib/utils';
import { getEmailProvider } from '@/providers/email';
import { subscribeConfirmEmail } from '@/providers/emailTemplates';
import { PageMeta } from '@/shared/components/PageMeta';
import { PhoneField } from '@/shared/components/PhoneField';
import { Button } from '@/shared/ui/button';
import { Checkbox, Field, Input, Label } from '@/shared/ui/primitives';
import { CONSENT_TEXT, INTERESTS } from './interests';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name').max(80),
    email: z.string().trim().email('Enter a valid email').max(254),
    whatsapp: z.string(),
    interests: z.array(z.string()).min(1, 'Pick at least one interest').max(12),
    emailConsent: z.boolean(),
    whatsappConsent: z.boolean(),
    website: z.string().max(0).optional(), // honeypot
  })
  .refine((v) => v.emailConsent || v.whatsappConsent, { message: 'Choose at least one channel and tick its consent box', path: ['emailConsent'] })
  .refine((v) => !v.whatsappConsent || isE164(v.whatsapp), { message: 'Enter a valid WhatsApp number', path: ['whatsapp'] });

type FormValues = z.infer<typeof schema>;

export default function SubscribePage() {
  const [done, setDone] = useState<{ email: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: settings } = useSettings();
  const channel = settings?.whatsappChannelUrl || env.contact.whatsappChannelUrl;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', whatsapp: '', interests: [], emailConsent: false, whatsappConsent: false, website: '' },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    if (v.website) return; // bot
    setBusy(true);
    try {
      const b = await backend();
      const { token } = await b.createSubscriber({
        name: v.name,
        email: v.email,
        whatsapp: v.whatsappConsent ? v.whatsapp : null,
        interests: v.interests,
        channels: { email: v.emailConsent, whatsapp: v.whatsappConsent },
        source: 'subscribe-page',
      });
      if (v.emailConsent) {
        const res = await getEmailProvider().send(subscribeConfirmEmail({ token, name: v.name, email: v.email }));
        if (!res.ok) toast.warning('Subscribed, but the confirmation email could not be sent. We’ll retry from our side.');
        if (env.backend === 'demo') {
          toast.info('Demo mode: open the confirmation link directly.', {
            action: { label: 'Confirm now', onClick: () => window.location.assign(`${import.meta.env.BASE_URL}${routes.subscribeConfirm(token).slice(1)}`) },
            duration: 15000,
          });
        }
      }
      setDone({ email: v.emailConsent });
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : 'Could not subscribe. Please retry.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <PageMeta title="Get notified" description="Hear first about new Sanskrit courses and events — by email or WhatsApp, on your terms." path={routes.subscribe} />
      <Celebration show={Boolean(done)} />
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-3xl border bg-card p-10 text-center shadow-lift">
            <MailCheck className="h-12 w-12 text-success" />
            <h1 className="mt-5 text-3xl font-semibold">{done.email ? 'Almost there — check your inbox' : 'You’re on the list!'}</h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              {done.email
                ? 'We sent you a confirmation link. Tap it to start receiving announcements (check spam if you don’t see it).'
                : 'We’ll message you on WhatsApp when something matching your interests opens.'}
            </p>
            {channel && (
              <Button asChild variant="outline" className="mt-6">
                <a href={channel} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Also join our WhatsApp channel
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" className="mt-2">
              <Link to={routes.courses}>Browse courses meanwhile</Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }}>
            <header className="text-center">
              <LogoMark size={64} compact decorative className="mx-auto" />
              <p className="eyebrow mt-4">Stay in the loop</p>
              <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Be first to know</h1>
              <p className="mt-4 text-lg text-muted-foreground">Only announcements that match your interests. Unsubscribe with one click.</p>
            </header>
            <form noValidate onSubmit={onSubmit} className="mt-10 space-y-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="s-name" label="Name" required error={errors.name?.message}>
                  <Input id="s-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
                </Field>
                <Field id="s-email" label="Email" required error={errors.email?.message}>
                  <Input id="s-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
                </Field>
              </div>

              <fieldset>
                <legend className="text-sm font-medium">
                  Interests <span className="text-destructive">*</span>
                </legend>
                <Controller
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INTERESTS.map((i) => {
                        const on = field.value.includes(i.id);
                        return (
                          <button
                            key={i.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => field.onChange(on ? field.value.filter((x) => x !== i.id) : [...field.value, i.id])}
                            className={cn(
                              'rounded-full border px-3.5 py-2 text-sm transition active:scale-95',
                              on ? 'border-accent bg-accent/15 font-semibold' : 'hover:border-accent',
                            )}
                          >
                            {i.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.interests && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {errors.interests.message}
                  </p>
                )}
              </fieldset>

              <fieldset className="space-y-4 rounded-2xl bg-muted/40 p-5">
                <legend className="sr-only">Channels and consent</legend>
                <p className="text-sm font-medium">How may we reach you? (tick each channel you consent to)</p>
                <Controller
                  control={form.control}
                  name="emailConsent"
                  render={({ field }) => (
                    <div className="flex items-start gap-3">
                      <Checkbox id="c-email" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                      <Label htmlFor="c-email" className="font-normal leading-snug">
                        {CONSENT_TEXT.email}
                      </Label>
                    </div>
                  )}
                />
                <Controller
                  control={form.control}
                  name="whatsappConsent"
                  render={({ field }) => (
                    <div className="flex items-start gap-3">
                      <Checkbox id="c-wa" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                      <Label htmlFor="c-wa" className="font-normal leading-snug">
                        {CONSENT_TEXT.whatsapp}
                      </Label>
                    </div>
                  )}
                />
                {form.watch('whatsappConsent') && (
                  <Field id="s-wa" label="WhatsApp number" error={errors.whatsapp?.message}>
                    <Controller
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => <PhoneField id="s-wa" value={field.value} onChange={field.onChange} invalid={Boolean(errors.whatsapp)} />}
                    />
                  </Field>
                )}
                {errors.emailConsent && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.emailConsent.message}
                  </p>
                )}
              </fieldset>

              <div aria-hidden className="absolute left-[-9999px]">
                <label htmlFor="website">Website</label>
                <input id="website" tabIndex={-1} autoComplete="off" {...form.register('website')} />
              </div>

              <p className="text-xs text-muted-foreground">
                We store your consent with a timestamp as required by India’s DPDP Act, 2023. See our{' '}
                <Link to={routes.privacy} className="underline">
                  privacy policy
                </Link>
                .
              </p>
              <Button type="submit" size="lg" variant="gold" className="w-full" loading={busy}>
                Subscribe
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
