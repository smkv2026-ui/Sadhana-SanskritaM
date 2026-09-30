import { describe, expect, it } from 'vitest';
import { seedCourses } from '@/data/seed';
import type { Registration, Subscriber } from '@/data/types';
import { matchStatement, parseStatement } from './admin/csvMatch';
import { recordingsToText, syllabusToText, textToRecordings, textToSyllabus, validateCourse } from './admin/courseForm';
import { dedupeSubscribers } from './admin/NotifyComposer';
import { DEFAULT_FILTER, filterCourses, filterFromSearch, filterToSearch } from './courses/courseFilters';
import { DEFAULT_TAXONOMY, findSub } from '@/data/taxonomy';
import { estimateWeeks, suggestFeatures } from './custom-requests/ideaHelper';
import { answer } from './experience/assistantBrain';
import { pickOfTheDay } from './experience/SubhashitaCard';
import { decodeAnswers, encodeAnswers, recommend, scoreCourse, type FinderAnswers } from './finder/finderLogic';
import { interestsForCourse } from './notifications/interests';

const courses = seedCourses();

describe('Find Your Path recommender', () => {
  const base: FinderAnswers = { who: 'me', experience: 'new', goal: 'speak', time: '3', format: 'live' };

  it('recommends the conversational live beginner course for a new speaker', () => {
    const recs = recommend(courses, base);
    expect(recs[0].course.slug).toBe('speak-sanskrit-in-30-days');
    expect(recs[0].reasons.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it('never recommends an advanced course to a complete beginner', () => {
    const recs = recommend(courses, { ...base, goal: 'grammar' });
    expect(recs.find((r) => r.course.level === 'advanced')).toBeUndefined();
  });

  it('recommends Pāṇini to an experienced grammar learner with time', () => {
    const recs = recommend(courses, { who: 'me', experience: 'grammar', goal: 'grammar', time: '5', format: 'live' });
    expect(recs[0].course.slug).toBe('panini-made-friendly');
  });

  it('routes children to the kids programme, and adults away from it', () => {
    expect(recommend(courses, { ...base, who: 'child' })[0].course.goals).toContain('kids');
    expect(recommend(courses, base).some((r) => r.course.goals.includes('kids'))).toBe(false);
  });

  it('prefers self-paced courses when asked', () => {
    const recs = recommend(courses, { ...base, goal: 'chanting', format: 'recorded', time: '1' });
    expect(recs[0].course.type).toBe('recorded');
  });

  it('scores are bounded and results shareable via URL', () => {
    const s = scoreCourse(courses[0], base);
    expect(s.match).toBeGreaterThanOrEqual(0);
    expect(s.match).toBeLessThanOrEqual(100);
    expect(decodeAnswers(`?${encodeAnswers(base)}`)).toEqual(base);
    expect(decodeAnswers('?who=me&experience=hacker')).toBeNull();
  });
});

describe('course explorer filters', () => {
  it('filters by kind/type/level and diacritic-insensitive search', () => {
    expect(filterCourses(courses, { ...DEFAULT_FILTER, kind: 'event' }).every((c) => c.kind === 'event')).toBe(true);
    expect(filterCourses(courses, { ...DEFAULT_FILTER, type: 'recorded' }).every((c) => c.type === 'recorded')).toBe(true);
    expect(filterCourses(courses, { ...DEFAULT_FILTER, q: 'panini' })[0].slug).toBe('panini-made-friendly');
    expect(filterCourses(courses, { ...DEFAULT_FILTER, q: 'gita grammar' })).toHaveLength(1);
  });
  it('sorts by price', () => {
    const asc = filterCourses(courses, { ...DEFAULT_FILTER, sort: 'price-asc' });
    expect(asc[0].priceInr).toBe(0);
  });
  it('round-trips through the URL', () => {
    const f = { ...DEFAULT_FILTER, q: 'kids', level: 'beginner' as const, sort: 'soonest' as const };
    expect(filterFromSearch(filterToSearch(f))).toEqual(f);
    expect(filterFromSearch('?type=bogus').type).toBe('all');
    const t = { ...DEFAULT_FILTER, cat: 'yoga' as const, sub: 'ashtanga', variant: 'Theory + Practical' };
    expect(filterFromSearch(filterToSearch(t))).toEqual(t);
    expect(filterFromSearch('?cat=nope').cat).toBe('all');
  });
  it('drills down category → sub-category → variant', () => {
    const yoga = filterCourses(courses, { ...DEFAULT_FILTER, cat: 'yoga' });
    expect(yoga.length).toBeGreaterThan(3);
    expect(yoga.every((c) => c.category === 'yoga')).toBe(true);
    const ashtanga = filterCourses(courses, { ...DEFAULT_FILTER, cat: 'yoga', sub: 'ashtanga' });
    expect(ashtanga.length).toBeGreaterThanOrEqual(2);
    expect(filterCourses(courses, { ...DEFAULT_FILTER, cat: 'yoga', sub: 'ashtanga', variant: 'Theory' }).map((c) => c.variant)).toEqual(['Theory']);
  });
  it('every seeded course points at a real taxonomy node', () => {
    for (const c of courses) {
      const sub = findSub(DEFAULT_TAXONOMY, c.category, c.subcategory);
      expect(sub, `${c.id} → ${c.category}/${c.subcategory}`).toBeDefined();
      if (c.variant) expect(sub?.variants).toContain(c.variant);
    }
  });
});

describe('rule-based assistant', () => {
  it('maps questions to intents', () => {
    expect(answer('How much does it cost?').id).toBe('fees');
    expect(answer('how do I pay with gpay').id).toBe('payment');
    expect(answer('where do i find the utr number').id).toBe('utr');
    expect(answer('when will I get the recording link').id).toBe('access');
    expect(answer('can I get a refund').id).toBe('refund');
    expect(answer('qwerty zxcv').id).toBe('fallback');
  });
});

describe('bank statement matcher', () => {
  const reg = (id: string, utr: string | null, amount: number, reference: string) => ({ id, utr, amountInr: amount, reference }) as Registration;
  const pending = [reg('r1', '412345678901', 1799, 'SS-AAAAAA'), reg('r2', '498765432109', 999, 'SS-BBBBBB'), reg('r3', null, 299, 'SS-CCCCCC')];

  it('matches by UTR (+amount) and by reference in narration', () => {
    const csv = [
      'Date,Narration,Credit,Debit,Balance',
      '01/10/2026,UPI/412345678901/SS-AAAAAA/Asha,"1,799.00",,50000',
      '01/10/2026,UPI/498765432109/payment,500.00,,50500',
      '02/10/2026,UPI/555555555555/SS CCCCCC,299.00,,50799',
      '02/10/2026,ATM withdrawal,,2000,48799',
    ].join('\n');
    const rows = parseStatement(csv);
    expect(rows[0]).toMatchObject({ amount: 1799, utrs: ['412345678901'], reference: 'SS-AAAAAA' });
    const m = matchStatement(rows, pending);
    expect(m.map((x) => [x.registration.id, x.confidence])).toEqual([
      ['r1', 'high'],
      ['r2', 'medium'],
      ['r3', 'medium'],
    ]);
  });
});

describe('admin course editor helpers', () => {
  it('syllabus and recordings round-trip through text', () => {
    const s = courses[0].syllabus;
    expect(textToSyllabus(syllabusToText(s)).map((m) => [m.title, m.items, m.durationMinutes])).toEqual(s.map((m) => [m.title, m.items, m.durationMinutes]));
    const recs = textToRecordings('Intro | https://youtu.be/x | 12\nPart 2 | https://youtu.be/y | 20');
    expect(recs).toHaveLength(2);
    expect(textToRecordings(recordingsToText(recs)).map((r) => r.url)).toEqual(['https://youtu.be/x', 'https://youtu.be/y']);
  });
  it('validates courses', () => {
    expect(validateCourse(courses[0])).toBeNull();
    expect(validateCourse({ ...courses[0], slug: 'Bad Slug' })).toMatch(/slug/);
    expect(validateCourse({ ...courses[0], earlyBirdPriceInr: 99999 })).toMatch(/Early-bird/);
  });
});

describe('notifications', () => {
  it('maps courses to subscriber interests', () => {
    expect(interestsForCourse(courses.find((c) => c.kind === 'event')!)).toContain('events');
    expect(interestsForCourse(courses[0])).toContain('spoken');
  });
  it('deduplicates subscribers by email, preferring confirmed', () => {
    const s = (id: string, email: string, status: Subscriber['status']) => ({ id, email, status }) as Subscriber;
    const out = dedupeSubscribers([s('1', 'A@x.com', 'PENDING'), s('2', 'a@x.com', 'CONFIRMED'), s('3', 'b@x.com', 'PENDING')]);
    expect(out.map((x) => x.id).sort()).toEqual(['2', '3']);
  });
});

describe('custom app idea helper', () => {
  it('suggests features from the problem text and project type', () => {
    const ideas = suggestFeatures('learning-app', 'Students in villages with poor internet want chanting practice', []);
    const ids = ideas.map((i) => i.feature);
    expect(ids).toContain('audio-chanting');
    expect(ids).toContain('offline');
    expect(ideas.length).toBeLessThanOrEqual(5);
    expect(suggestFeatures('booking', '', ['booking', 'payments']).map((i) => i.feature)).not.toContain('booking');
    expect(estimateWeeks(5).max).toBeGreaterThan(estimateWeeks(5).min);
  });
});

describe('subhashita of the day', () => {
  it('is deterministic per day and rotates', () => {
    const items = ['a', 'b', 'c'];
    const d1 = new Date(2026, 9, 1);
    const d2 = new Date(2026, 9, 2);
    expect(pickOfTheDay(items, d1)).toBe(pickOfTheDay(items, d1));
    expect(pickOfTheDay(items, d1)).not.toBe(pickOfTheDay(items, d2));
    expect(pickOfTheDay([], d1)).toBeUndefined();
  });
});

describe('admin navigation', () => {
  it('uses absolute links (relative links inside /admin/* stacked up and rendered blank pages)', async () => {
    const { ADMIN_NAV } = await import('./admin/AdminApp');
    for (const item of ADMIN_NAV) expect(item.to).toMatch(/^\/admin(\/[a-z]+)?$/);
    expect(new Set(ADMIN_NAV.map((n) => n.to)).size).toBe(ADMIN_NAV.length);
  });
});
