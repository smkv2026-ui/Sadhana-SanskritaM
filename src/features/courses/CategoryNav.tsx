import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import type { Taxonomy } from '@/data/taxonomy';
import type { Course } from '@/data/types';
import { cn } from '@/lib/utils';
import type { CourseFilter } from './courseFilters';

/**
 * Three-step drill-down: category tiles → sub-category chips → option chips
 * (e.g. Yoga → Ashtanga Yoga → Theory + Practical). Counts come from published courses.
 */
export function CategoryNav({
  taxonomy,
  courses,
  filter,
  onChange,
}: {
  taxonomy: Taxonomy;
  courses: Course[];
  filter: CourseFilter;
  onChange: (patch: Partial<CourseFilter>) => void;
}) {
  const published = useMemo(() => courses.filter((c) => c.status === 'published'), [courses]);
  const count = (pred: (c: Course) => boolean) => published.filter(pred).length;
  const cat = taxonomy.categories.find((c) => c.id === filter.cat);
  const sub = cat?.subs.find((s) => s.id === filter.sub);

  return (
    <nav aria-label="Browse by path" className="space-y-3">
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        <CatTile active={filter.cat === 'all'} onClick={() => onChange({ cat: 'all', sub: '', variant: '' })} emoji="✨" label="All paths" sa="सर्वम्" n={published.length} />
        {taxonomy.categories.map((c) => (
          <CatTile
            key={c.id}
            active={filter.cat === c.id}
            onClick={() => onChange({ cat: c.id, sub: '', variant: '' })}
            emoji={c.emoji}
            label={c.label}
            sa={c.labelSa}
            n={count((x) => x.category === c.id)}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {cat && (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">{cat.blurb}</p>
            <div role="radiogroup" aria-label={`${cat.label} options`} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <SubChip active={!filter.sub} onClick={() => onChange({ sub: '', variant: '' })} label={`All ${cat.label}`} />
              {cat.subs.map((s) => {
                const n = count((x) => x.category === cat.id && x.subcategory === s.id);
                return <SubChip key={s.id} active={filter.sub === s.id} onClick={() => onChange({ sub: s.id, variant: '' })} label={s.label} n={n} />;
              })}
            </div>
            <AnimatePresence initial={false}>
              {sub?.variants?.length ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="radiogroup"
                  aria-label={`${sub.label} format`}
                  className="flex flex-wrap items-center gap-1.5 overflow-hidden pl-1"
                >
                  <span className="mr-1 text-xs uppercase tracking-wider text-muted-foreground">Option</span>
                  <SubChip small active={!filter.variant} onClick={() => onChange({ variant: '' })} label="Any" />
                  {sub.variants.map((v) => (
                    <SubChip key={v} small active={filter.variant === v} onClick={() => onChange({ variant: v })} label={v} />
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function CatTile({ active, onClick, emoji, label, sa, n }: { active: boolean; onClick: () => void; emoji: string; label: string; sa: string; n: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shimmer-border group relative flex min-w-[8.5rem] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow sm:min-w-0',
        active ? 'border-primary/60 bg-primary/10 shadow-glow' : 'bg-card/70 hover:border-primary/40',
      )}
    >
      {active && <motion.span layoutId="cat-glow" className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
      <span className="relative text-2xl transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-125" aria-hidden>
        {emoji}
      </span>
      <span className="relative min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="deva block truncate text-xs text-muted-foreground" lang="sa">
          {sa} · {n}
        </span>
      </span>
    </button>
  );
}

function SubChip({ active, onClick, label, n, small }: { active: boolean; onClick: () => void; label: string; n?: number; small?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border font-medium transition-all duration-200',
        small ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
        active ? 'border-transparent bg-primary text-primary-foreground shadow-glow' : 'hover:border-accent hover:bg-accent/5',
        n === 0 && !active && 'opacity-60',
      )}
    >
      {label}
      {n !== undefined && <span className={cn('ml-1.5 text-xs tabular-nums', active ? 'opacity-80' : 'text-muted-foreground')}>{n}</span>}
    </button>
  );
}
