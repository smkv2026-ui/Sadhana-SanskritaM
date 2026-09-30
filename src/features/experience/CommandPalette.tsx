import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  BookOpen,
  Calendar,
  Compass,
  FileText,
  GraduationCap,
  Home,
  Info,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Moon,
  Play,
  Search,
  Wand2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { replayIntro } from '@/brand/IntroAnimation';
import { useCourses, useTaxonomy } from '@/data/queries';
import { routes } from '@/lib/links';
import { useAuth } from '../auth/AuthProvider';
import { OPEN_PALETTE_EVENT, openAssistant } from './commandBus';
import { usePreferences } from './preferences';

function Item({ icon, children, onSelect, hint, value }: { icon: ReactNode; children: ReactNode; onSelect: () => void; hint?: string; value?: string }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent/15 aria-selected:text-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground"
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Command.Item>
  );
}

const groupCls =
  'px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: courses } = useCourses({ enabled: open });
  const { user, isAdmin, requestSignIn } = useAuth();
  const { toggleTheme, theme } = usePreferences();
  const taxonomy = useTaxonomy();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-midnight/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[10svh] z-[61] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-3xl border bg-popover shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <Command label="Command palette" loop>
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Command.Input
                autoFocus
                placeholder="Search courses, pages and actions…"
                className="h-14 min-w-0 flex-1 bg-transparent text-base sm:text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Esc</kbd>
            </div>
            <Command.List className="max-h-[60dvh] overflow-y-auto p-2">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">No matches. Try “grammar” or “events”.</Command.Empty>
              <Command.Group heading="Pages" className={groupCls}>
                <Item icon={<Home />} onSelect={() => go('/')}>Home</Item>
                <Item icon={<BookOpen />} onSelect={() => go(routes.courses)}>All courses</Item>
                <Item icon={<Calendar />} onSelect={() => go(routes.events)}>Events timeline</Item>
                <Item icon={<Compass />} onSelect={() => go(routes.finder)}>Find your path (quiz)</Item>
                <Item icon={<GraduationCap />} onSelect={() => go(routes.myLearning)}>My Learning</Item>
                <Item icon={<Wand2 />} onSelect={() => go(routes.customApps)}>Build me a custom app</Item>
                <Item icon={<Info />} onSelect={() => go(routes.about)}>About us</Item>
                <Item icon={<Mail />} onSelect={() => go(routes.contact)}>Contact</Item>
                {isAdmin && <Item icon={<LayoutDashboard />} onSelect={() => go(routes.admin)}>Admin dashboard</Item>}
              </Command.Group>
              <Command.Group heading="Paths" className={groupCls}>
                {taxonomy.categories.flatMap((cat) => [
                  <Item key={cat.id} value={`${cat.label} ${cat.blurb}`} icon={<span aria-hidden>{cat.emoji}</span>} onSelect={() => go(`${routes.courses}?cat=${cat.id}`)}>
                    {cat.label}
                  </Item>,
                  ...cat.subs.map((sub) => (
                    <Item
                      key={`${cat.id}-${sub.id}`}
                      value={`${cat.label} ${sub.label}`}
                      icon={<span aria-hidden className="opacity-60">{cat.emoji}</span>}
                      hint={cat.label}
                      onSelect={() => go(`${routes.courses}?cat=${cat.id}&sub=${sub.id}`)}
                    >
                      {sub.label}
                    </Item>
                  )),
                ])}
              </Command.Group>
              {courses && courses.length > 0 && (
                <Command.Group heading="Courses & events" className={groupCls}>
                  {courses.map((c) => (
                    <Item
                      key={c.id}
                      value={`${c.title} ${c.tags.join(' ')} ${c.level} ${c.type} ${c.subcategory ?? ''} ${c.variant ?? ''}`}
                      icon={c.kind === 'event' ? <Calendar /> : <BookOpen />}
                      hint={c.kind === 'event' ? 'Event' : c.level}
                      onSelect={() => go(routes.course(c.slug))}
                    >
                      {c.title}
                    </Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading="Actions" className={groupCls}>
                <Item icon={<Mail />} onSelect={() => go(routes.subscribe)}>Get notified about new courses</Item>
                <Item icon={<MessageCircle />} onSelect={() => run(openAssistant)}>Ask the assistant</Item>
                <Item icon={<Moon />} onSelect={() => run(() => toggleTheme())}>
                  Switch to {theme === 'dawn' ? 'dusk' : 'dawn'} theme
                </Item>
                <Item icon={<Play />} onSelect={() => run(replayIntro)}>Replay intro</Item>
                <Item icon={<FileText />} onSelect={() => go(routes.customAppsTrack)}>Track my custom app request</Item>
                {!user && <Item icon={<GraduationCap />} onSelect={() => run(() => requestSignIn())}>Sign in</Item>}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
