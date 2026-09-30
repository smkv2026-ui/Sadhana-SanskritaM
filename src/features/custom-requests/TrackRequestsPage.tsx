import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { backend } from '@/data';
import { qk } from '@/data/queries';
import { CUSTOM_REQUEST_STATUSES, type CustomRequest, type CustomRequestStatus } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/SignIn';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/links';
import { formatInr } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/shared/components/PageMeta';
import { CardSkeletons, EmptyState, ErrorState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';

export const STATUS_LABEL: Record<CustomRequestStatus, string> = {
  RECEIVED: 'Received',
  IN_REVIEW: 'In review',
  PROPOSAL_SENT: 'Proposal sent',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  DELIVERED: 'Delivered',
};

export function RequestTracker({ status }: { status: CustomRequestStatus }) {
  const idx = CUSTOM_REQUEST_STATUSES.indexOf(status);
  return (
    <ol className="relative mt-6 grid grid-cols-6 gap-1" aria-label={`Status: ${STATUS_LABEL[status]}`}>
      <span aria-hidden className="absolute left-[8%] right-[8%] top-4 h-0.5 bg-border" />
      <motion.span
        aria-hidden
        className="absolute left-[8%] top-4 h-0.5 bg-success"
        initial={{ width: 0 }}
        animate={{ width: `${(idx / (CUSTOM_REQUEST_STATUSES.length - 1)) * 84}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
      {CUSTOM_REQUEST_STATUSES.map((s, i) => (
        <li key={s} className="relative flex flex-col items-center text-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring' }}
            className={cn(
              'z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background text-xs font-bold',
              i < idx && 'border-success bg-success text-success-foreground',
              i === idx && 'border-accent bg-accent text-accent-foreground ring-4 ring-accent/20',
            )}
            aria-current={i === idx ? 'step' : undefined}
          >
            {i < idx ? <Check className="h-4 w-4" /> : i + 1}
          </motion.span>
          <span className={cn('mt-2 text-[11px] leading-tight sm:text-xs', i === idx ? 'font-semibold' : 'text-muted-foreground')}>{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

function RequestCard({ r }: { r: CustomRequest }) {
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r.reference}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{r.projectType}</h2>
          <p className="text-sm text-muted-foreground">
            Submitted {formatDate(r.createdAt)} · {formatInr(r.budgetInr.min)}–{formatInr(r.budgetInr.max)} · {r.timelineWeeks} weeks
          </p>
        </div>
      </div>
      <RequestTracker status={r.status} />
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-medium">History & brief</summary>
        <ul className="mt-3 space-y-2">
          {[...r.statusHistory].reverse().map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-28 shrink-0 text-muted-foreground">{formatDate(h.at)}</span>
              <span>
                <strong>{STATUS_LABEL[h.status]}</strong>
                {h.note ? ` — ${h.note}` : ''}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 whitespace-pre-line text-muted-foreground">{r.problem}</p>
        <p className="mt-2">Features: {r.features.join(', ')}</p>
      </details>
    </motion.article>
  );
}

function Track() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.myRequests(user?.uid ?? ''),
    queryFn: async () => (await backend()).listMyCustomRequests(user!.uid),
    enabled: Boolean(user),
  });
  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <PageMeta title="Track my request" path={routes.customAppsTrack} noindex />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Custom apps</p>
          <h1 className="mt-2 text-4xl font-semibold">Your requests</h1>
        </div>
        <Button asChild variant="outline">
          <Link to={routes.customApps}>
            <Plus /> New request
          </Link>
        </Button>
      </div>
      <div className="mt-8 space-y-6">
        {isLoading ? (
          <CardSkeletons count={1} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState title="No requests yet" description="Describe your idea in our brief builder — it takes about 3 minutes." action={<Button asChild><Link to={routes.customApps}>Start a brief</Link></Button>} />
        ) : (
          data.map((r) => <RequestCard key={r.id} r={r} />)
        )}
      </div>
    </div>
  );
}

export default function TrackRequestsPage() {
  return (
    <RequireAuth reason="Sign in with the account you used to submit your request.">
      <Track />
    </RequireAuth>
  );
}
