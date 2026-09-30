import { AnimatePresence, motion } from 'framer-motion';
import { Command, LogOut, Menu, Moon, Shield, Sun, User, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from '@/brand/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePreferences } from '@/features/experience/preferences';
import { openCommandPalette } from '@/features/experience/commandBus';
import { routes } from '@/lib/links';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle } from '../ui/overlays';

export const NAV = [
  { to: routes.courses, label: 'Courses' },
  { to: routes.events, label: 'Events' },
  { to: routes.finder, label: 'Find your path' },
  { to: routes.customApps, label: 'Custom apps' },
  { to: routes.about, label: 'About' },
];

export function Header({ introActive }: { introActive: boolean }) {
  const { theme, toggleTheme, sound, setSound } = usePreferences();
  const { user, isAdmin, signOut, requestSignIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-[background-color,box-shadow,border-color] duration-300',
        scrolled ? 'border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-xl' : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center gap-3">
        <Link to="/" className="mr-2 flex items-center rounded-full focus-visible:ring-2" aria-label="Sadhana Sanskritam — home">
          <span data-header-logo className={cn('transition-opacity duration-500', introActive ? 'opacity-0' : 'opacity-100')}>
            <Logo lockup="horizontal" size={40} />
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-accent/15" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                  )}
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-accent hover:text-foreground md:inline-flex"
            aria-label="Open command palette"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
            className="hidden sm:inline-flex"
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === 'dawn' ? 'Switch to dusk (dark) theme' : 'Switch to dawn (light) theme'}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                {theme === 'dawn' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </Button>

          {user ? (
            <div className="hidden items-center gap-1 sm:flex">
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={routes.admin}>
                    <Shield /> Admin
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to={routes.myLearning}>
                  <User /> My Learning
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
                <LogOut />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => requestSignIn()}>
              Sign in
            </Button>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent side="right" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Logo lockup="horizontal" size={40} />
          <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
            {[{ to: '/', label: 'Home' }, ...NAV, { to: routes.contact, label: 'Contact' }].map((item, i) => (
              <motion.div key={item.to} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn('block rounded-2xl px-4 py-3 font-display text-xl transition-colors hover:bg-accent/10', isActive && 'bg-accent/15')
                  }
                >
                  {item.label}
                </NavLink>
              </motion.div>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-2 border-t pt-6">
            {user ? (
              <>
                <Button asChild variant="default">
                  <Link to={routes.myLearning}>My Learning</Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="outline">
                    <Link to={routes.admin}>Admin dashboard</Link>
                  </Button>
                )}
                <Button variant="ghost" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setMobileOpen(false);
                  requestSignIn();
                }}
              >
                Sign in
              </Button>
            )}
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={openCommandPalette}>
                <Command /> Search
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSound(!sound)} aria-pressed={sound}>
                {sound ? <Volume2 /> : <VolumeX />} Sound {sound ? 'on' : 'off'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
