import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSubhashitas } from '@/data/queries';
import type { Subhashita } from '@/data/types';
import { Skeleton } from '@/shared/ui/primitives';
import { usePreferences } from './preferences';

/** Deterministic "of the day" pick so every visitor sees the same verse today. */
export function pickOfTheDay<T>(items: T[], date: Date = new Date()): T | undefined {
  if (items.length === 0) return undefined;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return items[day % items.length];
}

export function SubhashitaCard() {
  const { data, isLoading } = useSubhashitas();
  const [revealed, setRevealed] = useState(false);
  const { script, feedback } = usePreferences();
  const verse: Subhashita | undefined = useMemo(() => pickOfTheDay((data ?? []).filter((s) => s.active)), [data]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;
  if (!verse) return null;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-midnight via-midnight-800 to-midnight-700 p-8 text-pearl shadow-lift sm:p-12"
    >
      <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-saffron/20 blur-3xl" />
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-saffron-light">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Subhāṣita of the day
      </p>
      <blockquote className="mt-6">
        <p lang="sa" className="deva text-balance text-2xl leading-relaxed sm:text-3xl">
          {verse.deva}
        </p>
        {script !== 'deva' && <p className="mt-3 text-lg italic text-pearl/80">{verse.iast}</p>}
      </blockquote>
      <div className="mt-6 min-h-[64px]">
        <AnimatePresence mode="wait" initial={false}>
          {revealed ? (
            <motion.div key="m" initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }}>
              <p className="text-lg">{verse.meaning}</p>
              {verse.source && <figcaption className="mt-2 text-sm text-pearl/60">— {verse.source}</figcaption>}
            </motion.div>
          ) : (
            <motion.button
              key="b"
              type="button"
              exit={{ opacity: 0 }}
              onClick={() => {
                setRevealed(true);
                feedback();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-pearl/25 bg-white/5 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/10"
            >
              <Eye className="h-4 w-4" /> Tap to reveal the meaning
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.figure>
  );
}
