import { isCategorySlug } from '@/data/taxonomy';
import type { CategoryId, Course, CourseStats, CourseType, Level } from '@/data/types';

export type SortKey = 'recommended' | 'soonest' | 'price-asc' | 'price-desc';

export interface CourseFilter {
  q: string;
  type: CourseType | 'all';
  level: Level | 'all';
  kind: 'all' | 'course' | 'event';
  sort: SortKey;
  /** Taxonomy drill-down: category → sub-category → variant ('' = any). */
  cat: CategoryId | 'all';
  sub: string;
  variant: string;
}

export const DEFAULT_FILTER: CourseFilter = { q: '', type: 'all', level: 'all', kind: 'all', sort: 'recommended', cat: 'all', sub: '', variant: '' };

function effectivePrice(c: Course, now: number): number {
  return c.earlyBirdPriceInr !== null && c.earlyBirdEndsAt && now < new Date(c.earlyBirdEndsAt).getTime() ? c.earlyBirdPriceInr : c.priceInr;
}

function matchesQuery(c: Course, q: string): boolean {
  if (!q.trim()) return true;
  const hay = `${c.title} ${c.titleSa ?? ''} ${c.summary} ${c.tags.join(' ')} ${c.level} ${c.type} ${c.category ?? ''} ${c.subcategory ?? ''} ${c.variant ?? ''}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return q
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export function filterCourses(courses: Course[], f: CourseFilter, _stats?: Record<string, CourseStats>, now = Date.now()): Course[] {
  const list = courses.filter(
    (c) =>
      c.status === 'published' &&
      (f.type === 'all' || c.type === f.type) &&
      (f.level === 'all' || c.level === f.level) &&
      (f.kind === 'all' || c.kind === f.kind) &&
      (f.cat === 'all' || c.category === f.cat) &&
      (!f.sub || c.subcategory === f.sub) &&
      (!f.variant || c.variant === f.variant) &&
      matchesQuery(c, f.q),
  );
  const start = (c: Course) => (c.startsAt ? new Date(c.startsAt).getTime() : Number.MAX_SAFE_INTEGER);
  switch (f.sort) {
    case 'soonest':
      return list.sort((a, b) => start(a) - start(b));
    case 'price-asc':
      return list.sort((a, b) => effectivePrice(a, now) - effectivePrice(b, now));
    case 'price-desc':
      return list.sort((a, b) => effectivePrice(b, now) - effectivePrice(a, now));
    default:
      return list.sort((a, b) => Number(b.featured) - Number(a.featured) || start(a) - start(b));
  }
}

export function filterFromSearch(search: string): CourseFilter {
  const p = new URLSearchParams(search);
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const v = p.get(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  };
  return {
    q: p.get('q') ?? '',
    type: pick('type', ['all', 'live', 'recorded', 'hybrid', 'in-person'] as const, 'all'),
    level: pick('level', ['all', 'beginner', 'intermediate', 'advanced'] as const, 'all'),
    kind: pick('kind', ['all', 'course', 'event'] as const, 'all'),
    sort: pick('sort', ['recommended', 'soonest', 'price-asc', 'price-desc'] as const, 'recommended'),
    cat: isCategorySlug(p.get('cat') ?? '') ? (p.get('cat') as string) : 'all',
    sub: (p.get('sub') ?? '').replace(/[^a-z0-9-]/g, '').slice(0, 40),
    variant: (p.get('variant') ?? '').slice(0, 60),
  };
}

export function filterToSearch(f: CourseFilter): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.cat !== 'all') p.set('cat', f.cat);
  if (f.cat !== 'all' && f.sub) p.set('sub', f.sub);
  if (f.cat !== 'all' && f.sub && f.variant) p.set('variant', f.variant);
  (['type', 'level', 'kind'] as const).forEach((k) => f[k] !== 'all' && p.set(k, f[k]));
  if (f.sort !== 'recommended') p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}
