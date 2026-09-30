import { motion, useInView, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarHeart, CreditCard, Mail, PlayCircle, Radio, Search, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/brand/Logo';
import { routes } from '@/lib/links';
import { clamp, cn } from '@/lib/utils';
import { MagneticButton } from '@/shared/components/Motion';
import { Button } from '@/shared/ui/button';
import { usePreferences } from './preferences';
import { ScriptText, type Trilingual } from './ScriptText';

const VALUES: { text: Trilingual; body: string }[] = [
  { text: { deva: 'विद्या', iast: 'vidyā', en: 'Knowledge' }, body: 'Authentic sources, taught with clarity and rigour.' },
  { text: { deva: 'श्रद्धा', iast: 'śraddhā', en: 'Trust' }, body: 'A patient, respectful space for every learner.' },
  { text: { deva: 'अभ्यासः', iast: 'abhyāsaḥ', en: 'Practice' }, body: 'Small daily steps that compound into fluency.' },
  { text: { deva: 'सेवा', iast: 'sevā', en: 'Service' }, body: 'Keeping a living tradition open to all.' },
];

const OFFERINGS = [
  { icon: Radio, title: 'Live cohorts', body: 'Interactive evenings with a teacher and a warm peer group.' },
  { icon: PlayCircle, title: 'Recorded courses', body: 'Beautifully produced lessons you can take at your own pace.' },
  { icon: CalendarHeart, title: 'Events & workshops', body: 'Satsangs, reading circles and festival specials.' },
  { icon: Wand2, title: 'Custom apps', body: 'We design learning apps and sites for institutions.' },
];

const STEPS = [
  { icon: Search, title: 'Discover', body: 'Take the 1-minute quiz or browse the catalogue.' },
  { icon: BookOpen, title: 'Register', body: 'Reserve your seat in under a minute.' },
  { icon: CreditCard, title: 'Pay by UPI', body: 'Scan, pay, paste your UTR — no card needed.' },
  { icon: ShieldCheck, title: 'Unlocked', body: 'Verified quickly; your class link or recordings appear in My Learning.' },
];

function Chapter({ index, eyebrow, title, children, onActive }: { index: number; eyebrow: string; title: ReactNode; children: ReactNode; onActive: (i: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  return (
    <section ref={ref} aria-labelledby={`chapter-${index}`} className="flex min-h-[85svh] items-center py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <p className="eyebrow">
          {String(index + 1).padStart(2, '0')} · {eyebrow}
        </p>
        <h2 id={`chapter-${index}`} className="mt-3 text-balance text-3xl font-semibold sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </motion.div>
    </section>
  );
}

const CHAPTERS = ['Vision', 'Values', 'Offerings', 'How it works', 'Begin'];

/**
 * The home page journey: a pinned lotus opens petal-by-petal as the visitor scrolls through
 * Vision → Values → Offerings → How it works, and its diamond glints at the final call to action.
 */
export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lotusRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [glint, setGlint] = useState(false);
  const { reducedMotion } = usePreferences();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start 60%', 'end 80%'] });

  const apply = (p: number) => {
    const el = lotusRef.current;
    if (!el) return;
    const layers = reducedMotion ? [1, 1, 1, 1] : [0, 1, 2, 3].map((l) => clamp((p - l * 0.17) / 0.2, 0, 1));
    layers.forEach((v, l) => el.style.setProperty(`--b${l}`, v.toFixed(3)));
    el.style.setProperty('--halo', (reducedMotion ? 1 : clamp(p * 1.4, 0, 1)).toFixed(3));
  };

  useMotionValueEvent(scrollYProgress, 'change', apply);
  useEffect(() => apply(scrollYProgress.get()));

  const onActive = (i: number) => {
    setActive(i);
    if (i === CHAPTERS.length - 1) setGlint(true);
  };

  useEffect(() => {
    if (!glint) return;
    const t = setTimeout(() => setGlint(false), 1600);
    return () => clearTimeout(t);
  }, [glint]);

  return (
    <div ref={containerRef} className="relative">
      <div className="container relative md:grid md:grid-cols-2 md:gap-12">
        {/* Pinned lotus */}
        <div
          ref={lotusRef}
          aria-hidden
          className="pointer-events-none sticky top-16 z-0 -mb-[70svh] flex h-[70svh] items-center justify-center overflow-hidden opacity-25 md:mb-0 md:h-[calc(100svh-4rem)] md:self-start md:overflow-visible md:opacity-100"
        >
          <div className="relative">
            <div
              className="absolute inset-0 -z-10 scale-150 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, hsl(var(--glow) / 0.35), transparent 65%)', opacity: 'var(--halo, 0)' as unknown as number }}
            />
            <LogoMark size={420} bloomControlled decorative className={cn('h-[min(56svh,440px)] w-auto max-w-[80vw] md:max-w-full', glint && 'do-glint')} />
          </div>
          <ol className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 gap-2 md:flex" aria-label="Story progress">
            {CHAPTERS.map((c, i) => (
              <li key={c} className={cn('h-1.5 rounded-full transition-all duration-500', i === active ? 'w-8 bg-accent' : 'w-1.5 bg-border')} title={c} />
            ))}
          </ol>
        </div>

        <div className="relative z-10">
          <Chapter index={0} eyebrow="Vision & mission" title={<>A living tradition, taught with joy</>} onActive={onActive}>
            <p className="text-lg text-muted-foreground">
              <strong className="text-foreground">Vision:</strong> a world where anyone, anywhere, can open a Sanskrit text and feel it speak to them.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">
              <strong className="text-foreground">Mission:</strong> to make authentic Sanskrit learning joyful, accessible and rigorous — from your first
              akṣara to reading the Gītā in the original.
            </p>
          </Chapter>

          <Chapter index={1} eyebrow="Our values" title="Four petals we grow from" onActive={onActive}>
            <div className="grid gap-4 sm:grid-cols-2">
              {VALUES.map((v, i) => (
                <motion.div
                  key={v.text.en}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-5"
                >
                  <ScriptText text={v.text} className="font-display text-2xl text-accent" />
                  <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Tip: switch between Devanāgarī, IAST and meaning in the hero toggle.</p>
          </Chapter>

          <Chapter index={2} eyebrow="Offerings" title="Many paths, one lotus" onActive={onActive}>
            <div className="grid gap-4 sm:grid-cols-2">
              {OFFERINGS.map((o, i) => (
                <motion.div
                  key={o.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-5"
                >
                  <o.icon className="h-6 w-6 text-accent" aria-hidden />
                  <p className="mt-3 font-display text-lg font-semibold">{o.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
                </motion.div>
              ))}
            </div>
          </Chapter>

          <Chapter index={3} eyebrow="How it works" title="From curiosity to class in four steps" onActive={onActive}>
            <ol className="relative ml-4 space-y-6 border-l border-accent/40 pl-8">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <span className="absolute -left-[46px] flex h-9 w-9 items-center justify-center rounded-full border bg-background text-accent">
                    <s.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="font-display text-lg font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </motion.li>
              ))}
            </ol>
          </Chapter>

          <Chapter index={4} eyebrow="Begin" title={<>Your sādhana starts <span className="text-gradient-gold">today</span></>} onActive={onActive}>
            <p className="text-lg text-muted-foreground">Take the first step — the lotus opens one petal at a time.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <MagneticButton asChild variant="gold" size="lg">
                <Link to={routes.courses}>
                  Explore courses <ArrowRight />
                </Link>
              </MagneticButton>
              <Button asChild variant="outline" size="lg">
                <Link to={routes.finder}>
                  <Sparkles /> Find your path
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to={routes.subscribe}>
                  <Mail /> Get notified
                </Link>
              </Button>
            </div>
          </Chapter>
        </div>
      </div>
    </div>
  );
}
