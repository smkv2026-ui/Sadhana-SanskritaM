import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCourseStats, useCourses, useTaxonomy } from '@/data/queries';
import { findCategory } from '@/data/taxonomy';
import { routes } from '@/lib/links';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/shared/components/PageMeta';
import { CardSkeletons, EmptyState, ErrorState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Input, NativeSelect } from '@/shared/ui/primitives';
import { CategoryNav } from './CategoryNav';
import { CourseCard } from './CourseCard';
import { DEFAULT_FILTER, filterCourses, filterFromSearch, filterToSearch, type CourseFilter } from './courseFilters';

function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'border-transparent text-primary-foreground' : 'hover:border-accent',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`chip-${label}`} className="absolute inset-0 -z-10 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const filter = useMemo(() => filterFromSearch(location.search), [location.search]);
  const { data, isLoading, error, refetch } = useCourses();
  const { data: stats } = useCourseStats();
  const taxonomy = useTaxonomy();
  const activeCat = findCategory(taxonomy, filter.cat);
  const results = useMemo(() => filterCourses(data ?? [], filter, stats), [data, filter, stats]);

  const set = (patch: Partial<CourseFilter>) =>
    navigate({ pathname: routes.courses, search: filterToSearch({ ...filter, ...patch }) }, { replace: true, preventScrollReset: true });
  const dirty = filterToSearch(filter) !== '';

  return (
    <div className="container py-12 sm:py-16">
      <PageMeta title="Courses" description="Explore live, recorded and in-person courses in Sanskrit and other languages, yoga & meditation, chanting, meaning of the texts and scripture reading (sat-saṅga)." path={routes.courses} />
      <header className="max-w-3xl">
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{activeCat ? `${activeCat.label} paths` : 'Explore courses & events'}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {activeCat?.blurb ||
            `${taxonomy.categories.map((c) => c.label).join(' · ')} — choose a path, then live, recorded or in-person.`}
        </p>
      </header>

      <div className="mt-8">
        <CategoryNav taxonomy={taxonomy} courses={data ?? []} filter={filter} onChange={set} />
      </div>

      <div className="z-20 -mx-4 mt-6 border-b bg-background/85 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-16">
        <LayoutGroup>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <label htmlFor="course-search" className="sr-only">
                Search courses
              </label>
              <Input
                id="course-search"
                type="search"
                value={filter.q}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Search “gita”, “chanting”, “kids”…"
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
              <label htmlFor="course-sort" className="sr-only">
                Sort
              </label>
              <NativeSelect id="course-sort" value={filter.sort} onChange={(e) => set({ sort: e.target.value as CourseFilter['sort'] })} className="w-full sm:w-48">
                <option value="recommended">Recommended</option>
                <option value="soonest">Starting soonest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </NativeSelect>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
            <Chips
              label="Kind"
              value={filter.kind}
              onChange={(kind) => set({ kind })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'course', label: 'Courses' },
                { value: 'event', label: 'Events' },
              ]}
            />
            <Chips
              label="Format"
              value={filter.type}
              onChange={(type) => set({ type })}
              options={[
                { value: 'all', label: 'Any format' },
                { value: 'live', label: 'Live' },
                { value: 'recorded', label: 'Recorded' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'in-person', label: 'In-person' },
              ]}
            />
            <Chips
              label="Level"
              value={filter.level}
              onChange={(level) => set({ level })}
              options={[
                { value: 'all', label: 'Any level' },
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
            />
            {dirty && (
              <Button variant="ghost" size="sm" onClick={() => navigate({ search: filterToSearch(DEFAULT_FILTER) }, { replace: true })}>
                <X /> Clear
              </Button>
            )}
          </div>
        </LayoutGroup>
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {isLoading ? 'Loading…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
      </p>

      <div className="mt-4">
        {isLoading ? (
          <CardSkeletons count={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : results.length === 0 ? (
          <EmptyState
            title="No matching courses"
            description="Try a different filter — or subscribe and we’ll tell you when something new opens."
            action={
              <Button onClick={() => navigate(routes.subscribe)} variant="outline">
                Get notified
              </Button>
            }
          />
        ) : (
          <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {results.map((c, i) => (
                <CourseCard key={c.id} course={c} stats={stats?.[c.id]} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
