import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { BRAND, petalPath } from './logoGeometry';
import './logo3d.css';

/**
 * The signature mark built as a real 3D scene with CSS transforms (no WebGL, no raster):
 * an open book with page thickness hinged at the spine, a stem made of crossed planes,
 * a white lotus whose petals are arranged in 3D rings around the stem, and a faceted,
 * spinning diamond. Only transform/opacity are animated → smooth on mid-range phones.
 *
 * Stage coordinates: 240 × 260 box, scaled to `size` (height in px).
 */

interface PetalRing {
  layer: 0 | 1 | 2 | 3;
  count: number;
  len: number;
  w: number;
  radius: number;
  tilt: number;
  offset: number;
}

// Inner rings stay upright (the cup); outer rings open wide.
export const PETAL_RINGS: PetalRing[] = [
  { layer: 3, count: 9, len: 44, w: 16, radius: 12, tilt: 76, offset: 20 },
  { layer: 2, count: 9, len: 56, w: 18, radius: 9, tilt: 54, offset: 0 },
  { layer: 1, count: 7, len: 62, w: 17, radius: 6, tilt: 31, offset: 25 },
  { layer: 0, count: 5, len: 64, w: 14, radius: 3, tilt: 12, offset: 0 },
];

const GEM = { R: 17, r: 9.5, crownH: 8, pavH: 21, sides: 8 } as const;

function Petal({ ring, index, gradId }: { ring: PetalRing; index: number; gradId: string }) {
  const angle = ring.offset + (360 / ring.count) * index;
  const style = {
    '--a': `${angle}deg`,
    '--r': `${ring.radius}px`,
    '--tilt': `${ring.tilt}deg`,
    '--layer': ring.layer,
    '--bl': `var(--b${ring.layer}, 1)`,
    width: ring.w * 2,
    height: ring.len,
    left: -ring.w,
  } as CSSProperties;
  // Shade petals facing away from the light a little darker (static per petal).
  const shade = 0.94 + 0.06 * Math.cos(((angle - 20) * Math.PI) / 180);
  return (
    <div className="l3-petal" style={style}>
      <svg viewBox={`${-ring.w} ${-ring.len} ${ring.w * 2} ${ring.len}`} width={ring.w * 2} height={ring.len} aria-hidden>
        <path
          d={petalPath(ring.len, ring.w)}
          fill={`url(#${gradId})`}
          className="l3-petal-face"
        />
        {/* cheap shading overlay instead of a CSS filter (filters are costly on 3D layers) */}
        <path d={petalPath(ring.len, ring.w)} fill="#b98a5a" fillOpacity={(1 - shade) * 1.6} stroke="none" />
        <path d={`M0 -2 L0 ${-ring.len * 0.8}`} className="l3-petal-vein" />
      </svg>
    </div>
  );
}

function Gem() {
  const { R, r, crownH, pavH, sides } = GEM;
  const step = 360 / sides;
  const side = 2 * R * Math.sin(Math.PI / sides);
  const apothem = R * Math.cos(Math.PI / sides);
  const tableSide = 2 * r * Math.sin(Math.PI / sides);
  const tableApothem = r * Math.cos(Math.PI / sides);
  const pavSlant = Math.hypot(pavH, apothem);
  const pavTilt = (Math.atan2(apothem, pavH) * 180) / Math.PI;
  const crownSlant = Math.hypot(crownH, apothem - tableApothem);
  const crownTilt = (Math.atan2(apothem - tableApothem, crownH) * 180) / Math.PI;
  const inset = ((side - tableSide) / 2 / side) * 100;
  return (
    <div className="l3-gem-spin">
      {Array.from({ length: sides }, (_, k) => {
        const light = 0.55 + 0.45 * Math.abs(Math.cos(((k * step + 30) * Math.PI) / 180));
        return (
          <div key={`p${k}`}>
            {/* pavilion: triangle from girdle edge down to the culet */}
            <div
              className="l3-facet l3-facet-pav"
              style={
                {
                  width: side,
                  height: pavSlant,
                  left: -side / 2,
                  top: 0,
                  transform: `rotateY(${k * step}deg) translateZ(${apothem}px) rotateX(${-pavTilt}deg)`,
                  '--l': light,
                } as CSSProperties
              }
            />
            {/* crown: trapezoid from girdle up to the table */}
            <div
              className="l3-facet l3-facet-crown"
              style={
                {
                  width: side,
                  height: crownSlant,
                  left: -side / 2,
                  top: -crownSlant,
                  clipPath: `polygon(0 100%, 100% 100%, ${100 - inset}% 0, ${inset}% 0)`,
                  transform: `rotateY(${k * step}deg) translateZ(${apothem}px) rotateX(${crownTilt}deg)`,
                  '--l': 0.75 + 0.35 * light,
                } as CSSProperties
              }
            />
          </div>
        );
      })}
      <div
        className="l3-facet l3-gem-table"
        style={{ width: r * 2, height: r * 2, left: -r, top: -r, transform: `translateY(${-crownH}px) rotateX(90deg)` }}
      />
    </div>
  );
}

function BookHalf({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={cn('l3-half', side === 'left' ? 'l3-half-l' : 'l3-half-r')}>
      <div className="l3-cover" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="l3-sheet" style={{ transform: `translateZ(${1 + i * 1.1}px)` } as CSSProperties} />
      ))}
      <div className="l3-sheet l3-sheet-top" style={{ transform: 'translateZ(7.8px)' }}>
        <svg viewBox="0 0 90 70" width="90" height="70" aria-hidden>
          {[22, 32, 42, 52].map((y) => (
            <path key={y} d={side === 'left' ? `M14 ${y} Q46 ${y - 5} 80 ${y}` : `M10 ${y} Q44 ${y - 5} 76 ${y}`} className="l3-line" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function StemPlane({ turn, leaf }: { turn: number; leaf: 'left' | 'right' }) {
  return (
    <div className="l3-stem-plane" style={{ transform: `rotateY(${turn}deg)` }}>
      <svg viewBox="-30 0 60 92" width="60" height="92" aria-hidden>
        <path d="M0 92 C-5 70 6 42 0 0" className="l3-stem-path" />
        {leaf === 'right' ? (
          <path d="M1 50 C10 40 22 38 30 30 C18 30 8 36 1 50Z" className="l3-leaf" />
        ) : (
          <path d="M-1 70 C-10 64 -20 64 -28 57 C-18 55 -8 58 -1 70Z" className="l3-leaf" />
        )}
      </svg>
    </div>
  );
}

export interface Logo3DProps {
  /** Height in px. */
  size?: number;
  /** Play the book-opens → stem-grows → bloom → diamond sequence once. */
  animated?: boolean;
  /** Petal openness read from --b0…--b3 set by an ancestor (scroll story). */
  bloomControlled?: boolean;
  /** Follow pointer / device tilt. */
  interactive?: boolean;
  /** Light or dark surroundings (book colours). */
  tone?: 'auto' | 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
  glint?: boolean;
  /** Size responsively: height = min(max, vh% of viewport height, vw% of viewport width × 260/240). */
  fit?: { vh: number; vw: number; max: number };
}

function useFitSize(size: number, fit?: Logo3DProps['fit']): number {
  const calc = () =>
    fit && typeof window !== 'undefined'
      ? Math.round(Math.min(fit.max, (window.innerHeight * fit.vh) / 100, ((window.innerWidth * fit.vw) / 100) * (260 / 240)))
      : size;
  const [value, setValue] = useState(calc);
  useEffect(() => {
    if (!fit) return;
    const on = () => setValue(calc());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit?.vh, fit?.vw, fit?.max, size]);
  return value;
}

export function Logo3D({
  size = 260,
  animated = false,
  bloomControlled = false,
  interactive = true,
  tone = 'auto',
  className,
  style,
  decorative = false,
  glint = false,
  fit,
}: Logo3DProps) {
  size = useFitSize(size, fit);
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const gradId = `l3${useId().replace(/:/g, '')}`;
  const scale = size / 260;

  // Pause every animation while the scene is off-screen or the tab is hidden.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute('data-paused', !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Lean toward the pointer (desktop) or device tilt (phones).
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || !interactive) return;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch {
      /* ignore */
    }
    let frame = 0;
    const set = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--px', `${(x * 16).toFixed(2)}deg`);
        el.style.setProperty('--py', `${(-y * 10).toFixed(2)}deg`);
      });
    };
    const onMove = (e: PointerEvent) => set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
    const onTilt = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma === 'number' && typeof e.beta === 'number') set(Math.max(-1, Math.min(1, e.gamma / 45)) / 2, Math.max(-1, Math.min(1, (e.beta - 45) / 45)) / 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [interactive]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'l3-root',
        animated && 'is-animated',
        bloomControlled && 'is-bloom',
        glint && 'do-glint',
        tone === 'light' && 'l3-tone-light',
        tone === 'dark' && 'l3-tone-dark',
        className,
      )}
      style={{ width: Math.round(240 * scale), height: Math.round(size), ...style }}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : BRAND.name}
    >
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#F2D9C4" />
            <stop offset=".35" stopColor="#FFF6EC" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="l3-scale" style={{ transform: `scale(${scale})` }}>
        <div className="l3-glow" />
        <div ref={tiltRef} className="l3-tilt">
          <div className="l3-stage">
            <div className="l3-book">
              <div className="l3-book-inner">
                <BookHalf side="left" />
                <BookHalf side="right" />
                <div className="l3-spine" />
              </div>
            </div>
            <div className="l3-stem">
              <StemPlane turn={0} leaf="right" />
              <StemPlane turn={90} leaf="left" />
            </div>
            <div className="l3-flower">
              <div className="l3-halo" />
              <div className="l3-pod" />
              {PETAL_RINGS.map((ring) =>
                Array.from({ length: ring.count }, (_, i) => <Petal key={`${ring.layer}-${i}`} ring={ring} index={i} gradId={gradId} />),
              )}
            </div>
            <div className="l3-gem">
              <div className="l3-gem-drop">
                <Gem />
                <div className="l3-glint" />
                <div className="l3-sparkle" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
