import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarPlus, CheckCircle2, Circle, Clock, Flame, Lock, PlayCircle, Receipt, Video } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '@/brand/logoGeometry';
import { backend } from '@/data';
import { useCourseMap, useMyRegistrations } from '@/data/queries';
import { effectiveStatus, isAccessExpired } from '@/data/registrationLogic';
import type { LearningProgress, Recording, Registration } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/SignIn';
import { buildIcs, downloadText } from '@/lib/ics';
import { countdown, formatDateTime } from '@/lib/format';
import { absUrl, routes } from '@/lib/links';
import { formatInr } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { isRecordingAvailable, timeLeftLabel } from '@/lib/video';
import { getAccessProvider } from '@/providers/access';
import { PageMeta } from '@/shared/components/PageMeta';
import { CardSkeletons, EmptyState, ErrorState } from '@/shared/components/States';
import { useNow } from '@/shared/hooks';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/overlays';
import { Badge, ProgressRing, Skeleton } from '@/shared/ui/primitives';
import { VideoPlayer } from './VideoPlayer';

const STATUS_BADGE = {
  PENDING_PAYMENT: { label: 'Awaiting payment', variant: 'warning' },
  PENDING_VERIFICATION: { label: 'Verifying payment', variant: 'gold' },
  APPROVED: { label: 'Active', variant: 'success' },
  REJECTED: { label: 'Not approved', variant: 'destructive' },
  EXPIRED: { label: 'Hold expired', variant: 'muted' },
} as const;

function NextSession({ regs }: { regs: Registration[] }) {
  const now = useNow(1000);
  const next = regs
    .filter((r) => r.status === 'APPROVED' && r.startsAt && new Date(r.startsAt) > now)
    .sort((a, b) => (a.startsAt as string).localeCompare(b.startsAt as string))[0];
  if (!next) return null;
  const c = countdown(next.startsAt as string, now);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-br from-midnight to-midnight-700 p-6 text-pearl shadow-lift">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-light">Next live session</p>
      <p className="mt-2 font-display text-2xl">{next.courseTitle}</p>
      <p className="text-sm text-pearl/70">{formatDateTime(next.startsAt)}</p>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center" aria-label="Countdown">
        {(
          [
            ['days', c.days],
            ['hrs', c.hours],
            ['min', c.minutes],
            ['sec', c.seconds],
          ] as const
        ).map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-white/10 py-3">
            <p className="font-display text-3xl tabular-nums">{String(v).padStart(2, '0')}</p>
            <p className="text-[10px] uppercase tracking-wider text-pearl/60">{l}</p>
          </div>
        ))}
      </div>
      <Button
        variant="gold"
        size="sm"
        className="mt-5"
        onClick={() =>
          downloadText(
            `${next.courseSlug}.ics`,
            buildIcs([{ uid: next.id, title: `${next.courseTitle} · ${BRAND.name}`, start: new Date(next.startsAt as string), durationMinutes: 60, url: absUrl(routes.myLearning), description: 'Join from My Learning' }]),
            'text/calendar',
          )
        }
      >
        <CalendarPlus /> Add to calendar
      </Button>
    </motion.div>
  );
}

function CourseAccess({ reg }: { reg: Registration }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const access = useQuery({ queryKey: ['access', reg.courseId], queryFn: () => getAccessProvider().getAccess(reg.courseId), staleTime: 10 * 60_000 });
  const progressKey = ['progress', user?.uid, reg.courseId];
  const progress = useQuery({ queryKey: progressKey, queryFn: async () => (await backend()).getProgress(user!.uid, reg.courseId), enabled: Boolean(user) });
  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => (await backend()).setRecordingComplete(user!.uid, reg.courseId, id, done),
    // Optimistic UI: tick immediately, roll back on error.
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: progressKey });
      const prev = qc.getQueryData<LearningProgress | null>(progressKey);
      const completed = { ...(prev?.completed ?? {}) };
      if (done) completed[id] = new Date().toISOString();
      else delete completed[id];
      qc.setQueryData(progressKey, { ...(prev ?? { id: '', uid: user!.uid, courseId: reg.courseId, updatedAt: '' }), completed, lastRecordingId: id });
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(progressKey, ctx?.prev),
    onSettled: () => void qc.invalidateQueries({ queryKey: progressKey }),
  });

  const [watching, setWatching] = useState<Recording | null>(null);
  const markDone = (id: string) => {
    if (!progress.data?.completed?.[id]) toggle.mutate({ id, done: true });
  };

  if (isAccessExpired(reg))
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed bg-muted/40 p-4 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" /> Your access window ended on {formatDateTime(reg.accessUntil)}.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={routes.contact}>Request an extension</Link>
        </Button>
      </div>
    );
  if (access.isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!access.data?.granted)
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" /> {access.data && !access.data.granted ? access.data.reason : 'Content unavailable.'}
      </p>
    );

  const { secrets } = access.data;
  const completed = progress.data?.completed ?? {};
  const recs = secrets.recordings.filter((r) => isRecordingAvailable(r));
  const open = (r: Recording) => {
    setWatching(r);
    if (user) void backend().then((b) => b.recordActivity(user));
  };
  const doneCount = recs.filter((r) => completed[r.id]).length;
  const resume = recs.find((r) => !completed[r.id]) ?? recs[0];

  return (
    <div className="space-y-5">
      {secrets.meetingLink && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/40 bg-success/5 p-4">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <Video className="h-4 w-4 text-success" /> Live class link
            </p>
            {secrets.meetingNotes && <p className="text-sm text-muted-foreground">{secrets.meetingNotes}</p>}
          </div>
          <Button asChild variant="success">
            <a href={secrets.meetingLink} target="_blank" rel="noopener noreferrer">
              Join class
            </a>
          </Button>
        </div>
      )}
      {recs.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ProgressRing value={recs.length ? doneCount / recs.length : 0} size={48} />
              <p className="text-sm">
                <strong>{doneCount}</strong> of {recs.length} lessons complete
              </p>
            </div>
            {resume && (
              <Button size="sm" onClick={() => open(resume)}>
                <PlayCircle /> {doneCount ? 'Resume' : 'Start'}
              </Button>
            )}
          </div>
          <ul className="mt-4 divide-y rounded-2xl border">
            {recs.map((r) => {
              const done = Boolean(completed[r.id]);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      toggle.mutate({ id: r.id, done: !done });
                      if (!done && user) void backend().then((b) => b.recordActivity(user));
                    }}
                    aria-pressed={done}
                    aria-label={`Mark “${r.title}” as ${done ? 'not complete' : 'complete'}`}
                    className="rounded-full transition active:scale-90"
                  >
                    <motion.span key={String(done)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="block">
                      {done ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                    </motion.span>
                  </button>
                  <button
                    type="button"
                    onClick={() => open(r)}
                    className={cn('group/rec flex flex-1 items-center gap-2 text-left text-sm transition hover:text-accent', done && 'text-muted-foreground line-through decoration-success/60')}
                  >
                    <PlayCircle className="h-4 w-4 shrink-0 text-accent opacity-60 transition group-hover/rec:scale-110 group-hover/rec:opacity-100" />
                    <span className="min-w-0 flex-1">{r.title}</span>
                  </button>
                  {r.availableUntil && (
                    <span className="hidden rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 sm:inline">{timeLeftLabel(r.availableUntil)}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{r.durationMinutes} min</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {secrets.resources.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {secrets.resources.map((res) => (
            <li key={res.url}>
              <a href={res.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border px-3 py-1.5 hover:border-accent">
                {res.title}
              </a>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={Boolean(watching)} onOpenChange={(o) => !o && setWatching(null)}>
        <DialogContent className="max-w-4xl p-3 sm:p-5">
          <DialogHeader className="px-1">
            <DialogTitle className="text-lg sm:text-xl">{watching?.title}</DialogTitle>
            <DialogDescription>
              {reg.courseTitle}
              {reg.accessUntil ? ` · Access until ${formatDateTime(reg.accessUntil)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {watching && (
            <VideoPlayer url={watching.url} title={watching.title} watermark={user?.email ?? reg.participant.email} onEnded={() => markDone(watching.id)} />
          )}
          {watching && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs text-muted-foreground">Streaming inside Sadhana Sanskritam · downloads are disabled</p>
              <Button size="sm" variant={completed[watching.id] ? 'outline' : 'success'} onClick={() => toggle.mutate({ id: watching.id, done: !completed[watching.id] })}>
                <CheckCircle2 /> {completed[watching.id] ? 'Completed' : 'Mark complete'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useMyRegistrations(user?.uid);
  const courseMap = useCourseMap();
  const profile = useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: async () => (await backend()).recordActivity(user!),
    enabled: Boolean(user),
    staleTime: Infinity,
  });
  const scrolled = useRef(false);

  const regs = useMemo(() => (data ?? []).map((r) => ({ ...r, status: effectiveStatus(r) })), [data]);
  const active = regs.filter((r) => r.status === 'APPROVED');
  const pending = regs.filter((r) => r.status === 'PENDING_PAYMENT' || r.status === 'PENDING_VERIFICATION');
  const other = regs.filter((r) => r.status === 'REJECTED' || r.status === 'EXPIRED');

  useEffect(() => {
    if (!scrolled.current && location.hash) {
      scrolled.current = true;
      document.querySelector(location.hash)?.scrollIntoView();
    }
  }, [data]);

  return (
    <div className="container py-12 sm:py-16">
      <PageMeta title="My Learning" path={routes.myLearning} noindex />
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">My Learning</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Namaste, {(user?.displayName ?? user?.email ?? 'learner').split(/[ @]/)[0]}</h1>
        </div>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 rounded-full border bg-card px-5 py-3" title="Days in a row you've learned">
          <Flame className={cn('h-6 w-6', (profile.data?.streakCount ?? 0) > 1 ? 'text-orange-500' : 'text-muted-foreground')} />
          <span className="font-display text-2xl tabular-nums">{profile.data?.streakCount ?? '–'}</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </motion.div>
      </header>

      {isLoading ? (
        <div className="mt-10">
          <CardSkeletons count={2} />
        </div>
      ) : error ? (
        <ErrorState className="mt-10" error={error} onRetry={() => void refetch()} />
      ) : regs.length === 0 ? (
        <EmptyState className="mt-10" title="Your path begins here" description="You haven’t registered for anything yet. Find a course that fits you." action={<Button asChild><Link to={routes.finder}>Find your path</Link></Button>} />
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed bg-card p-5">
                <div>
                  <Badge variant={STATUS_BADGE[r.status].variant}>{STATUS_BADGE[r.status].label}</Badge>
                  <p className="mt-2 font-display text-xl">{r.courseTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.reference} · {formatInr(r.amountInr)}
                  </p>
                </div>
                <Button asChild variant={r.status === 'PENDING_PAYMENT' ? 'gold' : 'outline'}>
                  <Link to={routes.register(r.courseSlug)}>{r.status === 'PENDING_PAYMENT' ? 'Complete payment' : 'View status'}</Link>
                </Button>
              </div>
            ))}
            {active.map((r) => (
              <section key={r.id} id={`c-${r.courseId}`} className="rounded-3xl border bg-card p-6" aria-labelledby={`h-${r.id}`}>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isAccessExpired(r) ? 'muted' : 'success'}>{isAccessExpired(r) ? 'Access ended' : 'Active'}</Badge>
                      {r.accessUntil && !isAccessExpired(r) && (
                        <Badge variant="gold" title={`Access until ${formatDateTime(r.accessUntil)}`}>
                          <Clock className="mr-1 h-3 w-3" /> {timeLeftLabel(r.accessUntil)}
                        </Badge>
                      )}
                    </div>
                    <h2 id={`h-${r.id}`} className="mt-2 font-display text-2xl font-semibold">
                      {r.courseTitle}
                    </h2>
                    {courseMap[r.courseId]?.scheduleText && <p className="text-sm text-muted-foreground">{courseMap[r.courseId].scheduleText}</p>}
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={routes.receipt(r.id)}>
                      <Receipt /> Receipt
                    </Link>
                  </Button>
                </div>
                <CourseAccess reg={r} />
              </section>
            ))}
            {other.length > 0 && (
              <details className="rounded-3xl border p-5">
                <summary className="cursor-pointer font-medium">Past registrations ({other.length})</summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {other.map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      <span>{r.courseTitle}</span>
                      <Link to={routes.register(r.courseSlug)} className="text-accent underline-offset-4 hover:underline">
                        {STATUS_BADGE[r.status].label} · details
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <aside className="space-y-6">
            <NextSession regs={regs} />
            <div className="rounded-3xl border bg-card p-6 text-sm">
              <p className="font-semibold">Need help?</p>
              <p className="mt-1 text-muted-foreground">Questions about access or payment? Write to us with your reference number.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={routes.contact}>Contact support</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function MyLearningPage() {
  return (
    <RequireAuth reason="Sign in to see your courses, recordings and progress.">
      <Dashboard />
    </RequireAuth>
  );
}
