import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Clock, MapPin, PlayCircle, Radio, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTaxonomy } from '@/data/queries';
import { findCategory, findSub } from '@/data/taxonomy';
import type { Course, CourseStats } from '@/data/types';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/links';
import { computePrice, formatInr } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { SeatMeter } from '@/shared/components/Bits';
import { TiltCard } from '@/shared/components/Motion';
import { Badge } from '@/shared/ui/primitives';

export const TYPE_META = {
  live: { label: 'Live', icon: Radio },
  recorded: { label: 'Recorded', icon: PlayCircle },
  hybrid: { label: 'Hybrid', icon: Users },
  'in-person': { label: 'In-person', icon: MapPin },
} as const;

export function CourseCover({ course, className }: { course: Course; className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl', className)}
      style={{
        background: course.coverImage
          ? `center/cover no-repeat url(${JSON.stringify(course.coverImage)})`
          : `radial-gradient(120% 90% at 20% 10%, ${course.accent}55, transparent 60%), linear-gradient(135deg, #16295C, #0A1633)`,
      }}
    >
      {!course.coverImage && (
        <>
          <svg aria-hidden viewBox="0 0 200 120" className="absolute -right-6 -top-4 h-36 w-56 opacity-20" fill="none" stroke={course.accent} strokeWidth="0.8">
            {Array.from({ length: 7 }, (_, i) => (
              <circle key={i} cx="150" cy="30" r={12 + i * 11} />
            ))}
          </svg>
          <p lang="sa" className="deva absolute bottom-3 left-4 right-4 truncate text-3xl text-pearl/95 drop-shadow">
            {course.titleSa || course.title}
          </p>
        </>
      )}
    </div>
  );
}

export function CourseCard({ course, stats, index = 0 }: { course: Course; stats?: CourseStats; index?: number }) {
  const price = computePrice(course);
  const Type = TYPE_META[course.type] ?? TYPE_META.live;
  const taxonomy = useTaxonomy();
  const cat = findCategory(taxonomy, course.category);
  const sub = findSub(taxonomy, course.category, course.subcategory);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04 }}
      className="h-full"
    >
      <TiltCard className="h-full rounded-3xl">
        <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-4 shadow-sm transition-shadow duration-300 hover:shadow-glow">
          <CourseCover course={course} className="h-36" />
          {cat && (
            <p className="mt-4 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              <span aria-hidden>{cat.emoji}</span>
              <span className="truncate">
                {cat.label}
                {sub ? ` · ${sub.label}` : ''}
                {course.variant ? ` · ${course.variant}` : ''}
              </span>
            </p>
          )}
          <div className={cn('flex flex-wrap items-center gap-1.5', cat ? 'mt-2' : 'mt-4')}>
            <Badge variant={course.type === 'recorded' ? 'diamond' : 'gold'}>
              <Type.icon className="h-3 w-3" aria-hidden /> {Type.label}
            </Badge>
            <Badge variant="muted" className="capitalize">
              {course.level}
            </Badge>
            {course.kind === 'event' && <Badge variant="outline">Event</Badge>}
            {price.earlyBird && <Badge variant="success">Early bird</Badge>}
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold leading-snug">
            <Link to={routes.course(course.slug)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {course.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>

          {/* Hover preview: outcomes slide up on pointer devices */}
          <div className="pointer-events-none absolute inset-x-4 top-4 hidden h-36 translate-y-2 flex-col justify-end rounded-2xl bg-midnight/85 p-4 text-pearl opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-saffron-light">You will</p>
            <ul className="mt-1.5 space-y-1 text-[13px] leading-snug">
              {course.outcomes.slice(0, 3).map((o) => (
                <li key={o} className="line-clamp-1">
                  · {o}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {course.type === 'recorded' ? 'Start anytime' : formatDate(course.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {course.sessionsCount > 1 ? `${course.sessionsCount} sessions` : `${course.durationMinutes} min`}
            </span>
          </div>
          <div className="mt-auto pt-5">
            {course.seatLimit > 0 && (
              <div className="mb-4">
                <SeatMeter limit={course.seatLimit} taken={stats?.seatsTaken ?? 0} compact />
              </div>
            )}
            <div className="flex items-end justify-between">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold">{formatInr(price.total)}</span>
                {price.earlyBird && <span className="text-sm text-muted-foreground line-through">{formatInr(course.priceInr)}</span>}
              </p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground">
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.article>
  );
}
