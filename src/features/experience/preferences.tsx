import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import { playTick } from '@/lib/sound';
import { petalPath } from '@/brand/logoGeometry';

export type Theme = 'dawn' | 'dusk';
export type Script = 'deva' | 'iast' | 'en';

interface Preferences {
  theme: Theme;
  toggleTheme: (origin?: { x: number; y: number }) => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  script: Script;
  setScript: (s: Script) => void;
  reducedMotion: boolean;
  /** Play a tick if (and only if) the visitor enabled sound. */
  feedback: () => void;
}

const PreferencesContext = createContext<Preferences | null>(null);

function initialTheme(): Theme {
  const stored = readStorage('local', STORAGE_KEYS.theme);
  if (stored === 'dawn' || stored === 'dusk') return stored;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dusk' : 'dawn';
  } catch {
    return 'dawn';
  }
}

export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dusk');
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme === 'dusk' ? '#0B1026' : '#FFFBF2');
}

interface Transition {
  x: number;
  y: number;
  next: Theme;
  scale: number;
}

const LOTUS_PETALS = [-60, -30, 0, 30, 60].map((a, i) => ({ a, len: i === 2 ? 50 : 44, w: 15 }));

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [sound, setSoundState] = useState(() => readStorage('local', STORAGE_KEYS.sound) === 'on');
  const [script, setScriptState] = useState<Script>(() => {
    const s = readStorage('local', STORAGE_KEYS.script);
    return s === 'iast' || s === 'en' || s === 'deva' ? s : 'deva';
  });
  const [transition, setTransition] = useState<Transition | null>(null);
  const reducedMotion = useReducedMotionPref();

  useEffect(() => applyTheme(theme), [theme]);

  const commitTheme = useCallback((next: Theme) => {
    setTheme(next);
    writeStorage('local', STORAGE_KEYS.theme, next);
  }, []);

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: Theme = theme === 'dawn' ? 'dusk' : 'dawn';
      if (reducedMotion || !origin) {
        commitTheme(next);
        return;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const far = Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y));
      // The lotus glyph is ~100px across; scale it until its inner circle covers the viewport.
      setTransition({ x: origin.x, y: origin.y, next, scale: (far * 2.6) / 60 });
    },
    [theme, reducedMotion, commitTheme],
  );

  const setSound = useCallback((on: boolean) => {
    setSoundState(on);
    writeStorage('local', STORAGE_KEYS.sound, on ? 'on' : 'off');
    if (on) playTick(0.05);
  }, []);

  const setScript = useCallback((s: Script) => {
    setScriptState(s);
    writeStorage('local', STORAGE_KEYS.script, s);
  }, []);

  const feedback = useCallback(() => {
    if (sound) playTick();
  }, [sound]);

  const value = useMemo(
    () => ({ theme, toggleTheme, sound, setSound, script, setScript, reducedMotion, feedback }),
    [theme, toggleTheme, sound, setSound, script, setScript, reducedMotion, feedback],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {transition && (
          <motion.div
            key="theme-transition"
            aria-hidden
            className="pointer-events-none fixed z-[90]"
            style={{ left: transition.x - 50, top: transition.y - 50, width: 100, height: 100 }}
            initial={{ scale: 0, rotate: -30, opacity: 1 }}
            animate={{ scale: transition.scale, rotate: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.65, 0, 0.35, 1] }}
            onAnimationComplete={() => {
              commitTheme(transition.next);
              requestAnimationFrame(() => setTransition(null));
            }}
          >
            <svg viewBox="-50 -50 100 100" width="100" height="100">
              <circle r="30" fill={transition.next === 'dusk' ? '#0B1026' : '#FFFBF2'} />
              {LOTUS_PETALS.map((p) => (
                <path
                  key={p.a}
                  transform={`translate(0 18) rotate(${p.a})`}
                  d={petalPath(p.len, p.w)}
                  fill={transition.next === 'dusk' ? '#0B1026' : '#FFFBF2'}
                />
              ))}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
