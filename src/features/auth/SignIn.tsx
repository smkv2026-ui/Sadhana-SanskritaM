import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { MailCheck, Shield, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { LogoMark } from '@/brand/Logo';
import { env } from '@/config/env';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/overlays';
import { Field, Input } from '@/shared/ui/primitives';
import { PageLoader } from '@/shared/components/States';
import { useAuth } from './AuthProvider';

const emailSchema = z.object({ email: z.string().trim().email('Enter a valid email address') });

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.07-1.1-.16-1.6H12z" />
    </svg>
  );
}

export function SignInPanel({ reason }: { reason?: string }) {
  const { signInWithGoogle, sendEmailLink, demoSignIn } = useAuth();
  const location = useLocation();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'email' | 'learner' | 'admin' | null>(null);
  const form = useForm<{ email: string }>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });
  const continuePath = location.pathname + location.search;

  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (sentTo) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-4 text-center">
        <MailCheck className="h-10 w-10 text-success" aria-hidden />
        <p className="mt-4 font-display text-xl">Check your inbox</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a secure sign-in link to <strong>{sentTo}</strong>. Open it on this device to continue.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {reason && <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm">{reason}</p>}
      {env.backend === 'demo' && demoSignIn && (
        <div className="rounded-2xl border border-dashed border-diamond/50 bg-diamond/5 p-4">
          <p className="text-sm font-medium">Demo mode — try both sides of the product:</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" loading={busy === 'learner'} onClick={() => run('learner', () => demoSignIn('learner'))}>
              <User /> Learner
            </Button>
            <Button variant="outline" size="sm" loading={busy === 'admin'} onClick={() => run('admin', () => demoSignIn('admin'))}>
              <Shield /> Admin
            </Button>
          </div>
        </div>
      )}
      {env.flags.googleSignIn && (
        <Button variant="outline" className="w-full" loading={busy === 'google'} onClick={() => run('google', signInWithGoogle)}>
          <GoogleIcon /> Continue with Google
        </Button>
      )}
      {env.flags.emailLinkSignIn && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or get a sign-in link <span className="h-px flex-1 bg-border" />
          </div>
          <form
            noValidate
            className="space-y-3"
            onSubmit={form.handleSubmit((v) =>
              run('email', async () => {
                await sendEmailLink(v.email, continuePath);
                if (env.backend === 'demo') toast.success('Demo mode: signed in instantly (no email sent).');
                else setSentTo(v.email);
              }),
            )}
          >
            <Field id="signin-email" label="Email" error={form.formState.errors.email?.message}>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
            </Field>
            <Button type="submit" className="w-full" loading={busy === 'email'}>
              Email me a link
            </Button>
          </form>
        </>
      )}
      <p className="text-center text-xs text-muted-foreground">No passwords. By continuing you agree to our terms and privacy policy.</p>
    </div>
  );
}

export function SignInDialog() {
  const { signInRequest, closeSignIn } = useAuth();
  return (
    <Dialog open={signInRequest.open} onOpenChange={(o) => !o && closeSignIn()}>
      <DialogContent>
        <DialogHeader className="items-center text-center">
          <LogoMark size={56} compact decorative />
          <DialogTitle>Welcome, seeker</DialogTitle>
          <DialogDescription>Sign in to register, pay and learn.</DialogDescription>
        </DialogHeader>
        <SignInPanel reason={signInRequest.reason} />
      </DialogContent>
    </Dialog>
  );
}

/** Renders children for signed-in users; otherwise an inline sign-in card. */
export function RequireAuth({ children, reason }: { children: ReactNode; reason?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <>{children}</>;
  return (
    <div className="container flex justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-lift">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={64} compact decorative />
          <h1 className="mt-4 text-3xl font-semibold">Please sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">{reason ?? 'This page needs you to be signed in.'}</p>
        </div>
        <SignInPanel />
      </div>
    </div>
  );
}
