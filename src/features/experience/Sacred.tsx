import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePreferences } from './preferences';

/**
 * Sacred-geometry ornaments used across the site: a slowly turning mandala (hero / section
 * backdrops) and a lotus divider that draws itself in when it scrolls into view.
 * Pure SVG + CSS — no images, no runtime cost when off-screen (animations are compositor-only).
 */
export function Mandala({ className, petals = 16, rings = 5 }: { className?: string; petals?: number; rings?: number }) {
  const { reducedMotion } = usePreferences();
  const petal = 'M0,-46 C9,-34 9,-18 0,-10 C-9,-18 -9,-34 0,-46Z';
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" className={cn('mandala', !reducedMotion && 'mandala-spin', className)} fill="none" stroke="currentColor">
      {Array.from({ length: rings }, (_, i) => (
        <circle key={`c${i}`} r={20 + i * 17} strokeWidth={i % 2 ? 0.25 : 0.45} strokeDasharray={i % 2 ? '1.5 3' : undefined} />
      ))}
      <g className={cn(!reducedMotion && 'mandala-spin-rev')}>
        {Array.from({ length: petals }, (_, i) => (
          <path key={`p${i}`} d={petal} transform={`rotate(${(360 / petals) * i}) translate(0,-26)`} strokeWidth={0.5} />
        ))}
      </g>
      {Array.from({ length: petals * 2 }, (_, i) => (
        <path key={`o${i}`} d="M0,-92 C4,-86 4,-80 0,-76 C-4,-80 -4,-86 0,-92Z" transform={`rotate(${(360 / (petals * 2)) * i})`} strokeWidth={0.35} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`l${i}`} y1={-18} y2={-72} transform={`rotate(${45 * i + 22.5})`} strokeWidth={0.2} />
      ))}
      <circle r={6} strokeWidth={0.6} />
      <circle r={2} fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Lotus flourish between sections — lines draw outward, petals fade up. */
export function LotusDivider({ className }: { className?: string }) {
  const { reducedMotion } = usePreferences();
  const draw = reducedMotion
    ? {}
    : { initial: { pathLength: 0, opacity: 0 }, whileInView: { pathLength: 1, opacity: 1 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 1.4, ease: 'easeInOut' as const } };
  const bloom = (d: number) =>
    reducedMotion
      ? {}
      : { initial: { opacity: 0, y: 6, scale: 0.8 }, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true }, transition: { duration: 0.8, delay: 0.5 + d } };
  return (
    <div className={cn('container flex justify-center py-6 text-primary', className)} aria-hidden>
      <svg viewBox="0 0 320 40" className="h-8 w-full max-w-md overflow-visible sm:h-10" fill="none" stroke="currentColor" strokeLinecap="round">
        <motion.path d="M4 26 H118" strokeWidth={1} {...draw} className="opacity-60" />
        <motion.path d="M316 26 H202" strokeWidth={1} {...draw} className="opacity-60" />
        <motion.circle cx={122} cy={26} r={1.8} fill="currentColor" stroke="none" {...bloom(0.4)} />
        <motion.circle cx={198} cy={26} r={1.8} fill="currentColor" stroke="none" {...bloom(0.4)} />
        <motion.path d="M160 30 C150 22 150 10 160 2 C170 10 170 22 160 30Z" strokeWidth={1.1} fill="hsl(var(--primary) / 0.12)" {...bloom(0)} />
        <motion.path d="M158 30 C146 28 136 20 134 10 C146 12 154 20 158 30Z" strokeWidth={1} {...bloom(0.1)} />
        <motion.path d="M162 30 C174 28 184 20 186 10 C174 12 166 20 162 30Z" strokeWidth={1} {...bloom(0.1)} />
        <motion.path d="M156 31 C144 32 132 28 126 20 C138 19 150 24 156 31Z" strokeWidth={0.8} className="opacity-70" {...bloom(0.2)} />
        <motion.path d="M164 31 C176 32 188 28 194 20 C182 19 170 24 164 31Z" strokeWidth={0.8} className="opacity-70" {...bloom(0.2)} />
        <motion.path d="M140 34 H180" strokeWidth={1} {...draw} />
      </svg>
    </div>
  );
}

/** A small flickering diya flame — used as an accent beside CTAs and headings. */
export function Diya({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={cn('h-6 w-6', className)}>
      <defs>
        <radialGradient id="diya-flame" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#FFF4C2" />
          <stop offset="45%" stopColor="#F5B642" />
          <stop offset="100%" stopColor="#E0762B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="18" rx="10" ry="12" fill="url(#diya-flame)" className="diya-halo" />
      <path d="M20 8 C24 14 24 19 20 22 C16 19 16 14 20 8Z" fill="#FFD66B" className="diya-flame" />
      <path d="M6 26 C10 34 30 34 34 26 Z" fill="currentColor" />
      <path d="M4 25 H36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
