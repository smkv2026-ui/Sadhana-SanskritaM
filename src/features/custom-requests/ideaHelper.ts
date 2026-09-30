/** Rule-based idea helper for the custom-app brief (no paid AI). */

export const PROJECT_TYPES = [
  { id: 'learning-app', label: 'Learning app', emoji: '📚', hint: 'Courses, quizzes, progress' },
  { id: 'institution-site', label: 'Institution website', emoji: '🏛️', hint: 'School, gurukula, trust' },
  { id: 'community', label: 'Community platform', emoji: '🪷', hint: 'Members, events, forums' },
  { id: 'content-library', label: 'Content library', emoji: '🗂️', hint: 'Texts, audio, video archive' },
  { id: 'booking', label: 'Booking & payments', emoji: '📅', hint: 'Classes, slots, fees' },
  { id: 'other', label: 'Something else', emoji: '✨', hint: 'Tell us everything' },
] as const;

export const FEATURE_CATALOG = [
  { id: 'auth', label: 'Sign-in & profiles', emoji: '🔐' },
  { id: 'courses', label: 'Courses & lessons', emoji: '🎓' },
  { id: 'video', label: 'Video / audio player', emoji: '🎬' },
  { id: 'quizzes', label: 'Quizzes & flashcards', emoji: '🧠' },
  { id: 'progress', label: 'Progress tracking', emoji: '📈' },
  { id: 'payments', label: 'Payments (UPI)', emoji: '💳' },
  { id: 'booking', label: 'Class booking', emoji: '🗓️' },
  { id: 'notifications', label: 'Email / WhatsApp alerts', emoji: '🔔' },
  { id: 'devanagari', label: 'Devanagari keyboard & search', emoji: 'अ' },
  { id: 'audio-chanting', label: 'Chanting practice with audio', emoji: '🎶' },
  { id: 'community', label: 'Forum / discussions', emoji: '💬' },
  { id: 'admin', label: 'Admin dashboard', emoji: '🛠️' },
  { id: 'multilingual', label: 'Multiple languages', emoji: '🌐' },
  { id: 'offline', label: 'Works offline (PWA)', emoji: '📶' },
  { id: 'certificates', label: 'Certificates', emoji: '📜' },
  { id: 'analytics', label: 'Analytics & reports', emoji: '📊' },
] as const;

export type FeatureId = (typeof FEATURE_CATALOG)[number]['id'];

const TYPE_DEFAULTS: Record<string, FeatureId[]> = {
  'learning-app': ['auth', 'courses', 'video', 'quizzes', 'progress', 'payments'],
  'institution-site': ['multilingual', 'notifications', 'admin', 'booking'],
  community: ['auth', 'community', 'notifications', 'admin'],
  'content-library': ['video', 'devanagari', 'offline', 'admin'],
  booking: ['booking', 'payments', 'notifications', 'admin'],
  other: ['auth', 'admin'],
};

const KEYWORDS: [RegExp, FeatureId, string][] = [
  [/chant|recit|svara|mantra/i, 'audio-chanting', 'Chanting practice with slow-down and loop'],
  [/quiz|test|exam|practice/i, 'quizzes', 'Quizzes turn reading into practice'],
  [/pay|fee|upi|donat/i, 'payments', 'UPI payments with admin verification'],
  [/offline|village|rural|low network|internet/i, 'offline', 'Offline-first so it works on patchy networks'],
  [/certif/i, 'certificates', 'Auto-generated completion certificates'],
  [/whatsapp|remind|notify|sms/i, 'notifications', 'Automatic reminders on WhatsApp and email'],
  [/hindi|tamil|telugu|kannada|marathi|language/i, 'multilingual', 'Interface in regional languages'],
  [/sanskrit|devanagari|shloka|śloka|text/i, 'devanagari', 'Devanagari input and diacritic-insensitive search'],
  [/report|analytic|track|insight/i, 'analytics', 'Dashboards for teachers and management'],
  [/book|slot|schedule|appointment/i, 'booking', 'Self-service class booking'],
  [/student|learner|kid|child/i, 'progress', 'Progress tracking students actually enjoy'],
];

export interface IdeaSuggestion {
  feature: FeatureId;
  why: string;
}

export function suggestFeatures(projectType: string, problem: string, picked: string[]): IdeaSuggestion[] {
  const out: IdeaSuggestion[] = [];
  const seen = new Set(picked);
  for (const [re, feature, why] of KEYWORDS) {
    if (re.test(problem) && !seen.has(feature)) {
      out.push({ feature, why });
      seen.add(feature);
    }
  }
  for (const f of TYPE_DEFAULTS[projectType] ?? []) {
    if (!seen.has(f)) {
      out.push({ feature: f, why: 'Common in projects like yours' });
      seen.add(f);
    }
  }
  return out.slice(0, 5);
}

/** Rough effort estimate for the preview (weeks), purely indicative. */
export function estimateWeeks(featureCount: number): { min: number; max: number } {
  const base = 3 + featureCount * 1.2;
  return { min: Math.round(base), max: Math.round(base * 1.6) };
}
