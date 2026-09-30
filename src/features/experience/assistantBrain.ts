import { env } from '@/config/env';
import { routes } from '@/lib/links';

/**
 * Rule-based FAQ assistant — no paid AI. Keyword scoring picks an intent; each intent has an
 * answer, follow-up chips and an optional route.
 */
export interface Intent {
  id: string;
  keywords: string[];
  answer: string;
  chips: string[];
  link?: { label: string; to: string };
}

export const INTENTS: Intent[] = [
  {
    id: 'fees',
    keywords: ['fee', 'fees', 'price', 'cost', 'how much', 'discount', 'coupon', 'early bird', 'free', 'rupees', 'inr'],
    answer:
      'Every course page shows the fee in INR. Early-bird prices apply automatically until the date shown, and you can add a coupon code on the review step. Some community events are free.',
    chips: ['How does payment work?', 'Show me courses'],
    link: { label: 'Browse courses & fees', to: routes.courses },
  },
  {
    id: 'payment',
    keywords: ['pay', 'payment', 'upi', 'utr', 'qr', 'gpay', 'phonepe', 'paytm', 'bank', 'transaction'],
    answer: `We accept UPI from any app. After you register, scan the QR (or tap “Open my UPI app” on mobile), pay the exact amount with your reference in the note, then paste the 12-digit UTR from your UPI app. We verify it — usually within a few hours — and your access unlocks automatically. Your seat is held for ${env.seatHoldHours} hours while you pay.`,
    chips: ['Where do I find the UTR?', 'How is access delivered?'],
  },
  {
    id: 'utr',
    keywords: ['where', 'find utr', 'utr number', 'reference number', 'rrn', 'transaction id'],
    answer:
      'Open the payment in your UPI app’s history. The 12-digit number is labelled “UTR”, “UPI Ref No.” or “RRN” (Google Pay: “UPI transaction ID”; PhonePe: “UTR”; Paytm: “UPI Ref No.”).',
    chips: ['How does payment work?', 'Talk to a human'],
  },
  {
    id: 'access',
    keywords: ['access', 'link', 'recording', 'recordings', 'zoom', 'meet', 'join', 'class link', 'unlock', 'watch'],
    answer:
      'Once your payment is approved, My Learning shows your live-class link or recordings, with progress tracking and add-to-calendar. We also send a confirmation email and a WhatsApp message.',
    chips: ['Open My Learning', 'When is the next class?'],
    link: { label: 'Open My Learning', to: routes.myLearning },
  },
  {
    id: 'schedule',
    keywords: ['schedule', 'when', 'time', 'timing', 'date', 'next class', 'calendar', 'timezone', 'event', 'events'],
    answer: 'All live sessions are listed in IST with your local time shown too. The events timeline shows what’s coming up next.',
    chips: ['Show events', 'Which course suits me?'],
    link: { label: 'See the events timeline', to: routes.events },
  },
  {
    id: 'which',
    keywords: ['which', 'suit', 'recommend', 'beginner', 'start', 'level', 'new to sanskrit', 'best course', 'kids', 'child'],
    answer: 'Take the 1-minute “Find your path” quiz — it recommends courses for your level, goals, time and format.',
    chips: ['Show me courses', 'How much are the fees?'],
    link: { label: 'Find your path', to: routes.finder },
  },
  {
    id: 'refund',
    keywords: ['refund', 'cancel', 'cancellation', 'money back'],
    answer: 'Full refund up to 48 hours before a live course starts, and within 7 days for recorded courses if you have watched less than 20%. Details are in our refund policy.',
    chips: ['Talk to a human'],
    link: { label: 'Refund policy', to: routes.refund },
  },
  {
    id: 'notify',
    keywords: ['notify', 'notification', 'newsletter', 'whatsapp', 'updates', 'subscribe', 'alert'],
    answer: 'Subscribe with your email and/or WhatsApp number and choose your interests — we only message you about matching courses, and you can unsubscribe any time.',
    chips: ['Which course suits me?'],
    link: { label: 'Get notified', to: routes.subscribe },
  },
  {
    id: 'custom',
    keywords: ['app', 'custom', 'website', 'software', 'build', 'develop'],
    answer: 'We also build custom learning apps and websites. Use the interactive brief builder — you’ll get a reference number and can track progress online.',
    chips: ['Talk to a human'],
    link: { label: 'Build me a custom app', to: routes.customApps },
  },
  {
    id: 'human',
    keywords: ['human', 'contact', 'talk', 'call', 'email', 'help', 'support', 'person'],
    answer: `Happy to help personally — write to ${env.contact.email} or use the contact form.`,
    chips: ['How does payment work?'],
    link: { label: 'Contact us', to: routes.contact },
  },
];

const FALLBACK: Intent = {
  id: 'fallback',
  keywords: [],
  answer: 'I’m a simple guide, so I may have missed that. Here are the things I can help with:',
  chips: ['How much are the fees?', 'How does payment work?', 'How is access delivered?', 'Which course suits me?'],
};

export const GREETING: Intent = {
  id: 'greeting',
  keywords: [],
  answer: 'Namaste! 🙏 I can answer quick questions about fees, schedules, payment and access. What would you like to know?',
  chips: ['How much are the fees?', 'How does payment work?', 'How is access delivered?', 'Which course suits me?'],
};

const CHIP_ROUTES: Record<string, string> = {
  'Show me courses': routes.courses,
  'Show events': routes.events,
  'Open My Learning': routes.myLearning,
};

export function chipRoute(chip: string): string | undefined {
  return CHIP_ROUTES[chip];
}

export function answer(question: string): Intent {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
  let best: { intent: Intent; score: number } = { intent: FALLBACK, score: 0 };
  for (const intent of INTENTS) {
    let score = 0;
    for (const k of intent.keywords) {
      if (q.includes(` ${k} `) || (k.includes(' ') && q.includes(k))) score += k.includes(' ') ? 2 : 1;
    }
    if (score > best.score) best = { intent, score };
  }
  return best.intent;
}
