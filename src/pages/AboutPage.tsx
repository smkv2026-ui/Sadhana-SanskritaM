import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo3D } from '@/brand/Logo3D';
import { BRAND } from '@/brand/logoGeometry';
import { useTeachers } from '@/data/queries';
import { ScriptText } from '@/features/experience/ScriptText';
import { routes } from '@/lib/links';
import { Reveal } from '@/shared/components/Motion';
import { PageMeta } from '@/shared/components/PageMeta';
import { Button } from '@/shared/ui/button';

const SYMBOLS = [
  { part: 'The open book', meaning: 'Knowledge — the śāstra, open to everyone who seeks.' },
  { part: 'The rising stem', meaning: 'Sādhana — steady practice that grows day by day.' },
  { part: 'The white lotus', meaning: 'Purity — wisdom that blooms untouched by the mud it rises from.' },
  { part: 'The diamond', meaning: 'Realised wisdom — clear, brilliant and unbreakable.' },
];

export default function AboutPage() {
  const { data: teachers } = useTeachers();
  return (
    <div className="container py-12 sm:py-16">
      <PageMeta title="About" description="Our story, our mark and the teachers behind Sadhana Sanskritam." path={routes.about} />
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow">About us</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">Sanskrit is not a relic. It is a lotus still blooming.</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            {BRAND.name} began as a small study circle of friends who wanted to read the texts they loved in the original. Today we are a
            community of learners across the world, taught by teachers who combine traditional rigour with modern, joyful pedagogy.
          </p>
          <p className="mt-4 text-lg">
            <ScriptText text={{ deva: BRAND.motto.deva, iast: BRAND.motto.iast, en: BRAND.motto.en }} className="text-accent" />
          </p>
        </Reveal>
        <Reveal delay={0.1} className="flex justify-center">
          <div className="flex flex-col items-center text-center">
            <Logo3D fit={{ vh: 44, vw: 80, max: 360 }} />
            <p className="mt-2 font-display text-3xl font-semibold">{BRAND.name}</p>
            <p lang="sa" className="deva text-lg text-accent">
              {BRAND.nameDeva}
            </p>
            <p className="mt-1 text-sm italic text-muted-foreground">{BRAND.tagline}</p>
          </div>
        </Reveal>
      </div>

      <section className="mt-24" aria-labelledby="mark">
        <h2 id="mark" className="text-3xl font-semibold">What our mark means</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SYMBOLS.map((s, i) => (
            <Reveal key={s.part} delay={i * 0.06}>
              <div className="h-full rounded-3xl border bg-card p-6">
                <p className="font-display text-xl font-semibold">{s.part}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.meaning}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {teachers && teachers.length > 0 && (
        <section className="mt-24" aria-labelledby="team">
          <h2 id="team" className="text-3xl font-semibold">Teachers & team</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {teachers.map((t) => (
              <div key={t.id} className="rounded-3xl border bg-card p-6">
                <p className="font-display text-xl font-semibold">{t.name}</p>
                <p className="text-sm text-accent">{t.title}</p>
                <p className="mt-3 text-sm text-muted-foreground">{t.bio}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-20 flex flex-wrap justify-center gap-3">
        <Button asChild variant="gold" size="lg">
          <Link to={routes.courses}>
            Explore courses <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to={routes.contact}>Get in touch</Link>
        </Button>
      </div>
    </div>
  );
}
