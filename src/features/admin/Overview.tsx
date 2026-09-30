import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardCheck, Database, Timer, Users, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { env } from '@/config/env';
import { backend } from '@/data';
import { useCourseStats, useCourses } from '@/data/queries';
import { useAuth } from '@/features/auth/AuthProvider';
import { getEmailProvider } from '@/providers/email';
import { AnimatedCounter } from '@/shared/components/Motion';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';

function Stat({ label, value, icon: Icon, to }: { label: string; value: number | undefined; icon: typeof Users; to: string }) {
  return (
    <Link to={to} className="rounded-3xl border bg-card p-5 transition hover:border-accent hover:shadow-glow">
      <Icon className="h-5 w-5 text-accent" aria-hidden />
      <p className="mt-3 font-display text-3xl font-semibold">{value === undefined ? <Skeleton className="h-8 w-12" /> : <AnimatedCounter value={value} />}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

/** Seats taken per course — one series, single hue, direct labels, hover titles. */
function SeatsChart() {
  const { data: courses } = useCourses();
  const { data: stats } = useCourseStats();
  const rows = (courses ?? [])
    .map((c) => ({ id: c.id, title: c.title, taken: stats?.[c.id]?.seatsTaken ?? 0, limit: c.seatLimit }))
    .sort((a, b) => b.taken - a.taken);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.taken, r.limit)));
  return (
    <figure className="rounded-3xl border bg-card p-6">
      <figcaption className="font-semibold">Seats taken by course</figcaption>
      <p className="text-sm text-muted-foreground">Held + verifying + approved. The faint track shows the seat limit.</p>
      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-3 text-sm" title={`${r.title}: ${r.taken}${r.limit ? ` of ${r.limit}` : ''} seats`}>
            <span className="truncate text-muted-foreground">{r.title}</span>
            <span className="relative h-3 rounded-full">
              {r.limit > 0 && <span className="absolute inset-y-0 left-0 rounded-full bg-muted" style={{ width: `${(r.limit / max) * 100}%` }} />}
              <span className="absolute inset-y-0 left-0 rounded-full bg-saffron" style={{ width: `${Math.max(1, (r.taken / max) * 100)}%` }} />
            </span>
            <span className="tabular-nums">
              {r.taken}
              {r.limit ? <span className="text-muted-foreground">/{r.limit}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const counts = useQuery({
    queryKey: ['admin', 'counts'],
    queryFn: async () => {
      const b = await backend();
      const [pending, approved, subs, requests, emailsThisMonth] = await Promise.all([
        b.countRegistrations('PENDING_VERIFICATION'),
        b.countRegistrations('APPROVED'),
        b.countSubscribers(),
        b.listCustomRequests().then((r) => r.filter((x) => x.status !== 'DELIVERED').length),
        b.countNotificationsThisMonth('email'),
      ]);
      return { pending, approved, subs, requests, emailsThisMonth };
    },
    staleTime: 60_000,
  });

  const warnings = [
    env.backend === 'demo' && 'Demo mode: Firebase is not configured — data lives only in this browser. See README → “Connect Firebase”.',
    env.upi.isPlaceholder && 'UPI ID is a placeholder. Set the VITE_UPI_VPA and VITE_UPI_PAYEE_NAME repository variables before taking payments.',
    getEmailProvider().id === 'console' && 'Emails are mocked (Console provider). Add the EmailJS variables to send real email.',
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Overview"
        description="Everything that needs your attention."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const n = await (await backend()).releaseExpiredHolds(user!.uid);
                toast.success(n ? `Released ${n} expired hold(s).` : 'No expired holds.');
                void qc.invalidateQueries();
              }}
            >
              <Timer /> Release expired holds
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm('Load demo courses, teachers, testimonials, subhashitas and coupons? Existing items with the same IDs are overwritten.')) return;
                await (await backend()).loadDemoData(user!.uid);
                toast.success('Demo data loaded.');
                void qc.invalidateQueries();
              }}
            >
              <Database /> Load demo data
            </Button>
          </>
        }
      />
      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> {w}
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Awaiting verification" value={counts.data?.pending} icon={ClipboardCheck} to="/admin/verify" />
        <Stat label="Approved registrations" value={counts.data?.approved} icon={Users} to="/admin/registrations" />
        <Stat label="Active subscribers" value={counts.data?.subs} icon={Users} to="/admin/subscribers" />
        <Stat label="Open custom requests" value={counts.data?.requests} icon={Workflow} to="/admin/requests" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SeatsChart />
        <div className="rounded-3xl border bg-card p-6">
          <p className="font-semibold">Email quota (this month)</p>
          <p className="text-sm text-muted-foreground">EmailJS free plan: {env.emailjs.monthlyQuota} emails / month.</p>
          <p className="mt-4 font-display text-4xl tabular-nums">
            {counts.data?.emailsThisMonth ?? '–'}
            <span className="text-lg text-muted-foreground"> / {env.emailjs.monthlyQuota}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={counts.data?.emailsThisMonth ?? 0} aria-valuemin={0} aria-valuemax={env.emailjs.monthlyQuota} aria-label="Emails sent this month">
            <div className="h-full rounded-full bg-saffron" style={{ width: `${Math.min(100, ((counts.data?.emailsThisMonth ?? 0) / env.emailjs.monthlyQuota) * 100)}%` }} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Provider: {getEmailProvider().label}</p>
        </div>
      </div>
    </div>
  );
}
