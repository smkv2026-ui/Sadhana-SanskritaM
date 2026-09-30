import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical, Lightbulb, Link2, Plus, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { backend, BackendError } from '@/data';
import type { CustomRequest } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { Celebration } from '@/features/experience/Celebration';
import { usePreferences } from '@/features/experience/preferences';
import { routes } from '@/lib/links';
import { isE164 } from '@/lib/phone';
import { formatInr } from '@/lib/pricing';
import { readJson, removeStorage, STORAGE_KEYS, writeJson } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { getEmailProvider } from '@/providers/email';
import { customRequestAdminAlertEmail, customRequestReceivedEmail } from '@/providers/emailTemplates';
import { PageMeta } from '@/shared/components/PageMeta';
import { PhoneField } from '@/shared/components/PhoneField';
import { Button } from '@/shared/ui/button';
import { Field, Input, Slider, Textarea } from '@/shared/ui/primitives';
import { FEATURE_CATALOG, PROJECT_TYPES, estimateWeeks, suggestFeatures, type FeatureId } from './ideaHelper';

interface Draft {
  projectType: string;
  problem: string;
  targetUsers: string;
  features: FeatureId[];
  budget: [number, number];
  timelineWeeks: number;
  links: string[];
  name: string;
  email: string;
  phone: string;
  organisation: string;
  preferredChannel: 'email' | 'whatsapp' | 'phone';
}

const EMPTY: Draft = {
  projectType: '',
  problem: '',
  targetUsers: '',
  features: [],
  budget: [50_000, 200_000],
  timelineWeeks: 8,
  links: [],
  name: '',
  email: '',
  phone: '',
  organisation: '',
  preferredChannel: 'email',
};

const STEPS = ['Project', 'Features', 'Budget & timeline', 'Contact'];
const featureMeta = (id: string) => FEATURE_CATALOG.find((f) => f.id === id);

function validate(d: Draft, step: number): string | null {
  if (step === 0) {
    if (!d.projectType) return 'Pick a project type.';
    if (d.problem.trim().length < 20) return 'Describe the problem in at least 20 characters.';
    if (d.targetUsers.trim().length < 3) return 'Who will use it?';
  }
  if (step === 1 && d.features.length === 0) return 'Pick at least one feature.';
  if (step === 2 && d.links.some((l) => !/^https:\/\/\S+$/.test(l))) return 'Reference links must start with https://';
  if (step === 3) {
    if (d.name.trim().length < 2) return 'Enter your name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) return 'Enter a valid email.';
    if (d.phone && !isE164(d.phone)) return 'Enter a valid phone number or leave it empty.';
    if (d.preferredChannel !== 'email' && !d.phone) return 'Add a phone number for WhatsApp/phone contact.';
  }
  return null;
}

function BriefPreview({ d }: { d: Draft }) {
  const type = PROJECT_TYPES.find((t) => t.id === d.projectType);
  const est = estimateWeeks(d.features.length);
  return (
    <div className="rounded-3xl border bg-gradient-to-b from-card to-muted/40 p-6 shadow-lift">
      <p className="eyebrow">Live brief preview</p>
      <h2 className="mt-3 font-display text-2xl font-semibold">
        {type ? (
          <>
            <span aria-hidden>{type.emoji}</span> {type.label}
          </>
        ) : (
          <span className="text-muted-foreground">Your project</span>
        )}
      </h2>
      {d.organisation && <p className="text-sm text-muted-foreground">for {d.organisation}</p>}
      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="font-semibold">Problem</dt>
          <dd className="mt-1 whitespace-pre-line text-muted-foreground">{d.problem || '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Users</dt>
          <dd className="mt-1 text-muted-foreground">{d.targetUsers || '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Features by priority</dt>
          <dd className="mt-2">
            {d.features.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <ol className="space-y-1">
                <AnimatePresence initial={false}>
                  {d.features.map((f, i) => (
                    <motion.li key={f} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold text-accent">{i + 1}.</span> {featureMeta(f)?.label}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            )}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-background/70 p-3">
          <div>
            <dt className="text-xs text-muted-foreground">Budget</dt>
            <dd className="font-semibold">
              {formatInr(d.budget[0])} – {formatInr(d.budget[1])}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timeline</dt>
            <dd className="font-semibold">{d.timelineWeeks} weeks</dd>
          </div>
        </div>
        {d.features.length > 0 && (
          <p className="rounded-2xl border border-dashed p-3 text-xs text-muted-foreground">
            Indicative effort for {d.features.length} features: {est.min}–{est.max} weeks.
            {d.timelineWeeks < est.min && <span className="block font-medium text-amber-600 dark:text-amber-300"> Your timeline is tight — we’ll suggest a phased launch.</span>}
          </p>
        )}
      </dl>
    </div>
  );
}

export default function CustomAppPage() {
  const [d, setD] = useState<Draft>(() => ({ ...EMPTY, ...readJson<Partial<Draft>>('local', STORAGE_KEYS.customDraft, {}) }));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [submitted, setSubmitted] = useState<CustomRequest | null>(null);
  const { user, requestSignIn } = useAuth();
  const { feedback } = usePreferences();
  const navigate = useNavigate();

  useEffect(() => writeJson('local', STORAGE_KEYS.customDraft, d), [d]);
  useEffect(() => {
    if (user) setD((s) => ({ ...s, name: s.name || user.displayName || '', email: s.email || user.email || '' }));
  }, [user]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    setError(null);
  };
  const ideas = useMemo(() => suggestFeatures(d.projectType, d.problem, d.features), [d.projectType, d.problem, d.features]);
  const toggleFeature = (f: FeatureId) => {
    feedback();
    set('features', d.features.includes(f) ? d.features.filter((x) => x !== f) : [...d.features, f].slice(0, 12));
  };
  const move = (i: number, delta: number) => {
    const next = [...d.features];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + delta)), 0, x);
    set('features', next);
  };

  const next = () => {
    const err = validate(d, step);
    if (err) return setError(err);
    setStep(step + 1);
  };

  const submit = async () => {
    const err = validate(d, 3);
    if (err) return setError(err);
    if (!user) {
      requestSignIn('Sign in so you can track your request — your brief is saved.');
      return;
    }
    setBusy(true);
    try {
      const req = await (await backend()).createCustomRequest({
        uid: user.uid,
        contact: { name: d.name.trim(), email: d.email.trim().toLowerCase(), phone: d.phone, organisation: d.organisation.trim() },
        projectType: PROJECT_TYPES.find((t) => t.id === d.projectType)?.label ?? d.projectType,
        problem: d.problem.trim(),
        targetUsers: d.targetUsers.trim(),
        features: d.features.map((f) => featureMeta(f)?.label ?? f),
        referenceLinks: d.links,
        budgetInr: { min: d.budget[0], max: d.budget[1] },
        timelineWeeks: d.timelineWeeks,
        preferredChannel: d.preferredChannel,
      });
      const email = getEmailProvider();
      void email.send(customRequestReceivedEmail(req));
      void email.send(customRequestAdminAlertEmail(req));
      removeStorage('local', STORAGE_KEYS.customDraft);
      setSubmitted(req);
    } catch (e) {
      setError(e instanceof BackendError ? e.message : 'Could not submit. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <Celebration show />
        <Sparkles className="mx-auto h-12 w-12 text-accent" />
        <h1 className="mt-4 text-4xl font-semibold">Request received!</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Your reference is <strong className="text-foreground">{submitted.reference}</strong>. We’ve emailed you a copy and will reply within 3 working days.
        </p>
        <Button className="mt-8" size="lg" onClick={() => navigate(routes.customAppsTrack)}>
          Track my request <ArrowRight />
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12 sm:py-16">
      <PageMeta title="Build me a custom app" description="Describe your learning app or website idea with our interactive brief builder. Track progress online." path={routes.customApps} />
      <header className="max-w-3xl">
        <p className="eyebrow">Custom apps</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Build me a custom app</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Shape your brief in four quick steps and watch it take form on the right. Already sent one?{' '}
          <Link to={routes.customAppsTrack} className="font-semibold text-foreground underline decoration-accent underline-offset-4">
            Track it here
          </Link>
          .
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border bg-card p-5 sm:p-8">
          <div className="mb-8 flex gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn('flex-1 text-left', i < step ? 'cursor-pointer' : 'cursor-default')}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className={cn('block h-1.5 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-muted')} />
                <span className={cn('mt-2 hidden text-xs font-medium sm:block', i === step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              {step === 0 && (
                <>
                  <fieldset>
                    <legend className="text-sm font-medium">What are we building?</legend>
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {PROJECT_TYPES.map((t) => (
                        <motion.button
                          key={t.id}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          aria-pressed={d.projectType === t.id}
                          onClick={() => set('projectType', t.id)}
                          className={cn('rounded-2xl border p-4 text-left transition hover:border-accent', d.projectType === t.id && 'border-accent bg-accent/10')}
                        >
                          <span className="text-2xl" aria-hidden>
                            {t.emoji}
                          </span>
                          <span className="mt-2 block font-semibold">{t.label}</span>
                          <span className="block text-xs text-muted-foreground">{t.hint}</span>
                        </motion.button>
                      ))}
                    </div>
                  </fieldset>
                  <Field id="cr-problem" label="What problem should it solve?" required hint={`${d.problem.length}/2000`}>
                    <Textarea id="cr-problem" maxLength={2000} value={d.problem} onChange={(e) => set('problem', e.target.value)} placeholder="e.g. Our 200 students struggle to practise chanting between classes…" />
                  </Field>
                  <Field id="cr-users" label="Who are the users?" required>
                    <Input id="cr-users" maxLength={300} value={d.targetUsers} onChange={(e) => set('targetUsers', e.target.value)} placeholder="Students aged 12–60, teachers, parents" />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  {ideas.length > 0 && (
                    <div className="rounded-2xl border border-dashed border-accent/50 bg-accent/5 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Lightbulb className="h-4 w-4 text-accent" /> Idea helper suggests
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {ideas.map((s) => (
                          <li key={s.feature}>
                            <button
                              type="button"
                              onClick={() => toggleFeature(s.feature)}
                              title={s.why}
                              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-accent"
                            >
                              <Plus className="h-3 w-3" /> {featureMeta(s.feature)?.label}
                              <span className="sr-only"> — {s.why}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <fieldset>
                    <legend className="text-sm font-medium">Pick features</legend>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                      {FEATURE_CATALOG.map((f) => {
                        const on = d.features.includes(f.id);
                        return (
                          <motion.button
                            key={f.id}
                            type="button"
                            layout
                            whileTap={{ scale: 0.95 }}
                            aria-pressed={on}
                            onClick={() => toggleFeature(f.id)}
                            className={cn('flex flex-col items-start gap-2 rounded-2xl border p-3 text-left text-sm transition hover:border-accent', on && 'border-accent bg-accent/10')}
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg" aria-hidden>
                              {f.emoji}
                            </span>
                            <span className="font-medium leading-tight">{f.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>
                  {d.features.length > 1 && (
                    <div>
                      <p className="text-sm font-medium">Drag to prioritise (or use the arrows)</p>
                      <Reorder.Group axis="y" values={d.features} onReorder={(v) => set('features', v)} className="mt-3 space-y-2">
                        {d.features.map((f, i) => (
                          <Reorder.Item key={f} value={f} className="flex cursor-grab items-center gap-3 rounded-2xl border bg-background p-3 active:cursor-grabbing">
                            <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
                            <span className="w-5 text-sm font-bold text-accent">{i + 1}</span>
                            <span className="flex-1 text-sm">{featureMeta(f)?.label}</span>
                            <button type="button" className="rounded-full p-1.5 hover:bg-muted disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${featureMeta(f)?.label} up`}>
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button type="button" className="rounded-full p-1.5 hover:bg-muted disabled:opacity-30" disabled={i === d.features.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${featureMeta(f)?.label} down`}>
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium" id="budget-label">
                        Budget range
                      </p>
                      <p className="font-display text-lg">
                        {formatInr(d.budget[0])} – {formatInr(d.budget[1])}
                      </p>
                    </div>
                    <Slider aria-label="Budget" aria-labelledby="budget-label" min={10_000} max={1_000_000} step={10_000} value={d.budget} onValueChange={(v) => set('budget', [v[0], v[1]] as [number, number])} className="mt-3" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium" id="timeline-label">
                        Ideal timeline
                      </p>
                      <p className="font-display text-lg">{d.timelineWeeks} weeks</p>
                    </div>
                    <Slider aria-label="Timeline in weeks" aria-labelledby="timeline-label" min={2} max={52} step={1} value={[d.timelineWeeks]} onValueChange={(v) => set('timelineWeeks', v[0])} className="mt-3" />
                  </div>
                  <Field id="cr-link" label="Reference links (Google Drive, Figma, sites you like)" hint="Share Drive links with “anyone with the link can view”. No uploads needed.">
                    <div className="flex gap-2">
                      <Input id="cr-link" type="url" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://drive.google.com/…" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const l = linkInput.trim();
                          if (!/^https:\/\/\S+$/.test(l)) return setError('Links must start with https://');
                          if (d.links.length >= 8) return setError('Up to 8 links.');
                          set('links', [...d.links, l]);
                          setLinkInput('');
                        }}
                      >
                        <Plus /> Add
                      </Button>
                    </div>
                  </Field>
                  {d.links.length > 0 && (
                    <ul className="space-y-2">
                      {d.links.map((l) => (
                        <li key={l} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{l}</span>
                          <button type="button" aria-label="Remove link" onClick={() => set('links', d.links.filter((x) => x !== l))} className="rounded-full p-1 hover:bg-background">
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {step === 3 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="cr-name" label="Your name" required>
                    <Input id="cr-name" autoComplete="name" value={d.name} onChange={(e) => set('name', e.target.value)} />
                  </Field>
                  <Field id="cr-email" label="Email" required>
                    <Input id="cr-email" type="email" autoComplete="email" value={d.email} onChange={(e) => set('email', e.target.value)} />
                  </Field>
                  <Field id="cr-phone" label="Phone / WhatsApp">
                    <PhoneField id="cr-phone" value={d.phone} onChange={(v) => set('phone', v.startsWith('invalid:') ? '' : v)} />
                  </Field>
                  <Field id="cr-org" label="Organisation (optional)">
                    <Input id="cr-org" value={d.organisation} onChange={(e) => set('organisation', e.target.value)} />
                  </Field>
                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm font-medium">Preferred contact</legend>
                    <div className="mt-2 flex gap-2">
                      {(['email', 'whatsapp', 'phone'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={d.preferredChannel === c}
                          onClick={() => set('preferredChannel', c)}
                          className={cn('rounded-full border px-4 py-2 text-sm capitalize transition', d.preferredChannel === c ? 'border-accent bg-accent/15 font-semibold' : 'hover:border-accent')}
                        >
                          {c === 'whatsapp' ? 'WhatsApp' : c}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p role="alert" className="mt-5 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next <ArrowRight />
              </Button>
            ) : (
              <Button variant="gold" onClick={() => void submit()} loading={busy}>
                <Send /> {user ? 'Submit request' : 'Sign in & submit'}
              </Button>
            )}
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BriefPreview d={d} />
        </aside>
      </div>
    </div>
  );
}
