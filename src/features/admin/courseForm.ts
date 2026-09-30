import { z } from 'zod';
import type { Course, CourseSecrets, Recording, SyllabusModule } from '@/data/types';
import { slugify } from '@/lib/ids';

/** Text <-> structure helpers for the admin course editor (kept pure for testing). */

export function syllabusToText(s: SyllabusModule[]): string {
  return s.map((m) => `${m.title}${m.durationMinutes ? ` (${m.durationMinutes})` : ''}: ${m.items.join('; ')}`).join('\n');
}

export function textToSyllabus(text: string): SyllabusModule[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [head, rest = ''] = line.split(/:(.*)/s);
      const dur = head.match(/\((\d+)\)\s*$/);
      return {
        id: `m${i + 1}`,
        title: head.replace(/\(\d+\)\s*$/, '').trim(),
        items: rest
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean),
        ...(dur ? { durationMinutes: Number(dur[1]) } : {}),
      };
    });
}

export function recordingsToText(r: Recording[]): string {
  return r.map((x) => `${x.title} | ${x.url} | ${x.durationMinutes}`).join('\n');
}

export function textToRecordings(text: string): Recording[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [title = '', url = '', mins = '0'] = line.split('|').map((p) => p.trim());
      return { id: `r${i + 1}-${slugify(title).slice(0, 20)}`, title, url, durationMinutes: Number(mins) || 0 };
    });
}

export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

const httpsUrl = z.string().trim().refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Must be an https:// link');

export const courseSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    slug: z.string().regex(/^[a-z0-9-]{3,60}$/, 'lowercase letters, digits and dashes'),
    priceInr: z.number().int().min(0).max(1_000_000),
    earlyBirdPriceInr: z.number().int().min(0).nullable(),
    seatLimit: z.number().int().min(0).max(100_000),
    coverImage: httpsUrl,
    summary: z.string().trim().min(10).max(300),
  })
  .refine((c) => c.earlyBirdPriceInr === null || c.earlyBirdPriceInr < c.priceInr, { message: 'Early-bird price must be lower than the price', path: ['earlyBirdPriceInr'] });

export function validateCourse(c: Course): string | null {
  const r = courseSchema.safeParse(c);
  if (r.success) {
    if (c.earlyBirdPriceInr !== null && !c.earlyBirdEndsAt) return 'Set when the early-bird price ends.';
    return null;
  }
  const issue = r.error.issues[0];
  return `${issue.path.join('.')}: ${issue.message}`;
}

export function validateSecrets(s: CourseSecrets): string | null {
  if (s.meetingLink && !/^https:\/\/\S+$/.test(s.meetingLink)) return 'Meeting link must start with https://';
  const bad = s.recordings.find((r) => !r.title || !/^https:\/\/\S+$/.test(r.url));
  if (bad) return `Recording “${bad.title || '(untitled)'}” needs a title and an https:// URL.`;
  return null;
}
