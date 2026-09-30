import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { backend } from './index';
import { DEFAULT_TAXONOMY, mergeTaxonomy, type Taxonomy } from './taxonomy';
import type { Course, CourseStats, Registration } from './types';

/**
 * TanStack Query hooks. Long stale times + persistent Firestore cache keep reads low
 * (see docs/FIRESTORE_BUDGET.md). Real-time listeners are used ONLY for seat counts and
 * for the one registration a learner is paying for (plus the admin verification queue).
 */
const MIN = 60_000;

export const qk = {
  courses: ['courses'] as const,
  coursesAdmin: ['courses', 'admin'] as const,
  course: (slug: string) => ['course', slug] as const,
  stats: ['courseStats'] as const,
  teachers: ['teachers'] as const,
  testimonials: ['testimonials'] as const,
  subhashitas: ['subhashitas'] as const,
  siteStats: ['siteStats'] as const,
  settings: ['settings'] as const,
  taxonomy: ['taxonomy'] as const,
  myRegs: (uid: string) => ['myRegistrations', uid] as const,
  myRequests: (uid: string) => ['myCustomRequests', uid] as const,
};

type Opts<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;

export function useCourses(opts?: Opts<Course[]>) {
  return useQuery({ queryKey: qk.courses, queryFn: async () => (await backend()).listCourses(), staleTime: 10 * MIN, ...opts });
}

export function useCourse(slug: string | undefined) {
  return useQuery({
    queryKey: qk.course(slug ?? ''),
    queryFn: async () => (await backend()).getCourseBySlug(slug as string),
    enabled: Boolean(slug),
    staleTime: 10 * MIN,
  });
}

export function useCourseStats() {
  return useQuery({
    queryKey: qk.stats,
    queryFn: async () => {
      const list = await (await backend()).listCourseStats();
      return Object.fromEntries(list.map((s) => [s.courseId, s])) as Record<string, CourseStats>;
    },
    staleTime: 2 * MIN,
  });
}

export function useTeachers() {
  return useQuery({ queryKey: qk.teachers, queryFn: async () => (await backend()).listTeachers(), staleTime: 30 * MIN });
}
export function useTestimonials() {
  return useQuery({ queryKey: qk.testimonials, queryFn: async () => (await backend()).listTestimonials(), staleTime: 30 * MIN });
}
export function useSubhashitas() {
  return useQuery({ queryKey: qk.subhashitas, queryFn: async () => (await backend()).listSubhashitas(), staleTime: 60 * MIN });
}
export function useSiteStats() {
  return useQuery({ queryKey: qk.siteStats, queryFn: async () => (await backend()).getSiteStats(), staleTime: 60 * MIN });
}
export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: async () => (await backend()).getSettings(), staleTime: 30 * MIN });
}

export function useMyRegistrations(uid: string | undefined) {
  return useQuery({
    queryKey: qk.myRegs(uid ?? ''),
    queryFn: async () => (await backend()).listMyRegistrations(uid as string),
    enabled: Boolean(uid),
    staleTime: MIN,
  });
}

/** Live seat counter for one course (1 listener, 1 read per change). */
export function useLiveSeats(courseId: string | undefined): CourseStats | null {
  const [stats, setStats] = useState<CourseStats | null>(null);
  useEffect(() => {
    if (!courseId) return;
    let unsub: (() => void) | undefined;
    let alive = true;
    void backend().then((b) => {
      if (alive) unsub = b.watchCourseStats(courseId, setStats);
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [courseId]);
  return stats;
}

/** Live status of the learner's own registration (drives the celebration on approval). */
export function useLiveRegistration(id: string | undefined): { data: Registration | null; loading: boolean } {
  const [state, setState] = useState<{ data: Registration | null; loading: boolean }>({ data: null, loading: Boolean(id) });
  useEffect(() => {
    if (!id) return;
    let unsub: (() => void) | undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    void backend().then((b) => {
      if (alive) unsub = b.watchRegistration(id, (r) => setState({ data: r, loading: false }));
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [id]);
  return state;
}

export function useCourseMap(): Record<string, Course> {
  const { data } = useCourses();
  return useMemo(() => Object.fromEntries((data ?? []).map((c) => [c.id, c])), [data]);
}

/** Course categories (defaults merged with the admin-edited `site/taxonomy`). Never undefined. */
export function useTaxonomy(): Taxonomy {
  const q = useQuery({
    queryKey: qk.taxonomy,
    queryFn: async () => mergeTaxonomy(await (await backend()).getTaxonomy()),
    staleTime: 30 * MIN,
  });
  return q.data ?? DEFAULT_TAXONOMY;
}
