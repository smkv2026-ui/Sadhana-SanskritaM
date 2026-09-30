export const INTERESTS = [
  { id: 'spoken', label: 'Spoken Sanskrit' },
  { id: 'grammar', label: 'Grammar (vyākaraṇa)' },
  { id: 'texts', label: 'Gītā & classical texts' },
  { id: 'chanting', label: 'Chanting' },
  { id: 'kids', label: 'Kids programmes' },
  { id: 'events', label: 'Events & workshops' },
  { id: 'custom-apps', label: 'Custom apps' },
] as const;

export type InterestId = (typeof INTERESTS)[number]['id'];

/** Map a course's tags/goals to subscriber interests (for targeted announcements). */
export function interestsForCourse(course: { goals: string[]; tags: string[]; kind: string }): InterestId[] {
  const out = new Set<InterestId>();
  if (course.goals.includes('speak')) out.add('spoken');
  if (course.goals.includes('grammar')) out.add('grammar');
  if (course.goals.includes('read-texts') || course.goals.includes('philosophy')) out.add('texts');
  if (course.goals.includes('chanting')) out.add('chanting');
  if (course.goals.includes('kids')) out.add('kids');
  if (course.kind === 'event') out.add('events');
  return [...out];
}

/** Consent wording version stored with each consent record. */
export const CONSENT_TEXT = {
  version: 'v1',
  email: 'I agree to receive emails from Sadhana Sanskritam about courses and events. I can unsubscribe anytime.',
  whatsapp: 'I agree to receive WhatsApp messages from Sadhana Sanskritam about courses and events. I can opt out anytime by replying STOP.',
};
