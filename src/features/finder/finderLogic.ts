import type { Course, Goal, Level } from '@/data/types';

/** Rule-based course recommender for the "Find Your Path" quiz (no AI). */

export type ExperienceAnswer = 'new' | 'script' | 'reading' | 'grammar';
export type TimeAnswer = '1' | '3' | '5';
export type FormatAnswer = 'live' | 'recorded' | 'either';
export type WhoAnswer = 'me' | 'child';

export interface FinderAnswers {
  who: WhoAnswer;
  experience: ExperienceAnswer;
  goal: Goal;
  time: TimeAnswer;
  format: FormatAnswer;
}

export interface FinderQuestion<K extends keyof FinderAnswers = keyof FinderAnswers> {
  key: K;
  title: string;
  options: { value: FinderAnswers[K]; label: string; hint: string; emoji: string }[];
}

export const QUESTIONS: FinderQuestion[] = [
  {
    key: 'who',
    title: 'Who is learning?',
    options: [
      { value: 'me', label: 'Me', hint: 'Teen or adult learner', emoji: '🧘' },
      { value: 'child', label: 'My child', hint: 'Ages 7–12', emoji: '🧒' },
    ],
  },
  {
    key: 'experience',
    title: 'Where are you on the path?',
    options: [
      { value: 'new', label: 'Brand new', hint: 'I can’t read Devanagari yet', emoji: '🌱' },
      { value: 'script', label: 'I know the script', hint: 'I can sound out words', emoji: '🔤' },
      { value: 'reading', label: 'I read simple texts', hint: 'With a dictionary nearby', emoji: '📖' },
      { value: 'grammar', label: 'I’ve studied grammar', hint: 'Sandhi & declensions are familiar', emoji: '🪷' },
    ],
  },
  {
    key: 'goal',
    title: 'What calls you most?',
    options: [
      { value: 'speak', label: 'Speak Sanskrit', hint: 'Everyday conversation', emoji: '🗣️' },
      { value: 'read-texts', label: 'Read the texts', hint: 'Gītā, Upaniṣads, subhāṣitas', emoji: '📜' },
      { value: 'chanting', label: 'Chant correctly', hint: 'Svara, rhythm, pronunciation', emoji: '🎶' },
      { value: 'grammar', label: 'Master grammar', hint: 'Pāṇini’s system', emoji: '🧩' },
      { value: 'philosophy', label: 'Explore philosophy', hint: 'Meaning and commentary', emoji: '💎' },
    ],
  },
  {
    key: 'time',
    title: 'How much time can you give each week?',
    options: [
      { value: '1', label: 'About 1 hour', hint: 'A gentle pace', emoji: '🌙' },
      { value: '3', label: '2–3 hours', hint: 'Steady practice', emoji: '☀️' },
      { value: '5', label: '4+ hours', hint: 'Deep immersion', emoji: '🔥' },
    ],
  },
  {
    key: 'format',
    title: 'How do you like to learn?',
    options: [
      { value: 'live', label: 'Live with a teacher', hint: 'Interactive cohort', emoji: '🎥' },
      { value: 'recorded', label: 'At my own pace', hint: 'Recorded lessons', emoji: '⏯️' },
      { value: 'either', label: 'Either works', hint: 'Show me the best fit', emoji: '✨' },
    ],
  },
];

const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const EXPERIENCE_RANK: Record<ExperienceAnswer, number> = { new: 0, script: 0.5, reading: 1, grammar: 2 };

export interface Recommendation {
  course: Course;
  score: number;
  reasons: string[];
  /** 0–100 for the "match" meter. */
  match: number;
}

export function scoreCourse(course: Course, a: FinderAnswers): Recommendation {
  let score = 0;
  const reasons: string[] = [];
  const isKids = course.goals.includes('kids');

  if (a.who === 'child') {
    if (isKids) {
      score += 8;
      reasons.push('Designed for young learners aged 7–12');
    } else score -= 6;
  } else if (isKids) score -= 8;

  if (course.goals.includes(a.goal)) {
    score += 5;
    reasons.push(
      {
        speak: 'Conversation-first — you’ll speak from day one',
        'read-texts': 'Builds the reading skills you want for the original texts',
        chanting: 'Focused on accurate chanting and pronunciation',
        grammar: 'Goes deep into the grammar you want to master',
        philosophy: 'Opens the meaning and philosophy behind the verses',
        kids: 'Playful stories and ślokas',
      }[a.goal],
    );
  }

  const gap = LEVEL_RANK[course.level] - EXPERIENCE_RANK[a.experience];
  if (gap <= 0.5 && gap >= -0.5) {
    score += 3;
    reasons.push(`Pitched right at your level (${course.level})`);
  } else if (gap > 1) score -= 5;
  else if (gap > 0.5) score -= 1;
  else score += gap < -1 ? -1 : 1;

  const hours = Number(a.time);
  if (course.weeklyHours <= hours) {
    score += 2;
    reasons.push(`Fits your ${a.time === '5' ? '4+' : a.time === '3' ? '2–3' : '~1'} hour weekly rhythm`);
  } else if (course.weeklyHours > hours + 1) score -= 2;

  if (a.format === 'either') score += 1;
  else if (course.type === a.format) {
    score += 3;
    reasons.push(a.format === 'live' ? 'Live, interactive sessions with a teacher' : 'Self-paced recordings with lifetime access');
  } else if (course.type === 'hybrid') {
    score += 2;
    reasons.push('Hybrid: live sessions plus recordings of each class');
  } else score -= 2;

  // Best achievable score for these answers → a perfect fit reads as 100%.
  const best = (a.who === 'child' ? 8 : 0) + 5 + 3 + 2 + (a.format === 'either' ? 1 : 3);
  const match = Math.max(0, Math.min(100, Math.round((score / best) * 100)));
  return { course, score, reasons: reasons.slice(0, 3), match };
}

export function recommend(courses: Course[], a: FinderAnswers, max = 3): Recommendation[] {
  return courses
    .filter((c) => c.status === 'published')
    .map((c) => scoreCourse(c, a))
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score || (x.course.startsAt ?? '').localeCompare(y.course.startsAt ?? ''))
    .slice(0, max);
}

const KEYS: (keyof FinderAnswers)[] = ['who', 'experience', 'goal', 'time', 'format'];

export function encodeAnswers(a: FinderAnswers): string {
  return new URLSearchParams(KEYS.map((k) => [k, a[k]])).toString();
}

export function decodeAnswers(search: string): FinderAnswers | null {
  const p = new URLSearchParams(search);
  const out: Partial<FinderAnswers> = {};
  for (const q of QUESTIONS) {
    const v = p.get(q.key);
    if (!v || !q.options.some((o) => o.value === v)) return null;
    (out as Record<string, string>)[q.key] = v;
  }
  return out as FinderAnswers;
}
