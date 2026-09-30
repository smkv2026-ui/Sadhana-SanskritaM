import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '@/features/experience/preferences';
import { playChime } from '@/lib/sound';
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import { clamp } from '@/lib/utils';
import { Logo3D } from './Logo3D';
import { BRAND } from './logoGeometry';

export const REPLAY_INTRO_EVENT = 'ss:replay-intro';

/** Timeline (ms) — keep in sync with brand.css. */
const T = {
  wordmark: 4600,
  settle: 5500,
  reducedHold: 1100,
} as const;

export function replayIntro(): void {
  window.dispatchEvent(new Event(REPLAY_INTRO_EVENT));
}

function shouldPlay(): boolean {
  if (typeof window === 'undefined') return false;
  if (/[?&]nointro\b/.test(window.location.search)) return false;
  if (navigator.webdriver) return false; // keep automated audits deterministic
  return readStorage('session', STORAGE_KEYS.introSeen) !== '1';
}

/**
 * Full-screen signature intro. The app is already mounted and hydrated underneath, so
 * content is never blocked — this overlay only fades away.
 */
export function IntroAnimation({ onVisibilityChange }: { onVisibilityChange?: (visible: boolean) => void }) {
  const { reducedMotion, sound, setSound } = usePreferences();
  const [run, setRun] = useState(0);
  const [visible, setVisible] = useState(shouldPlay);
  const [phase, setPhase] = useState<'playing' | 'wordmark' | 'leaving'>('playing');
  const markRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const controls = useAnimationControls();
  const leavingRef = useRef(false);

  useEffect(() => onVisibilityChange?.(visible), [visible, onVisibilityChange]);

  const finish = useCallback(
    async (fast = false) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      setPhase('leaving');
      writeStorage('session', STORAGE_KEYS.introSeen, '1');

      // Travel the mark to the header logo position when both are measurable.
      const target = document.querySelector('[data-header-logo]');
      const mark = markRef.current;
      if (!fast && !reducedMotion && target && mark) {
        const a = mark.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        if (a.width > 0 && b.width > 0) {
          await controls.start({
            x: b.left + b.width / 2 - (a.left + a.width / 2),
            y: b.top + b.height / 2 - (a.top + a.height / 2),
            scale: b.height / a.height,
            transition: { duration: 0.75, ease: [0.65, 0, 0.35, 1] },
          });
        }
      }
      setVisible(false);
    },
    [controls, reducedMotion],
  );

  // Replay from the footer link.
  useEffect(() => {
    const onReplay = () => {
      leavingRef.current = false;
      controls.set({ x: 0, y: 0, scale: 1 });
      setPhase('playing');
      setRun((r) => r + 1);
      setVisible(true);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener(REPLAY_INTRO_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_INTRO_EVENT, onReplay);
  }, [controls]);

  // Timeline, keyboard skip, focus.
  useEffect(() => {
    if (!visible) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    skipRef.current?.focus({ preventScroll: true });
    const timers: number[] = [];
    if (reducedMotion) {
      timers.push(window.setTimeout(() => setPhase('wordmark'), 100));
      timers.push(window.setTimeout(() => void finish(true), T.reducedHold));
    } else {
      timers.push(window.setTimeout(() => setPhase('wordmark'), T.wordmark));
      timers.push(window.setTimeout(() => void finish(), T.settle));
      if (sound) timers.push(window.setTimeout(() => playChime(), 3700));
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finish(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
      if (previouslyFocused && document.body.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
    };
    // `sound` intentionally read once per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, run, reducedMotion, finish]);

  // Petals lean toward the pointer / device tilt.
  useEffect(() => {
    if (!visible || reducedMotion) return;
    const el = overlayRef.current;
    if (!el) return;
    let frame = 0;
    const setLean = (deg: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => el.style.setProperty('--lean', `${clamp(deg, -9, 9).toFixed(2)}deg`));
    };
    const onMove = (e: PointerEvent) => setLean(((e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 9);
    const onTilt = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma === 'number') setLean(e.gamma / 4);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [visible, reducedMotion]);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 53) % 100}%`,
        top: `${40 + ((i * 29) % 55)}%`,
        size: 4 + ((i * 7) % 9),
        dur: `${8 + (i % 5) * 1.6}s`,
        delay: `${(i % 6) * 0.7}s`,
        dx: `${((i % 3) - 1) * 24}px`,
      })),
    [],
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`intro-${run}`}
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden bg-midnight text-pearl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: phase === 'leaving' ? 0.5 : 0.3 } }}
          transition={{ duration: reducedMotion ? 0.4 : 0.6 }}
          onClick={() => void finish(true)}
          role="dialog"
          aria-modal="false"
          aria-label={`${BRAND.name} welcome animation`}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 45%, rgba(26,47,102,0.9) 0%, rgba(10,22,51,1) 72%), radial-gradient(34% 28% at 50% 40%, rgba(241,198,110,0.22), transparent 70%)',
            }}
          />
          {!reducedMotion && (
            <div aria-hidden className="absolute inset-0">
              {particles.map((p, i) => (
                <span
                  key={i}
                  className="ss-particle"
                  style={
                    {
                      left: p.left,
                      top: p.top,
                      width: p.size,
                      height: p.size,
                      '--dur': p.dur,
                      '--delay': p.delay,
                      '--dx': p.dx,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.div ref={markRef} animate={controls} style={{ originX: 0.5, originY: 0.5 }}>
              <Logo3D key={run} tone="dark" animated={!reducedMotion} fit={{ vh: 46, vw: 78, max: 320 }} decorative />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={phase !== 'playing' ? { opacity: phase === 'leaving' ? 0 : 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="mt-6"
            >
              <p className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{BRAND.name}</p>
              <p lang="sa" className="deva mt-1 text-lg text-saffron-light">
                {BRAND.nameDeva}
              </p>
              <p className="mt-3 text-base italic text-pearl/75">{BRAND.tagline}</p>
            </motion.div>
          </div>

          <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSound(!sound);
                if (!sound) playChime();
              }}
              className="rounded-full border border-pearl/20 bg-white/5 p-2.5 text-pearl/80 backdrop-blur transition hover:bg-white/10 hover:text-pearl"
              aria-pressed={sound}
              aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
            >
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              ref={skipRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void finish(true);
              }}
              className="rounded-full border border-pearl/25 bg-white/5 px-4 py-2 text-sm font-medium text-pearl backdrop-blur transition hover:bg-white/15 focus-visible:ring-saffron"
            >
              Skip intro <span className="sr-only">(or press Escape)</span>
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            Welcome to {BRAND.name}. {BRAND.tagline}.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
