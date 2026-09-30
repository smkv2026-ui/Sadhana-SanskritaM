import { motion } from 'framer-motion';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { usePreferences } from './preferences';

/**
 * Sacred ornaments used across the site: a top-view, fully bloomed lotus mandala that sits
 * behind the logo, a lotus divider that draws itself in, and a flickering diya.
 * Pure SVG + CSS. The mandala's position is set by its wrapper and never animated; only
 * the petal layers inside it unfold once and then "breathe" around their own centre.
 */

interface PetalLayer {
  count: number;
  /** inner / outer radius of each petal */
  r0: number;
  r1: number;
  /** half-width of the petal */
  w: number;
  offset: number;
  vein?: boolean;
}

const LAYERS: PetalLayer[] = [
  { count: 16, r0: 30, r1: 88, w: 15, offset: 0, vein: true },
  { count: 16, r0: 24, r1: 72, w: 13, offset: 11.25, vein: true },
  { count: 8, r0: 17, r1: 54, w: 13, offset: 22.5 },
  { count: 8, r0: 11, r1: 38, w: 10, offset: 0 },
];

const petalPath = ({ r0, r1, w }: PetalLayer) => {
  const len = r1 - r0;
  return `M0,${-r0} C${w},${-r0 - len * 0.28} ${w * 0.85},${-r0 - len * 0.72} 0,${-r1} C${-w * 0.85},${-r0 - len * 0.72} ${-w},${-r0 - len * 0.28} 0,${-r0}Z`;
};

export function LotusMandala({ className, animated = true }: { className?: string; animated?: boolean }) {
  const { reducedMotion } = usePreferences();
  const live = animated && !reducedMotion;
  const uid = useId().replace(/:/g, '');
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" className={cn('lotus-mandala overflow-visible', className)}>
      <defs>
        <linearGradient id={`lp-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" style={{ stopColor: 'var(--lotus-base)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--lotus-tip)' }} />
        </linearGradient>
        <radialGradient id={`lh-${uid}`}>
          <stop offset="0%" style={{ stopColor: 'var(--lotus-halo)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--lotus-halo)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle r={99} fill={`url(#lh-${uid})`} />
      {/* Outer rings: a string of pearls and a fine gold line. */}
      <g className={cn(live && 'lotus-pearls')}>
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          return <circle key={i} cx={Math.sin(a) * 95} cy={-Math.cos(a) * 95} r={i % 3 === 0 ? 1.1 : 0.55} className="lotus-dot" />;
        })}
      </g>
      <circle r={91} fill="none" className="lotus-line" strokeWidth={0.35} />
      {LAYERS.map((layer, li) => (
        <g key={li} className={cn(live && 'lotus-open')} style={{ animationDelay: `${0.15 + (LAYERS.length - li) * 0.18}s` }}>
          <g className={cn(live && 'lotus-breathe')} style={{ animationDelay: `${li * 0.6}s` }}>
            {Array.from({ length: layer.count }, (_, i) => {
              const rot = layer.offset + (360 / layer.count) * i;
              return (
                <g key={i} transform={`rotate(${rot})`}>
                  <path d={petalPath(layer)} fill={`url(#lp-${uid})`} className="lotus-petal" strokeWidth={li < 2 ? 0.55 : 0.65} />
                  {layer.vein && <path d={`M0,${-layer.r0 - 3} L0,${-layer.r1 + 8}`} className="lotus-line" strokeWidth={0.3} />}
                </g>
              );
            })}
          </g>
        </g>
      ))}
      {/* Stamens around the seed pod. */}
      <g className={cn(live && 'lotus-open')} style={{ animationDelay: '0.1s' }}>
        {Array.from({ length: 28 }, (_, i) => (
          <g key={i} transform={`rotate(${(360 / 28) * i})`}>
            <line y1={-9} y2={-14.5} className="lotus-line" strokeWidth={0.45} />
            <circle cy={-15.2} r={0.9} className="lotus-dot" />
          </g>
        ))}
        <circle r={8.5} className="lotus-pod" strokeWidth={0.6} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <circle key={a} cx={Math.sin((a * Math.PI) / 180) * 4.6} cy={-Math.cos((a * Math.PI) / 180) * 4.6} r={1.1} className="lotus-dot" />
        ))}
        <circle r={1.3} className="lotus-dot" />
      </g>
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
