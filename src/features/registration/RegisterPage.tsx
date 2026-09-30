import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgePercent, Check, PartyPopper, RefreshCw, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { backend, BackendError } from '@/data';
import { qk, useCourse, useLiveRegistration, useLiveSeats } from '@/data/queries';
import { canRestart, effectiveStatus, seatsLeft } from '@/data/registrationLogic';
import type { Coupon, Participant, Registration } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/SignIn';
import { Celebration } from '@/features/experience/Celebration';
import { registrationId } from '@/lib/ids';
import { routes } from '@/lib/links';
import { isE164 } from '@/lib/phone';
import { computePrice, couponError, formatInr } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { SeatMeter } from '@/shared/components/Bits';
import { PageMeta } from '@/shared/components/PageMeta';
import { PhoneField } from '@/shared/components/PhoneField';
import { EmptyState, PageLoader } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/primitives';
import { PaymentStep } from './PaymentStep';
import { StatusTimeline } from './StatusTimeline';

const participantSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(80),
  email: z.string().trim().email('Enter a valid email').max(254),
  phone: z.string().refine(isE164, 'Enter a valid mobile number (used for WhatsApp updates)'),
  city: z.string().trim().max(60).optional().default(''),
});

type ParticipantForm = z.infer<typeof participantSchema>;

const STEPS = ['Your details', 'Review', 'Pay', 'Status'] as const;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Registration progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
          <motion.span
            animate={{ scale: i === step ? 1.1 : 1 }}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
              i < step && 'border-success bg-success text-success-foreground',
              i === step && 'border-accent bg-accent text-accent-foreground',
              i > step && 'text-muted-foreground',
            )}
          >
            {i < step ? <Check className="h-4 w-4" /> : i + 1}
          </motion.span>
          <span className={cn('hidden text-sm font-medium sm:inline', i === step ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
          {i < STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', i < step ? 'bg-success' : 'bg-border')} />}
        </li>
      ))}
    </ol>
  );
}

function RegisterFlow() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: course, isLoading } = useCourse(slug);
  const regId = user && course ? registrationId(user.uid, course.id) : undefined;
  const { data: liveReg, loading: regLoading } = useLiveRegistration(regId);
  const seats = useLiveSeats(course?.id);
  const [draftStep, setDraftStep] = useState(0);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);

  const form = useForm<ParticipantForm>({
    resolver: zodResolver(participantSchema),
    defaultValues: { name: user?.displayName ?? '', email: user?.email ?? '', phone: '', city: '' },
  });

  const [restartRequested, setRestartRequested] = useState(false);
  const status = liveReg ? effectiveStatus(liveReg) : null;
  // A released (EXPIRED) or REJECTED registration can be started again with a fresh hold.
  const restarting = restartRequested && liveReg !== null && canRestart(liveReg.status);
  const holdLapsed = liveReg?.status === 'PENDING_PAYMENT' && status === 'EXPIRED';
  const step = liveReg && !restarting ? (liveReg.status === 'PENDING_PAYMENT' || holdLapsed ? 2 : 3) : draftStep;

  // Celebrate the moment an admin approves (live listener).
  useEffect(() => {
    if (!liveReg) return;
    if (prevStatus && prevStatus !== 'APPROVED' && liveReg.status === 'APPROVED') {
      setCelebrate(true);
      toast.success('Payment verified — your access is unlocked! 🪷');
      void queryClient.invalidateQueries({ queryKey: qk.myRegs(liveReg.uid) });
    }
    setPrevStatus(liveReg.status);
  }, [liveReg, prevStatus, queryClient]);

  const price = useMemo(() => (course ? computePrice(course, coupon) : null), [course, coupon]);

  if (isLoading || regLoading) return <PageLoader />;
  if (!course || !price)
    return (
      <div className="container py-16">
        <EmptyState title="Course not found" action={<Button asChild><Link to={routes.courses}>Browse courses</Link></Button>} />
      </div>
    );

  const left = seatsLeft(course.seatLimit, seats);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    const c = await (await backend()).getCoupon(code);
    setBusy(false);
    const err = couponError(c, course.id);
    if (err) {
      setCoupon(null);
      setCouponMsg(err);
    } else {
      setCoupon(c);
      setCouponMsg(null);
      toast.success(`Code ${code} applied`);
    }
  };

  const reserve = async () => {
    if (!user || !participant) return;
    setBusy(true);
    try {
      await (await backend()).createRegistration({ uid: user.uid, course, participant, couponCode: coupon?.code ?? null });
      setRestartRequested(false);
      void queryClient.invalidateQueries({ queryKey: qk.myRegs(user.uid) });
      void queryClient.invalidateQueries({ queryKey: qk.stats });
      toast.success(price.total === 0 ? 'Seat requested!' : 'Seat reserved — complete your payment within 24 hours.');
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : 'Could not reserve your seat.');
      if (e instanceof BackendError && e.code === 'hold-expired') setDraftStep(2);
    } finally {
      setBusy(false);
    }
  };

  const renew = async () => {
    if (!liveReg) return;
    setBusy(true);
    try {
      await (await backend()).renewHold(liveReg.id);
      toast.success('Your seat hold has been renewed for 24 hours.');
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : 'Could not renew the hold.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10 sm:py-14">
      <PageMeta title={`Register · ${course.title}`} path={routes.register(course.slug)} noindex />
      <Celebration show={celebrate} onDone={() => setCelebrate(false)} />
      <Link to={routes.course(course.slug)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {course.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{step === 3 ? 'Your registration' : 'Reserve your seat'}</h1>
      <div className="mt-8">
        <Stepper step={step} />
      </div>

      <div className="mt-10 rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            {step === 0 && (
              <form
                noValidate
                onSubmit={form.handleSubmit((v) => {
                  setParticipant({ name: v.name, email: v.email, phone: v.phone, city: v.city ?? '' });
                  setDraftStep(1);
                })}
                className="grid gap-5 sm:grid-cols-2"
              >
                <Field id="p-name" label="Full name" required error={form.formState.errors.name?.message} className="sm:col-span-2">
                  <Input id="p-name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
                </Field>
                <Field id="p-email" label="Email" required error={form.formState.errors.email?.message} hint="Your receipt and confirmation go here.">
                  <Input id="p-email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
                </Field>
                <Field id="p-phone" label="WhatsApp number" required error={form.formState.errors.phone?.message} hint="For class reminders.">
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneField id="p-phone" value={field.value} onChange={field.onChange} invalid={Boolean(form.formState.errors.phone)} />
                    )}
                  />
                </Field>
                <Field id="p-city" label="City (optional)" error={form.formState.errors.city?.message}>
                  <Input id="p-city" autoComplete="address-level2" {...form.register('city')} />
                </Field>
                <div className="flex items-end justify-end sm:col-span-2">
                  <Button type="submit" size="lg">
                    Continue <ArrowRight />
                  </Button>
                </div>
              </form>
            )}

            {step === 1 && participant && (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted/50 p-5 text-sm">
                    <p className="font-semibold">{participant.name}</p>
                    <p className="text-muted-foreground">{participant.email}</p>
                    <p className="text-muted-foreground">{participant.phone}</p>
                    <button type="button" className="mt-2 text-xs font-semibold text-accent underline-offset-4 hover:underline" onClick={() => setDraftStep(0)}>
                      Edit details
                    </button>
                  </div>
                  <div>
                    <SeatMeter limit={course.seatLimit} taken={seats?.seatsTaken ?? 0} />
                  </div>
                </div>
                <dl className="space-y-2 rounded-2xl border p-5">
                  <div className="flex justify-between">
                    <dt>{course.title}</dt>
                    <dd>{formatInr(course.priceInr)}</dd>
                  </div>
                  {price.earlyBird && (
                    <div className="flex justify-between text-success">
                      <dt>Early-bird price</dt>
                      <dd>−{formatInr(course.priceInr - price.base)}</dd>
                    </div>
                  )}
                  <AnimatePresence>
                    {price.discount > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-success">
                        <dt className="flex items-center gap-1.5">
                          <BadgePercent className="h-4 w-4" /> {price.coupon?.code}
                        </dt>
                        <dd>−{formatInr(price.discount)}</dd>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex justify-between border-t pt-3 font-display text-2xl font-semibold">
                    <dt>Total</dt>
                    <motion.dd key={price.total} initial={{ scale: 1.15, color: 'hsl(var(--accent))' }} animate={{ scale: 1, color: 'hsl(var(--foreground))' }}>
                      {formatInr(price.total)}
                    </motion.dd>
                  </div>
                </dl>
                {course.priceInr > 0 && (
                  <Field id="coupon" label="Coupon code" error={couponMsg ?? undefined}>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="coupon"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="e.g. NAMASTE10"
                          className="pl-10 uppercase"
                          aria-invalid={Boolean(couponMsg)}
                        />
                      </div>
                      <Button variant="outline" onClick={() => void applyCoupon()} loading={busy && !participant} disabled={!couponInput.trim()}>
                        Apply
                      </Button>
                    </div>
                  </Field>
                )}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="ghost" onClick={() => setDraftStep(0)}>
                    <ArrowLeft /> Back
                  </Button>
                  <Button size="lg" variant="gold" onClick={() => void reserve()} loading={busy} disabled={left === 0}>
                    {left === 0 ? 'Sold out' : price.total === 0 ? 'Reserve free seat' : `Reserve & pay ${formatInr(price.total)}`}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  By registering you agree to our <Link to={routes.terms} className="underline">terms</Link> and{' '}
                  <Link to={routes.refund} className="underline">refund policy</Link>.
                </p>
              </div>
            )}

            {step === 2 && liveReg && holdLapsed && (
              <div className="flex flex-col items-center py-6 text-center">
                <RefreshCw className="h-10 w-10 text-amber-500" />
                <h2 className="mt-4 font-display text-2xl">Your seat hold expired</h2>
                <p className="mt-2 max-w-md text-muted-foreground">Holds last 24 hours. Renew it to get a fresh 24 hours to pay.</p>
                <Button className="mt-6" size="lg" onClick={() => void renew()} loading={busy}>
                  Renew my hold
                </Button>
              </div>
            )}

            {step === 2 && liveReg && status === 'PENDING_PAYMENT' && <PaymentStep reg={liveReg} onSubmitted={() => undefined} />}

            {step === 3 && liveReg && status && (
              <StatusView
                reg={liveReg}
                status={status}
                onRestart={() => {
                  setDraftStep(0);
                  setRestartRequested(true);
                }}
                navigate={navigate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusView({
  reg,
  status,
  onRestart,
  navigate,
}: {
  reg: Registration;
  status: NonNullable<ReturnType<typeof effectiveStatus>>;
  onRestart: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_260px]">
      <StatusTimeline reg={reg} status={status} />
      <div className="space-y-3 rounded-2xl bg-muted/50 p-5 text-sm">
        <p>
          <span className="text-muted-foreground">Reference</span>
          <br />
          <strong className="font-display text-lg">{reg.reference}</strong>
        </p>
        <p>
          <span className="text-muted-foreground">Amount</span>
          <br />
          <strong className="font-display text-lg">{formatInr(reg.amountInr)}</strong>
        </p>
        {status === 'APPROVED' && (
          <>
            <Button className="w-full" onClick={() => navigate(routes.myLearning)}>
              <PartyPopper /> Open My Learning
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate(routes.receipt(reg.id))}>
              View receipt
            </Button>
          </>
        )}
        {status === 'PENDING_VERIFICATION' && <p className="text-muted-foreground">You can close this page — it updates live, and we’ll email you when it’s approved.</p>}
        {(status === 'REJECTED' || status === 'EXPIRED') && (
          <>
            <p className="text-muted-foreground">
              {status === 'REJECTED' ? 'If you believe this is a mistake, ' : 'Your seat was released. '}
              <Link to={routes.contact} className="underline">
                contact us
              </Link>{' '}
              with your reference, or start again.
            </p>
            <Button variant="outline" className="w-full" onClick={onRestart}>
              <RefreshCw /> Register again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <RequireAuth reason="Sign in to reserve your seat — it takes a few seconds.">
      <RegisterFlow />
    </RequireAuth>
  );
}
