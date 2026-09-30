import { Mail, MessageCircle, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/brand/Logo';
import { BRAND } from '@/brand/logoGeometry';
import { replayIntro } from '@/brand/IntroAnimation';
import { env } from '@/config/env';
import { useSettings } from '@/data/queries';
import { routes } from '@/lib/links';

const COLUMNS = [
  {
    title: 'Learn',
    links: [
      { to: routes.courses, label: 'All courses' },
      { to: routes.events, label: 'Events' },
      { to: routes.finder, label: 'Find your path' },
      { to: routes.myLearning, label: 'My Learning' },
    ],
  },
  {
    title: 'Sadhana',
    links: [
      { to: routes.about, label: 'About us' },
      { to: routes.customApps, label: 'Build me a custom app' },
      { to: routes.customAppsTrack, label: 'Track my request' },
      { to: routes.contact, label: 'Contact' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { to: routes.privacy, label: 'Privacy' },
      { to: routes.terms, label: 'Terms' },
      { to: routes.refund, label: 'Refund policy' },
      { to: `${routes.contact}?topic=delete-my-data`, label: 'Delete my data' },
    ],
  },
];

export function Footer() {
  const { data: settings } = useSettings();
  const channel = settings?.whatsappChannelUrl || env.contact.whatsappChannelUrl;
  return (
    <footer className="relative z-10 mt-24 border-t bg-card/40">
      <div className="container grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <Logo lockup="horizontal" size={44} />
          <p className="max-w-xs text-sm text-muted-foreground">{BRAND.tagline}. Authentic Sanskrit learning — joyful, rigorous and open to every seeker.</p>
          <p lang="sa" className="deva text-sm text-accent">
            {BRAND.motto.deva}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={routes.subscribe} className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition hover:border-accent">
              <Mail className="h-4 w-4" /> Get notified
            </Link>
            {channel && (
              <a
                href={channel}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition hover:border-accent"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp channel
              </a>
            )}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Made with devotion.
          </p>
          <button type="button" onClick={replayIntro} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition hover:text-accent">
            <Play className="h-3.5 w-3.5" /> Replay intro
          </button>
        </div>
      </div>
    </footer>
  );
}
