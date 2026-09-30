import { motion } from 'framer-motion';
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, Globe, Languages, Share2, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BRAND } from '@/brand/logoGeometry';
import { useCourse, useLiveSeats, useMyRegistrations, useTeachers } from '@/data/queries';
import { effectiveStatus, seatsLeft } from '@/data/registrationLogic';
import { useAuth } from '@/features/auth/AuthProvider';
import { buildIcs, downloadText, googleCalendarUrl } from '@/lib/ics';
import { formatDateTime } from '@/lib/format';
import { absUrl, routes } from '@/lib/links';
import { computePrice, formatInr } from '@/lib/pricing';
import { SeatMeter } from '@/shared/components/Bits';
import { MagneticButton, Reveal } from '@/shared/components/Motion';
import { PageMeta } from '@/shared/components/PageMeta';
import { EmptyState, ErrorState, PageLoader } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/overlays';
import { Badge, ProgressRing } from '@/shared/ui/primitives';
import { CourseCover, TYPE_META } from './CourseCard';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: course, isLoading, error, refetch } = useCourse(slug);
  const live = useLiveSeats(course?.id);
  const { data: teachers } = useTeachers();
  const { user } = useAuth();
  const { data: myRegs } = useMyRegistrations(user?.uid);

  if (isLoading) return <PageLoader />;
  if (error) return <div className="container py-16"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (!course)
    return (
      <div className="container py-16">
        <EmptyState title="Course not found" description="It may have been archived." action={<Button onClick={() => navigate(routes.courses)}>Browse courses</Button>} />
      </div>
    );

  const price = computePrice(course);
  const left = seatsLeft(course.seatLimit, live);
  const soldOut = left === 0;
  const mine = myRegs?.find((r) => r.courseId === course.id);
  const myStatus = mine ? effectiveStatus(mine) : null;
  const Type = TYPE_META[course.type];
  const courseTeachers = (teachers ?? []).filter((t) => course.teacherIds.includes(t.id));
  const totalMinutes = course.syllabus.reduce((s, m) => s + (m.durationMinutes ?? 0), 0);

  const icsEvent = course.startsAt
    ? {
        uid: course.id,
        title: `${course.title} · ${BRAND.name}`,
        description: `${course.summary}\n${absUrl(routes.course(course.slug))}`,
        url: absUrl(routes.course(course.slug)),
        start: new Date(course.startsAt),
        durationMinutes: course.durationMinutes,
      }
    : null;

  const cta = (() => {
    if (myStatus === 'APPROVED') return { label: 'Open in My Learning', to: routes.myLearning };
    if (myStatus === 'PENDING_PAYMENT' || myStatus === 'PENDING_VERIFICATION' || myStatus === 'EXPIRED')
      return { label: 'Continue registration', to: routes.register(course.slug) };
    if (soldOut) return null;
    return { label: price.total === 0 ? 'Reserve a free seat' : 'Register now', to: routes.register(course.slug) };
  })();

  return (
    <article className="pb-24">
      <PageMeta
        title={course.title}
        description={course.summary}
        path={routes.course(course.slug)}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': course.kind === 'event' ? 'Event' : 'Course',
          name: course.title,
          description: course.summary,
          provider: { '@type': 'Organization', name: BRAND.name },
          ...(course.kind === 'event' && course.startsAt
            ? { startDate: course.startsAt, eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode', location: { '@type': 'VirtualLocation', url: absUrl(routes.course(course.slug)) } }
            : {}),
          offers: { '@type': 'Offer', price: price.total, priceCurrency: 'INR', availability: soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' },
        }}
      />
      <div className="container pt-8">
        <Link to={routes.courses} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>
      </div>

      <div className="container mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap gap-2">
              <Badge variant={course.type === 'recorded' ? 'diamond' : 'gold'}>
                <Type.icon className="h-3 w-3" /> {Type.label}
              </Badge>
              <Badge variant="muted" className="capitalize">
                {course.level}
              </Badge>
              {course.kind === 'event' && <Badge variant="outline">Event</Badge>}
              {course.status !== 'published' && <Badge variant="warning">{course.status} (admin preview)</Badge>}
            </div>
            <h1 className="mt-4 text-balance text-4xl font-semibold sm:text-5xl">{course.title}</h1>
            {course.titleSa && (
              <p lang="sa" className="deva mt-2 text-2xl text-accent">
                {course.titleSa}
              </p>
            )}
            <p className="mt-5 text-lg text-muted-foreground">{course.description || course.summary}</p>
          </motion.div>

          <CourseCover course={course} className="mt-8 h-48 sm:h-64 lg:hidden" />

          <section className="mt-12" aria-labelledby="outcomes">
            <h2 id="outcomes" className="text-2xl font-semibold">What you’ll achieve</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o, i) => (
                <Reveal key={o} delay={i * 0.05}>
                  <li className="flex gap-3 rounded-2xl border bg-card p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                    <span>{o}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          <section className="mt-12" aria-labelledby="syllabus">
            <div className="flex items-end justify-between gap-4">
              <h2 id="syllabus" className="text-2xl font-semibold">{course.kind === 'event' ? 'Agenda' : 'Syllabus'}</h2>
              {totalMinutes > 0 && <p className="text-sm text-muted-foreground">{Math.round(totalMinutes / 60)} h of content</p>}
            </div>
            <Accordion type="multiple" defaultValue={['m-0']} className="mt-5 rounded-3xl border bg-card px-5">
              {course.syllabus.map((m, i) => (
                <AccordionItem key={m.id} value={`m-${i}`}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-4">
                      <ProgressRing value={(i + 1) / course.syllabus.length} size={40} label={`Module ${i + 1} of ${course.syllabus.length}`} />
                      <span>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module {i + 1}</span>
                        <span className="font-display text-lg">{m.title}</span>
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="ml-14 space-y-2 text-[15px]">
                      {m.items.map((it) => (
                        <li key={it} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {it}
                        </li>
                      ))}
                    </ul>
                    {m.durationMinutes ? <p className="ml-14 mt-3 text-xs text-muted-foreground">≈ {m.durationMinutes} min</p> : null}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {courseTeachers.length > 0 && (
            <section className="mt-12" aria-labelledby="teachers">
              <h2 id="teachers" className="text-2xl font-semibold">Your teachers</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {courseTeachers.map((t) => (
                  <div key={t.id} className="rounded-2xl border bg-card p-5">
                    <p className="font-display text-lg font-semibold">{t.name}</p>
                    <p className="text-sm text-accent">{t.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t.bio}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border bg-card p-5 shadow-lift">
            <CourseCover course={course} className="hidden h-40 lg:block" />
            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-4xl font-semibold">{formatInr(price.total)}</span>
              {price.earlyBird && <span className="text-muted-foreground line-through">{formatInr(course.priceInr)}</span>}
            </div>
            {price.earlyBird && course.earlyBirdEndsAt && (
              <p className="mt-1 text-sm text-success">Early-bird price until {formatDateTime(course.earlyBirdEndsAt, course.timezone)}</p>
            )}
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Schedule</dt>
                <dd>{course.scheduleText || `${course.durationMinutes} minutes`}</dd>
              </div>
              {course.startsAt && (
                <div className="flex gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <dt className="sr-only">Starts</dt>
                  <dd>
                    {formatDateTime(course.startsAt, course.timezone)}
                    <span className="block text-xs text-muted-foreground">Your time: {formatDateTime(course.startsAt)}</span>
                  </dd>
                </div>
              )}
              <div className="flex gap-3">
                <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Language</dt>
                <dd>{course.language}</dd>
              </div>
              <div className="flex gap-3">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Sessions</dt>
                <dd>
                  {course.sessionsCount} {course.sessionsCount === 1 ? 'session' : 'sessions'} · ~{course.weeklyHours} h/week
                </dd>
              </div>
            </dl>
            <div className="mt-5">
              <SeatMeter limit={course.seatLimit} taken={live?.seatsTaken ?? 0} />
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {cta ? (
                <MagneticButton asChild variant="gold" size="lg" className="w-full" strength={0.12}>
                  <Link to={cta.to}>{cta.label}</Link>
                </MagneticButton>
              ) : (
                <Button asChild variant="outline" size="lg">
                  <Link to={routes.subscribe}>Sold out — notify me next time</Link>
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {icsEvent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadText(`${course.slug}.ics`, buildIcs([icsEvent]), 'text/calendar')}
                    title="Download .ics for any calendar"
                  >
                    <CalendarPlus /> Add to calendar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={icsEvent ? '' : 'col-span-2'}
                  onClick={async () => {
                    const url = absUrl(routes.course(course.slug));
                    try {
                      if (navigator.share) await navigator.share({ title: course.title, url });
                      else {
                        await navigator.clipboard.writeText(url);
                        toast.success('Link copied');
                      }
                    } catch {
                      /* share cancelled */
                    }
                  }}
                >
                  <Share2 /> Share
                </Button>
              </div>
              {icsEvent && (
                <a href={googleCalendarUrl(icsEvent)} target="_blank" rel="noopener noreferrer" className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
                  or add to Google Calendar
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
