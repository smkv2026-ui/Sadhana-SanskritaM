import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCourses, useTaxonomy } from '@/data/queries';
import type { CategoryId } from '@/data/taxonomy';
import { routes } from '@/lib/links';
import { SectionHeading } from '@/shared/components/Bits';
import { TiltCard } from '@/shared/components/Motion';
import { Mandala } from './Sacred';

/** Each path gets its own jewel tone (works on both dawn and dusk themes). */
const HUE: Record<CategoryId, string> = {
  language: '42 85% 58%',
  yoga: '152 45% 48%',
  chanting: '18 85% 60%',
  meaning: '265 55% 66%',
  reading: '205 75% 60%',
};

/** "Explore by path" — the five categories as glowing, tilting cards on the home page. */
export function PathsGrid() {
  const taxonomy = useTaxonomy();
  const { data } = useCourses();
  const count = (id: string) => (data ?? []).filter((c) => c.status === 'published' && c.category === id).length;

  return (
    <section className="section container" aria-labelledby="paths-title">
      <SectionHeading id="paths-title" eyebrow="पन्थाः · Paths" title="Choose your path of sādhanā" lead="Five streams, one source. Live, recorded or in-person — go at the pace your practice asks for." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {taxonomy.categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={i < 3 ? 'lg:col-span-2' : 'lg:col-span-3'}
          >
            <TiltCard className="h-full rounded-3xl" max={6}>
              <Link
                to={`${routes.courses}?cat=${cat.id}`}
                className="path-card shimmer-border group/path relative flex h-full min-h-[15rem] flex-col overflow-hidden rounded-3xl border bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ '--path': HUE[cat.id] } as React.CSSProperties}
              >
                <Mandala className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 text-[hsl(var(--path))] opacity-[0.16] transition-opacity duration-500 group-hover/path:opacity-40" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="path-medallion grid h-14 w-14 place-items-center rounded-2xl text-3xl" aria-hidden>
                    {cat.emoji}
                  </span>
                  <span className="rounded-full border bg-background/60 px-2.5 py-1 text-xs tabular-nums text-muted-foreground backdrop-blur">
                    {count(cat.id)} {count(cat.id) === 1 ? 'offering' : 'offerings'}
                  </span>
                </div>
                <p lang="sa" className="deva relative mt-5 text-lg text-[hsl(var(--path))]">
                  {cat.labelSa}
                </p>
                <h3 className="relative font-display text-2xl font-semibold">{cat.label}</h3>
                <p className="relative mt-1 text-sm text-muted-foreground">{cat.blurb}</p>
                <ul className="relative mt-4 flex flex-wrap gap-1.5">
                  {cat.subs.slice(0, 5).map((s) => (
                    <li key={s.id} className="rounded-full bg-muted/70 px-2.5 py-1 text-xs">
                      {s.label}
                    </li>
                  ))}
                  {cat.subs.length > 5 && <li className="rounded-full px-2 py-1 text-xs text-muted-foreground">+{cat.subs.length - 5} more</li>}
                </ul>
                <span className="relative mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-[hsl(var(--path))]">
                  Enter this path <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/path:-translate-y-0.5 group-hover/path:translate-x-0.5" />
                </span>
              </Link>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
