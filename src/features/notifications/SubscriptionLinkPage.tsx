import { motion } from 'framer-motion';
import { BellOff, CheckCircle2, Settings2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { backend, BackendError } from '@/data';
import { routes } from '@/lib/links';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/shared/components/PageMeta';
import { PageLoader } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Switch, Label } from '@/shared/ui/primitives';
import { INTERESTS } from './interests';

type Mode = 'confirm' | 'preferences' | 'unsubscribe';

/**
 * Token-link pages. Subscribers are never publicly readable, so these pages only WRITE:
 * the Security Rules accept the update only when the supplied token matches the stored one.
 */
export default function SubscriptionLinkPage({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [state, setState] = useState<'working' | 'ok' | 'error' | 'idle'>(mode === 'confirm' ? 'working' : 'idle');
  const [error, setError] = useState('');
  const [channels, setChannels] = useState({ email: true, whatsapp: false });
  const [interests, setInterests] = useState<string[]>(INTERESTS.map((i) => i.id));
  const ran = useRef(false);

  const run = async (patch: Parameters<Awaited<ReturnType<typeof backend>>['updateSubscriberByToken']>[1]) => {
    if (!token) {
      setState('error');
      setError('This link is incomplete. Please use the link from your email.');
      return;
    }
    setState('working');
    try {
      await (await backend()).updateSubscriberByToken(token, patch);
      setState('ok');
    } catch (e) {
      setState('error');
      setError(e instanceof BackendError ? e.message : 'Something went wrong.');
    }
  };

  useEffect(() => {
    if (mode === 'confirm' && !ran.current) {
      ran.current = true;
      void run({ status: 'CONFIRMED' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const title = { confirm: 'Confirm subscription', preferences: 'Notification preferences', unsubscribe: 'Unsubscribe' }[mode];

  return (
    <div className="container max-w-xl py-16">
      <PageMeta title={title} noindex />
      <div className="rounded-3xl border bg-card p-8 shadow-lift">
        {state === 'working' && <PageLoader />}
        {state === 'error' && (
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-semibold">That didn’t work</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to={routes.subscribe}>Subscribe again</Link>
            </Button>
          </div>
        )}
        {state === 'ok' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            {mode === 'unsubscribe' ? <BellOff className="mx-auto h-12 w-12 text-muted-foreground" /> : <CheckCircle2 className="mx-auto h-12 w-12 text-success" />}
            <h1 className="mt-4 text-2xl font-semibold">
              {mode === 'confirm' ? 'You’re subscribed. Dhanyavādaḥ!' : mode === 'unsubscribe' ? 'You’ve been unsubscribed' : 'Preferences saved'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {mode === 'unsubscribe' ? 'You won’t receive further announcements. Changed your mind? You can subscribe again anytime.' : 'We’ll only write when something matches your interests.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to={routes.courses}>Explore courses</Link>
              </Button>
              {mode !== 'preferences' && (
                <Button asChild variant="ghost">
                  <Link to={routes.preferences(token)}>
                    <Settings2 /> Manage preferences
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
        {state === 'idle' && mode === 'unsubscribe' && (
          <div className="text-center">
            <BellOff className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-semibold">Unsubscribe from all announcements?</h1>
            <p className="mt-2 text-muted-foreground">You can also just change what you receive.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="destructive" onClick={() => void run({ status: 'UNSUBSCRIBED' })}>
                Unsubscribe
              </Button>
              <Button asChild variant="outline">
                <Link to={routes.preferences(token)}>Change preferences instead</Link>
              </Button>
            </div>
          </div>
        )}
        {state === 'idle' && mode === 'preferences' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!channels.email && !channels.whatsapp) {
                toast.error('Pick at least one channel, or unsubscribe instead.');
                return;
              }
              void run({ channels, interests, status: 'CONFIRMED' });
            }}
          >
            <h1 className="text-2xl font-semibold">Notification preferences</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose what you receive. Saving replaces your previous choices.</p>
            <div className="mt-6 space-y-4">
              {(['email', 'whatsapp'] as const).map((c) => (
                <div key={c} className="flex items-center justify-between rounded-2xl border p-4">
                  <Label htmlFor={`ch-${c}`} className="capitalize">
                    {c === 'email' ? 'Email' : 'WhatsApp'} announcements
                  </Label>
                  <Switch id={`ch-${c}`} checked={channels[c]} onCheckedChange={(v) => setChannels((s) => ({ ...s, [c]: v }))} />
                </div>
              ))}
            </div>
            <fieldset className="mt-6">
              <legend className="text-sm font-medium">Interests</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const on = interests.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setInterests((s) => (on ? s.filter((x) => x !== i.id) : [...s, i.id]))}
                      className={cn('rounded-full border px-3.5 py-2 text-sm transition', on ? 'border-accent bg-accent/15 font-semibold' : 'hover:border-accent')}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button type="submit">Save preferences</Button>
              <Button asChild variant="ghost">
                <Link to={routes.unsubscribe(token)}>Unsubscribe from everything</Link>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
