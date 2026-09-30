import { motion } from 'framer-motion';
import { ArrowRight, Bell, Quote, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo3D } from '@/brand/Logo3D';
import { BRAND } from '@/brand/logoGeometry';
import { useCourseStats, useCourses, useSiteStats, useTeachers, useTestimonials } from '@/data/queries';
import { CourseCard } from '@/features/courses/CourseCard';
import { PetalParticles } from '@/features/experience/Ambient';
import { PathsGrid } from '@/features/experience/PathsGrid';
import { Diya, LotusDivider, Mandala } from '@/features/experience/Sacred';
import { usePreferences } from '@/features/experience/preferences';
import { ScrollStory } from '@/features/experience/ScrollStory';
import { ScriptText, ScriptToggle } from '@/features/experience/ScriptText';
import { SubhashitaCard } from '@/features/experience/SubhashitaCard';
import { routes } from '@/lib/links';
import { SectionHeading } from '@/shared/components/Bits';
import { AnimatedCounter, MagneticButton, Reveal } from '@/shared/components/Motion';
import { PageMeta } from '@/shared/components/PageMeta';
import { CardSkeletons, ErrorState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/overlays';

export const FAQ = [
  {
    q: 'I have never studied Sanskrit. Where do I start?',
    a: 'Start with “Speak Sanskrit in 30 Days” or the self-paced “Devanagari & Pronunciation”. The Find Your Path quiz will point you to the best fit in a minute.',
  },
  {
    q: 'How do I pay?',
    a: 'By UPI from any app. After registering you see a QR code and the exact amount; pay, then paste the 12-digit UTR. We verify it and unlock your access — usually within a few hours.',
  },
  {
    q: 'How will I receive the class link or recordings?',
    a: 'Everything appears in My Learning as soon as your payment is approved. We also send a confirmation by email and WhatsApp, plus reminders before live sessions.',
  },
  {
    q: 'What if I miss a live class?',
    a: 'Hybrid courses include recordings of every session. For live-only courses, teachers share notes and you can join a later cohort at no extra cost.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes — see the refund policy. In short: full refund up to 48 hours before a live course starts, and within 7 days for recorded courses if you have watched under 20%.',
  },
];

function Hero() {
  const { reducedMotion } = usePreferences();
  const fade = (delay: number) =>
    reducedMotion ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const } };
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-12 sm:pt-20" aria-labelledby="hero-title">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 10%, hsl(var(--accent) / 0.18), transparent 70%), radial-gradient(40% 40% at 10% 60%, hsl(var(--glow) / 0.12), transparent 70%)',
        }}
      />
      <PetalParticles className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
      <div className="container flex flex-col items-center text-center">
        <motion.div {...fade(0)} className="relative -mb-2">
          <Mandala className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2 text-primary opacity-25 dark:opacity-30" />
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.28),transparent_65%)] blur-2xl" />
          <Logo3D fit={{ vh: 30, vw: 60, max: 240 }} decorative />
        </motion.div>
        <motion.div {...fade(0.1)}>
          <ScriptToggle />
        </motion.div>
        <motion.p {...fade(0.2)} className="mt-8 text-xl text-accent sm:text-2xl">
          <ScriptText text={{ deva: BRAND.motto.deva, iast: BRAND.motto.iast, en: `“${BRAND.motto.en}”` }} />
        </motion.p>
        <motion.h1 {...fade(0.3)} id="hero-title" className="mt-4 max-w-4xl text-balance text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
          Where knowledge <span className="text-gradient-gold">blooms</span> into wisdom
        </motion.h1>
        <motion.p {...fade(0.45)} className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          Sanskrit and other languages, yoga & meditation, chanting, the meaning of the stotras and the Gītā, and
          sat-saṅga reading — live, recorded or in-person, with warm, expert teachers, all in one serene place.
        </motion.p>
        <motion.div {...fade(0.6)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton asChild variant="gold" size="lg">
            <Link to={routes.courses}>
              Explore courses <ArrowRight />
            </Link>
          </MagneticButton>
          <Button asChild variant="outline" size="lg">
            <Link to={routes.subscribe}>
              <Bell /> Get notified
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to={routes.customApps}>
              <Wand2 /> Request a custom app
            </Link>
          </Button>
        </motion.div>
        <motion.p {...fade(0.8)} className="mt-6 text-sm text-muted-foreground">
          <Diya className="-mt-1 mr-1 inline h-5 w-5 text-saffron-deep" />
          Not sure where to begin?{' '}
          <Link to={routes.finder} className="font-semibold text-foreground underline decoration-accent underline-offset-4">
            Find your path in 60 seconds
          </Link>
        </motion.p>
      </div>
    </section>
  );
}

function FeaturedCourses() {
  const { data, isLoading, error, refetch } = useCourses();
  const { data: stats } = useCourseStats();
  const featured = (data ?? []).filter((c) => c.featured && c.kind === 'course').slice(0, 3);
  return (
    <section className="section container" aria-labelledby="featured-title">
      <SectionHeading id="featured-title" eyebrow="Featured" title="Begin with a favourite" lead="Hand-picked courses our learners love most." />
      {isLoading ? (
        <CardSkeletons />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c, i) => (
            <CourseCard key={c.id} course={c} stats={stats?.[c.id]} index={i} />
          ))}
        </div>
      )}
      <div className="mt-10 flex justify-center">
        <Button asChild variant="outline">
          <Link to={routes.courses}>
            See all courses <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Counters() {
  const { data } = useSiteStats();
  const items = [
    { label: 'Learners', value: data?.learners ?? 0, suffix: '+' },
    { label: 'Courses taught', value: data?.courses ?? 0, suffix: '' },
    { label: 'Countries', value: data?.countries ?? 0, suffix: '' },
    { label: 'Hours of learning', value: data?.hoursTaught ?? 0, suffix: '+' },
  ];
  return (
    <section aria-label="Our impact" className="container">
      <div className="grid grid-cols-2 gap-6 rounded-3xl border bg-card/60 p-8 backdrop-blur sm:p-12 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <p className="font-display text-4xl font-semibold text-gradient-gold sm:text-5xl">
              <AnimatedCounter value={it.value} suffix={it.suffix} />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Teachers() {
  const { data } = useTeachers();
  if (!data?.length) return null;
  return (
    <section className="section container" aria-labelledby="teachers-title">
      <SectionHeading id="teachers-title" eyebrow="Teachers" title="Guided by devoted ācāryas" />
      <div className="grid gap-6 md:grid-cols-3">
        {data.map((t, i) => (
          <Reveal key={t.id} delay={i * 0.08}>
            <div className="h-full rounded-3xl border bg-card p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-saffron-light to-saffron-deep font-display text-2xl text-midnight">
                {t.photoUrl ? <img src={t.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" loading="lazy" /> : t.name.replace(/^(Dr\.|Smt\.|Acharya)\s*/, '')[0]}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{t.name}</h3>
              {t.nameSa && (
                <p lang="sa" className="deva text-sm text-muted-foreground">
                  {t.nameSa}
                </p>
              )}
              <p className="mt-1 text-sm font-medium text-accent">{t.title}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.bio}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const { data } = useTestimonials();
  if (!data?.length) return null;
  return (
    <section className="section" aria-labelledby="testimonials-title">
      <div className="container">
        <SectionHeading id="testimonials-title" eyebrow="Voices" title="What learners say" />
      </div>
      <div className="container">
        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]" tabIndex={0} aria-label="Testimonials, scroll horizontally">
          {data.map((t) => (
            <figure key={t.id} className="w-[85%] shrink-0 snap-center rounded-3xl border bg-card p-7 sm:w-[420px]">
              <Quote className="h-6 w-6 text-accent" aria-hidden />
              <blockquote className="mt-4 text-lg leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold">{t.name}</span> <span className="text-muted-foreground">· {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="section container max-w-3xl" aria-labelledby="faq-title">
      <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions, answered" />
      <Accordion type="single" collapsible className="rounded-3xl border bg-card px-6">
        {FAQ.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`}>
            <AccordionTrigger className="text-base">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <PageMeta
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: BRAND.name,
          alternateName: BRAND.nameDeva,
          slogan: BRAND.tagline,
          description: 'Authentic, joyful learning: Sanskrit & languages, yoga & meditation, chanting, meaning of the texts and sat-saṅga — live, recorded and in-person.',
        }}
      />
      <Hero />
      <ScrollStory />
      <PathsGrid />
      <LotusDivider />
      <FeaturedCourses />
      <section className="container" aria-label="Subhashita of the day">
        <SubhashitaCard />
      </section>
      <LotusDivider className="pt-16" />
      <Teachers />
      <Counters />
      <Testimonials />
      <LotusDivider />
      <Faq />
    </>
  );
}
