import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { petalPath } from '@/brand/logoGeometry';
import { playChime } from '@/lib/sound';
import { usePreferences } from './preferences';

/** Lotus-petal burst used when a payment is approved (and other happy moments). */
export function Celebration({ show, onDone }: { show: boolean; onDone?: () => void }) {
  const { reducedMotion, sound } = usePreferences();
  const petals = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 0 : 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 160 + ((i * 37) % 180);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          rot: (i * 47) % 360,
          scale: 0.6 + ((i * 13) % 10) / 12,
          color: ['#FFFFFF', '#FBEDEA', '#F1C66E', '#6FDDEB'][i % 4],
          delay: (i % 7) * 0.03,
        };
      }),
    [reducedMotion],
  );

  useEffect(() => {
    if (!show) return;
    if (sound) playChime(0.07);
    const t = setTimeout(() => onDone?.(), 2600);
    return () => clearTimeout(t);
  }, [show, sound, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          {petals.map((p, i) => (
            <motion.svg
              key={i}
              width="28"
              height="40"
              viewBox="-14 -36 28 40"
              className="absolute"
              initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 220], scale: p.scale, rotate: p.rot + 180, opacity: [1, 1, 0] }}
              transition={{ duration: 2.3, delay: p.delay, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }}
            >
              <path d={petalPath(32, 11)} fill={p.color} stroke="#D9A441" strokeWidth="0.8" />
            </motion.svg>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
