import { env } from '@/config/env';

/** Absolute URL for an in-app route, respecting the deploy base path. */
export function absUrl(path: string): string {
  const base = env.siteUrl.endsWith('/') ? env.siteUrl : `${env.siteUrl}/`;
  return base + path.replace(/^\//, '');
}

export const routes = {
  home: '/',
  courses: '/courses',
  course: (slug: string) => `/courses/${slug}`,
  register: (slug: string) => `/courses/${slug}/register`,
  events: '/events',
  about: '/about',
  finder: '/find-your-path',
  customApps: '/custom-apps',
  customAppsTrack: '/custom-apps/track',
  myLearning: '/my-learning',
  receipt: (id: string) => `/my-learning/receipt/${encodeURIComponent(id)}`,
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  refund: '/refund-policy',
  subscribe: '/subscribe',
  // The subscriber token is an unguessable capability (it is also the document id).
  subscribeConfirm: (token: string) => `/subscribe/confirm?t=${encodeURIComponent(token)}`,
  preferences: (token: string) => `/subscribe/preferences?t=${encodeURIComponent(token)}`,
  unsubscribe: (token: string) => `/subscribe/unsubscribe?t=${encodeURIComponent(token)}`,
  signIn: '/sign-in',
  authFinish: '/auth/finish',
  admin: '/admin',
} as const;
