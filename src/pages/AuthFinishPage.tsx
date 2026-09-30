import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { backend } from '@/data';
import { routes } from '@/lib/links';
import { PageMeta } from '@/shared/components/PageMeta';
import { PageLoader } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/primitives';

/** Landing page for passwordless email-link sign-in. */
export default function AuthFinishPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'working' | 'need-email' | 'error'>('working');
  const [email, setEmail] = useState('');
  const ran = useRef(false);
  const next = params.get('next')?.startsWith('/') ? (params.get('next') as string) : routes.myLearning;

  const complete = async (address: string | null) => {
    setState('working');
    try {
      const res = await (await backend()).auth.completeEmailLink(window.location.href, address);
      if (res === 'need-email') setState('need-email');
      else navigate(next, { replace: true });
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void complete(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container max-w-md py-20">
      <PageMeta title="Signing you in" noindex />
      {state === 'working' && <PageLoader />}
      {state === 'need-email' && (
        <form
          className="space-y-4 rounded-3xl border bg-card p-8"
          onSubmit={(e) => {
            e.preventDefault();
            void complete(email);
          }}
        >
          <h1 className="text-2xl font-semibold">Confirm your email</h1>
          <p className="text-sm text-muted-foreground">You opened the link on a different device. Enter the email address you used so we can finish signing you in.</p>
          <Field id="finish-email" label="Email">
            <Input id="finish-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      )}
      {state === 'error' && (
        <div className="rounded-3xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold">This link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign-in links work once and expire after a while. Request a fresh one.</p>
          <Button className="mt-6" onClick={() => navigate(routes.signIn)}>
            Get a new link
          </Button>
        </div>
      )}
    </div>
  );
}
