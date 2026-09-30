import { Sparkles } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { IntroAnimation } from '@/brand/IntroAnimation';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthProvider';
import { CursorGlow } from '@/features/experience/Ambient';
import { usePreferences } from '@/features/experience/preferences';
import { PageLoader } from '../components/States';
import { Footer } from './Footer';
import { Header } from './Header';

const CommandPalette = lazy(() => import('@/features/experience/CommandPalette'));
const Assistant = lazy(() => import('@/features/experience/Assistant'));
const SignInDialog = lazy(() => import('@/features/auth/SignIn').then((m) => ({ default: m.SignInDialog })));

function DemoBanner() {
  if (env.backend !== 'demo') return null;
  return (
    <div className="relative z-50 bg-midnight px-4 py-2 text-center text-xs text-pearl">
      <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-saffron-light" aria-hidden />
      <span className="sm:hidden">Demo mode — data stays in this browser.</span>
      <span className="hidden sm:inline">
        Demo mode — Firebase isn’t connected yet, so data is stored only in this browser. Sign in as a demo learner or admin to try everything.
      </span>
    </div>
  );
}

export function Layout() {
  const { theme } = usePreferences();
  const [introActive, setIntroActive] = useState(false);
  const { signInRequest } = useAuth();
  const { pathname } = useLocation();
  // Soft fade/blur between pages; admin sub-tabs keep their own transitions.
  const routeKey = pathname.startsWith('/admin') ? '/admin' : pathname;
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[200] rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {env.flags.intro && <IntroAnimation onVisibilityChange={setIntroActive} />}
      <DemoBanner />
      <CursorGlow />
      <Header introActive={introActive} />
      <main id="main" tabIndex={-1} className="relative z-10 min-h-[70svh] outline-none">
        <div key={routeKey} className="route-enter">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Footer />
      <Suspense fallback={null}>
        {signInRequest.open && <SignInDialog />}
        <CommandPalette />
        {env.flags.assistant && <Assistant />}
      </Suspense>
      <Toaster theme={theme === 'dusk' ? 'dark' : 'light'} position="top-center" richColors closeButton />
      <ScrollRestoration />
    </>
  );
}
