import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogoMark } from '@/brand/Logo';
import { useCourses } from '@/data/queries';
import { usePreferences } from '@/features/experience/preferences';
import { absUrl, routes } from '@/lib/links';
import { computePrice, formatInr } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/shared/components/PageMeta';
import { EmptyState, PageLoader } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/primitives';
import { CourseCover } from '../courses/CourseCard';
import { QUESTIONS, decodeAnswers, encodeAnswers, recommend, type FinderAnswers } from './finderLogic';

export default function FinderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const shared = useMemo(() => decodeAnswers(location.search), [location.search]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<FinderAnswers>>({});
  const [dir, setDir] = useState(1);
  const { data: courses, isLoading } = useCourses();
  const { reducedMotion, feedback } = usePreferences();

  const done = shared !== null;
  const results = useMemo(() => (shared && courses ? recommend(courses, shared) : []), [shared, courses]);

  useEffect(() => {
    if (!shared) {
      setStep(0);
      setAnswers({});
    }
  }, [shared]);

  const q = QUESTIONS[step];
  const choose = (value: string) => {
    feedback();
    const next = { ...answers, [q.key]: value } as Partial<FinderAnswers>;
    setAnswers(next);
    setDir(1);
    if (step < QUESTIONS.length - 1) setTimeout(() => setStep(step + 1), reducedMotion ? 0 : 180);
    else navigate({ search: `?${encodeAnswers(next as FinderAnswers)}` });
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reducedMotion ? 0 : d * 60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reducedMotion ? 0 : d * -60 }),
  };

  return (
    <div className="container max-w-4xl py-12 sm:py-16">
      <PageMeta title="Find your path" description="A 1-minute quiz that recommends the right Sanskrit course for your level, goals, time and format." path={routes.finder} />
      <header className="text-center">
        <LogoMark size={64} compact decorative className="mx-auto" />
        <p className="eyebrow mt-4">Find your path</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{done ? 'Your path is ready' : 'Five questions. One lotus.'}</h1>
      </header>

      {!done && (
        <div className="mt-10">
          <div className="mx-auto flex max-w-md items-center gap-2" aria-hidden>
            {QUESTIONS.map((qq, i) => (
              <span key={qq.key} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-accent' : 'bg-muted')} />
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <div className="relative mt-8 min-h-[380px] overflow-hidden">
            <AnimatePresence custom={dir} mode="wait" initial={false}>
              <motion.fieldset key={q.key} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <legend className="w-full text-center font-display text-2xl font-semibold sm:text-3xl">{q.title}</legend>
                <div className={cn('mt-8 grid gap-3', q.options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                  {q.options.map((o) => {
                    const selected = answers[q.key] === o.value;
                    return (
                      <motion.button
                        key={o.value}
                        type="button"
                        whileHover={reducedMotion ? undefined : { y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => choose(o.value)}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-accent',
                          selected && 'border-accent bg-accent/10',
                        )}
                      >
                        <span className="text-3xl" aria-hidden>
                          {o.emoji}
                        </span>
                        <span className="flex-1">
                          <span className="block font-semibold">{o.label}</span>
                          <span className="block text-sm text-muted-foreground">{o.hint}</span>
                        </span>
                        {selected && <Check className="h-5 w-5 text-accent" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.fieldset>
            </AnimatePresence>
          </div>
          {step > 0 && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setDir(-1);
                  setStep(step - 1);
                }}
              >
                <ArrowLeft /> Back
              </Button>
            </div>
          )}
        </div>
      )}

      {done &&
        (isLoading ? (
          <PageLoader />
        ) : results.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Nothing open matches right now"
              description="Subscribe with your interests and we’ll tell you the moment a matching course opens."
              action={<Button asChild><Link to={routes.subscribe}>Get notified</Link></Button>}
            />
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            {results.map((r, i) => {
              const price = computePrice(r.course);
              return (
                <motion.article
                  key={r.course.id}
                  initial={{ opacity: 0, y: 30, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.15, type: 'spring', stiffness: 180, damping: 20 }}
                  className={cn('grid gap-5 rounded-3xl border bg-card p-5 sm:grid-cols-[200px_1fr] sm:p-6', i === 0 && 'border-accent shadow-glow')}
                >
                  <CourseCover course={r.course} className="h-32 sm:h-full" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {i === 0 && (
                        <Badge variant="gold">
                          <Sparkles className="h-3 w-3" /> Best match
                        </Badge>
                      )}
                      <Badge variant="muted">{r.match}% match</Badge>
                      <Badge variant="outline" className="capitalize">
                        {r.course.type}
                      </Badge>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-semibold">{r.course.title}</h2>
                    <p className="mt-2 text-sm font-medium text-accent">Why this fits you</p>
                    <ul className="mt-1 space-y-1 text-[15px]">
                      {r.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden /> {reason}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button asChild>
                        <Link to={routes.course(r.course.slug)}>
                          View course <ArrowRight />
                        </Link>
                      </Button>
                      <span className="font-display text-xl">{formatInr(price.total)}</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
            <div className="flex flex-wrap justify-center gap-3 pt-6">
              <Button
                variant="outline"
                onClick={async () => {
                  const url = absUrl(`${routes.finder}${location.search}`);
                  try {
                    if (navigator.share) await navigator.share({ title: 'My Sanskrit path', url });
                    else {
                      await navigator.clipboard.writeText(url);
                      toast.success('Result link copied — share it with a friend!');
                    }
                  } catch {
                    /* cancelled */
                  }
                }}
              >
                <Share2 /> Share my result
              </Button>
              <Button variant="ghost" onClick={() => navigate({ search: '' })}>
                <RotateCcw /> Retake quiz
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
