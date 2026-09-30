import { motion } from 'framer-motion';
import { CalendarPlus, Download } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '@/brand/logoGeometry';
import { useCourseStats, useCourses } from '@/data/queries';
import type { Course } from '@/data/types';
import { buildIcs, downloadText } from '@/lib/ics';
import { formatDateTime } from '@/lib/format';
import { absUrl, routes } from '@/lib/links';
import { computePrice, formatInr } from '@/lib/pricing';
import { SeatMeter } from '@/shared/components/Bits';
import { PageMeta } from '@/shared/components/PageMeta';
import { CardSkeletons, EmptyState, ErrorState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/primitives';

function toIcs(c: Course) {
  return {
    uid: c.id,
    title: `${c.title} · ${BRAND.name}`,
    description: `${c.summary}\n${absUrl(routes.course(c.slug))}`,
    url: absUrl(routes.course(c.slug)),
    start: new Date(c.startsAt as string),
    durationMinutes: c.durationMinutes,
  };
}

export default function EventsPage() {
  const { data, isLoading, error, refetch } = useCourses();
  const { data: stats } = useCourseStats();
  const upcoming = useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.startsAt && new Date(c.startsAt).getTime() > Date.now() - 86_400_000)
        .sort((a, b) => (a.startsAt as string).localeCompare(b.startsAt as string)),
    [data],
  );

  const byMonth = useMemo(() => {
    const groups = new Map<string, Course[]>();
    for (const c of upcoming) {
      const key = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(c.startsAt as string));
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return [...groups.entries()];
  }, [upcoming]);

  return (
    <div className="container py-12 sm:py-16">
      <PageMeta title="Events" description="Upcoming live sessions, workshops and satsangs — add them to your calendar." path={routes.events} />
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Timeline</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">What’s coming up</h1>
          <p className="mt-4 text-lg text-muted-foreground">Live cohorts, workshops and community evenings. Times shown in IST and your local time.</p>
        </div>
        {upcoming.length > 0 && (
          <Button variant="outline" onClick={() => downloadText('sadhana-sanskritam-events.ics', buildIcs(upcoming.map(toIcs)), 'text/calendar')}>
            <Download /> Download all (.ics)
          </Button>
        )}
      </header>

      <div className="mt-12">
        {isLoading ? (
          <CardSkeletons />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : upcoming.length === 0 ? (
          <EmptyState title="No upcoming sessions yet" description="Subscribe and we’ll let you know as soon as dates are announced." action={<Button asChild><Link to={routes.subscribe}>Get notified</Link></Button>} />
        ) : (
          <div className="space-y-14">
            {byMonth.map(([month, items]) => (
              <section key={month} aria-labelledby={`m-${month}`}>
                <h2 id={`m-${month}`} className="sticky top-16 z-10 -mx-4 bg-background/85 px-4 py-2 font-display text-2xl backdrop-blur">
                  {month}
                </h2>
                <ol className="relative ml-4 mt-6 space-y-8 border-l-2 border-dashed border-accent/40 pl-7 sm:ml-5 sm:pl-10">
                  {items.map((c, i) => {
                    const d = new Date(c.startsAt as string);
                    const price = computePrice(c);
                    return (
                      <motion.li
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="relative"
                      >
                        <span className="absolute -left-[49px] top-2 flex h-8 w-8 flex-col items-center justify-center rounded-full border-2 border-accent bg-background text-[10px] font-bold leading-none sm:-left-[57px] sm:h-10 sm:w-10 sm:text-xs">
                          {d.getDate()}
                        </span>
                        <div className="grid grid-cols-1 gap-4 rounded-3xl border bg-card p-4 transition-shadow hover:shadow-glow sm:grid-cols-[1fr_220px] sm:p-6">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={c.kind === 'event' ? 'outline' : 'gold'}>{c.kind === 'event' ? 'Event' : 'Course starts'}</Badge>
                              <Badge variant="muted" className="capitalize">
                                {c.type}
                              </Badge>
                            </div>
                            <h3 className="mt-3 font-display text-xl font-semibold sm:text-2xl">
                              <Link to={routes.course(c.slug)} className="hover:text-accent">
                                {c.title}
                              </Link>
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(c.startsAt, c.timezone)} · {c.scheduleText}</p>
                            <p className="mt-3 text-[15px]">{c.summary}</p>
                          </div>
                          <div className="flex flex-col justify-between gap-4">
                            <p className="font-display text-2xl font-semibold">{formatInr(price.total)}</p>
                            <SeatMeter limit={c.seatLimit} taken={stats?.[c.id]?.seatsTaken ?? 0} compact />
                            <div className="flex gap-2">
                              <Button asChild size="sm" className="flex-1">
                                <Link to={routes.course(c.slug)}>Details</Link>
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9"
                                aria-label={`Add ${c.title} to calendar`}
                                onClick={() => downloadText(`${c.slug}.ics`, buildIcs([toIcs(c)]), 'text/calendar')}
                              >
                                <CalendarPlus />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
