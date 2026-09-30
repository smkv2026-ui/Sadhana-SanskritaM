import { forwardRef, useId, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { ANCHORS, BOOK, BRAND, DIAMOND, LEAVES, PETALS, STEM, VIEWBOX, petalPath } from './logoGeometry';

export type LogoVariant = 'auto' | 'full' | 'full-dark' | 'mono';

export interface LogoProps {
  variant?: LogoVariant;
  /** Height of the mark in px (the lockup text scales with it). */
  size?: number;
  /** Play the book → stem → bloom → diamond sequence once on mount. */
  animated?: boolean;
  /** icon = mark only, horizontal = mark + wordmark, stacked = mark above wordmark. */
  lockup?: 'icon' | 'horizontal' | 'stacked';
  /** Drop the book and stem (tiny sizes). */
  compact?: boolean;
  /**
   * Scroll-driven bloom. When true, petal openness is read from the CSS variables
   * --b0…--b3 (0 = closed bud, 1 = open) that an ancestor sets.
   */
  bloomControlled?: boolean;
  showTagline?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  decorative?: boolean;
}

const toneClass: Record<LogoVariant, string> = {
  auto: '',
  full: 'tone-full',
  'full-dark': 'tone-full-dark',
  mono: 'tone-mono',
};

export const LogoMark = forwardRef<SVGSVGElement, Omit<LogoProps, 'lockup' | 'showTagline'>>(function LogoMark(
  {
    variant = 'auto',
    size = 48,
    animated = false,
    compact = false,
    bloomControlled = false,
    className,
    style,
    title,
    decorative,
  },
  ref,
) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `ss${uid}-${n}`;
  const vb = compact ? '52 10 136 136' : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`;
  const ratio = compact ? 1 : VIEWBOX.width / VIEWBOX.height;
  const label = title ?? BRAND.name;
  const mono = variant === 'mono';

  return (
    <svg
      ref={ref}
      viewBox={vb}
      width={Math.round(size * ratio)}
      height={size}
      className={cn('ss-logo shrink-0 overflow-visible', toneClass[variant], animated && 'is-animated', className)}
      style={style}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      focusable="false"
    >
      {!decorative && <title>{label}</title>}
      <defs>
        <linearGradient id={id('petal')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--logo-petal-base)' }} />
          <stop offset=".45" style={{ stopColor: 'var(--logo-petal-mid)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-petal-tip)' }} />
        </linearGradient>
        <radialGradient id={id('halo')}>
          <stop offset="0" style={{ stopColor: 'var(--logo-halo)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-halo)', stopOpacity: 0 }} />
        </radialGradient>
        <clipPath id={id('diamond-clip')}>
          <path d={DIAMOND.outline} />
        </clipPath>
      </defs>

      <circle
        className="logo-halo"
        cx={ANCHORS.flowerBase.x}
        cy={ANCHORS.flowerBase.y - 30}
        r={62}
        fill={`url(#${id('halo')})`}
      />

      {!compact && (
        <g transform={`translate(${ANCHORS.spine.x} ${ANCHORS.spine.y})`}>
          {/* Inner group: CSS transforms on it must not clobber the positioning attribute above. */}
          <g className="logo-book">
          {(
            [
              [BOOK.coverLeft, BOOK.pageLeft, BOOK.linesLeft],
              [BOOK.coverRight, BOOK.pageRight, BOOK.linesRight],
            ] as const
          ).map(([cover, page, lines]) => (
            <g key={cover} className="logo-book-side">
              <path className="logo-cover" d={cover} style={{ fill: 'var(--logo-cover)' }} />
              <path
                className="logo-page"
                d={page}
                style={{ fill: 'var(--logo-page)', stroke: 'var(--logo-line)' }}
                strokeWidth={0.8}
              />
              {lines.map((d) => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  style={{ stroke: 'var(--logo-line)' }}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.7}
                />
              ))}
            </g>
          ))}
          </g>
        </g>
      )}

      <g className="logo-sway">
        {!compact && (
          <>
            <path
              className="logo-stem"
              d={STEM}
              pathLength={1}
              fill="none"
              style={{ stroke: 'var(--logo-stem)' }}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <path className="logo-leaf-r" d={LEAVES.right} style={{ fill: 'var(--logo-leaf)', stroke: 'var(--logo-leaf)' }} strokeWidth={0.6} />
            <path className="logo-leaf-l" d={LEAVES.left} style={{ fill: 'var(--logo-leaf)', stroke: 'var(--logo-leaf)' }} strokeWidth={0.6} />
          </>
        )}

        <g transform={`translate(${ANCHORS.flowerBase.x} ${ANCHORS.flowerBase.y})`}>
          <g className="logo-flower">
            {PETALS.map((p, i) => {
              const petalStyle = {
                '--a': `${p.angle}deg`,
                '--layer': p.layer,
                fill: `url(#${id('petal')})`,
                stroke: 'var(--logo-petal-stroke)',
                ...(bloomControlled
                  ? {
                      transform: `rotate(calc(var(--a) * var(--b${p.layer}, 1))) scale(calc(0.3 + 0.7 * var(--b${p.layer}, 1)))`,
                      opacity: `calc(0.2 + 0.8 * var(--b${p.layer}, 1))`,
                    }
                  : {}),
              } as CSSProperties;
              return (
                <path
                  key={i}
                  className="logo-petal"
                  transform={`rotate(${p.angle})`}
                  d={petalPath(p.len, p.w)}
                  style={petalStyle}
                  strokeWidth={mono ? 1.6 : 1}
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
        </g>

        <g transform={`translate(${ANCHORS.diamond.x} ${ANCHORS.diamond.y})`}>
          <g className="logo-diamond">
            {DIAMOND.facets.map((f) => (
              <path key={f.d} className="logo-facet" d={f.d} style={{ fill: `var(--logo-d-${f.tone})` }} strokeLinejoin="round" />
            ))}
            <path
              d={DIAMOND.outline}
              fill="none"
              style={{ stroke: 'var(--logo-d-stroke)' }}
              strokeWidth={mono ? 1.8 : 1}
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${id('diamond-clip')})`}>
              <path className="logo-glint" d={DIAMOND.glint} fill="#fff" />
            </g>
          </g>
        </g>
        <g transform="translate(133 26)">
          <path className="logo-sparkle" d={DIAMOND.sparkle} fill="#fff" />
        </g>
      </g>
    </svg>
  );
});

export function Logo({ lockup = 'icon', size = 40, showTagline = false, className, ...rest }: LogoProps) {
  if (lockup === 'icon') return <LogoMark size={size} className={className} {...rest} />;

  const stacked = lockup === 'stacked';
  return (
    <span className={cn('inline-flex items-center', stacked ? 'flex-col gap-3 text-center' : 'gap-2.5', className)}>
      <LogoMark size={size} {...rest} decorative />
      <span className={cn('flex flex-col leading-none', stacked && 'items-center')} aria-hidden>
        <span
          className="font-display font-semibold tracking-tight"
          style={{ fontSize: Math.max(15, size * (stacked ? 0.34 : 0.42)) }}
        >
          {BRAND.name}
        </span>
        <span
          lang="sa"
          className="deva mt-1 text-muted-foreground"
          style={{ fontSize: Math.max(11, size * (stacked ? 0.2 : 0.25)), lineHeight: 1.2 }}
        >
          {BRAND.nameDeva}
        </span>
        {showTagline && (
          <span className="mt-2 text-sm italic text-muted-foreground" style={{ lineHeight: 1.3 }}>
            {BRAND.tagline}
          </span>
        )}
      </span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
