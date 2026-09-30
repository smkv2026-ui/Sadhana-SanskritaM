/**
 * Single source of truth for the Sadhana Sanskritam mark:
 * an open book → a slender stem → a fully bloomed white lotus → a faceted diamond.
 *
 * Everything is plain data + string builders so the same geometry drives
 *  - the React <Logo/> component (animated or static),
 *  - the <IntroAnimation/> sequence,
 *  - build-time generation of favicon / app icons / OpenGraph image (scripts/generate-brand-assets.ts).
 *
 * Coordinate system: viewBox 0 0 240 260. Petals are drawn upright at the origin and rotated
 * around their base, which lets CSS animate them with `transform` only.
 */

export const VIEWBOX = { width: 240, height: 260 } as const;

/** Where each part is anchored inside the viewBox. */
export const ANCHORS = {
  spine: { x: 120, y: 204 },
  flowerBase: { x: 120, y: 116 },
  diamond: { x: 120, y: 35 },
} as const;

export function petalPath(len: number, w: number): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  return [
    'M0 0',
    `C${r(w)} ${r(-len * 0.3)} ${r(w * 0.78)} ${r(-len * 0.8)} 0 ${-len}`,
    `C${r(-w * 0.78)} ${r(-len * 0.8)} ${r(-w)} ${r(-len * 0.3)} 0 0Z`,
  ].join('');
}

export interface Petal {
  /** 0 = innermost layer (opens first), 3 = outermost. */
  layer: 0 | 1 | 2 | 3;
  angle: number;
  len: number;
  w: number;
}

// Drawing order matters: outer layers first so the inner petals sit on top.
export const PETALS: Petal[] = [
  { layer: 3, angle: -80, len: 34, w: 11 },
  { layer: 3, angle: 80, len: 34, w: 11 },
  { layer: 2, angle: -56, len: 44, w: 13 },
  { layer: 2, angle: 56, len: 44, w: 13 },
  { layer: 1, angle: -32, len: 50, w: 14 },
  { layer: 1, angle: 32, len: 50, w: 14 },
  { layer: 0, angle: -13, len: 55, w: 13 },
  { layer: 0, angle: 13, len: 55, w: 13 },
  { layer: 0, angle: 0, len: 60, w: 14.5 },
];

export const PETAL_LAYERS = 4;

/** Book, relative to the spine anchor. Pages are drawn so scaleX(→0) folds them shut on the spine. */
export const BOOK = {
  coverLeft: 'M0 4C-26 -6-60-8-88 0L-88 36C-60 28-26 30 0 40Z',
  coverRight: 'M0 4C26 -6 60-8 88 0L88 36C60 28 26 30 0 40Z',
  pageLeft: 'M0 0C-24-10-56-12-82-4L-82 28C-56 20-24 22 0 32Z',
  pageRight: 'M0 0C24-10 56-12 82-4L82 28C56 20 24 22 0 32Z',
  linesLeft: ['M-10 9C-28 2-50 1-70 5', 'M-10 17C-28 10-50 9-70 13'],
  linesRight: ['M10 9C28 2 50 1 70 5', 'M10 17C28 10 50 9 70 13'],
} as const;

/** Stem from the spine of the book up to the flower base (absolute coords). */
export const STEM = 'M120 204C112 180 129 152 120 116';
export const LEAVES = {
  right: 'M121 168C131 158 146 156 156 146C144 145 130 150 121 168Z',
  left: 'M118 186C108 180 96 180 86 173C95 170 108 172 118 186Z',
} as const;

/** Diamond facets relative to the diamond anchor (table at the top, culet at the bottom). */
export const DIAMOND = {
  outline: 'M-9-11L9-11L15-3L0 17L-15-3Z',
  facets: [
    { d: 'M-9-11L9-11L4-3L-4-3Z', tone: 'table' },
    { d: 'M-9-11L-4-3L-15-3Z', tone: 'crownL' },
    { d: 'M9-11L4-3L15-3Z', tone: 'crownR' },
    { d: 'M-15-3L-4-3L0 17Z', tone: 'pavL' },
    { d: 'M-4-3L4-3L0 17Z', tone: 'pavC' },
    { d: 'M4-3L15-3L0 17Z', tone: 'pavR' },
  ],
  glint: 'M-3-14L3-14L-5 20L-11 20Z',
  sparkle: 'M0-8L1.6-1.6L8 0L1.6 1.6L0 8L-1.6 1.6L-8 0L-1.6-1.6Z',
} as const;

export type LogoTone = 'full' | 'full-dark' | 'mono';

export interface LogoPalette {
  petalTip: string;
  petalMid: string;
  petalBase: string;
  petalStroke: string;
  petalStrokeWidth: number;
  cover: string;
  page: string;
  pageLine: string;
  stem: string;
  leaf: string;
  diamondFacets: Record<string, string>;
  diamondStroke: string;
  halo: string;
}

export const PALETTES: Record<Exclude<LogoTone, 'mono'>, LogoPalette> = {
  // For light (ivory / pearl) backgrounds.
  full: {
    petalTip: '#FFFFFF',
    petalMid: '#FFFCF5',
    petalBase: '#F3DFCF',
    petalStroke: '#B7832A',
    petalStrokeWidth: 1.1,
    cover: '#1B2350',
    page: '#FFFBF2',
    pageLine: '#D9A441',
    stem: '#B7832A',
    leaf: '#C99A3E',
    diamondFacets: {
      table: '#E9FBFD',
      crownL: '#9BE8F2',
      crownR: '#6FDDEB',
      pavL: '#2BB3C6',
      pavC: '#6FDDEB',
      pavR: '#1B8FA0',
    },
    diamondStroke: '#1B2350',
    halo: '#F1C66E',
  },
  // For deep midnight backgrounds.
  'full-dark': {
    petalTip: '#FFFFFF',
    petalMid: '#FFFDF8',
    petalBase: '#EBD7C7',
    petalStroke: '#F1C66E',
    petalStrokeWidth: 0.9,
    cover: '#D9A441',
    page: '#FFFBF2',
    pageLine: '#D9A441',
    stem: '#F1C66E',
    leaf: '#D9A441',
    diamondFacets: {
      table: '#F2FDFE',
      crownL: '#B6F0F7',
      crownR: '#8EE6F0',
      pavL: '#4CC8D8',
      pavC: '#8EE6F0',
      pavR: '#2BB3C6',
    },
    diamondStroke: '#E9FBFD',
    halo: '#F1C66E',
  },
};

export const BRAND = {
  name: 'Sadhana Sanskritam',
  nameDeva: 'साधना संस्कृतम्',
  tagline: 'Where knowledge blooms into wisdom',
  taglineOptions: [
    'Where knowledge blooms into wisdom',
    'Rooted in śāstra, rising in light',
    'From the page to the lotus',
  ],
  motto: { deva: 'विद्या ददाति विनयम्', iast: 'vidyā dadāti vinayam', en: 'Knowledge bestows humility' },
  colors: {
    ivory: '#FFFBF2',
    pearl: '#F8F6F0',
    midnight: '#0B1026',
    indigo: '#1B2350',
    saffron: '#D9A441',
    saffronLight: '#F1C66E',
    diamond: '#6FDDEB',
  },
} as const;

interface BuildOptions {
  tone: LogoTone;
  /** Unique prefix for gradient ids (needed when several logos share a page). */
  idPrefix?: string;
  /** Optional rounded-square background (app icons). */
  background?: string;
  /** Extra padding (in viewBox units) around the mark. */
  padding?: number;
  /** Drop the book + stem for tiny sizes (favicon). */
  compact?: boolean;
  /** Mono only: fill used to knock out overlapping petals (usually the background colour). */
  knockout?: string;
}

/**
 * Serialises the mark to a standalone SVG string (used by the asset generator and tests).
 * The React component renders the same geometry as JSX so it can be animated.
 */
export function buildLogoSvg({
  tone,
  idPrefix = 'ss',
  background,
  padding = 0,
  compact = false,
  knockout = '#FFFFFF',
}: BuildOptions): string {
  const p = tone === 'mono' ? null : PALETTES[tone];
  const id = (n: string) => `${idPrefix}-${n}`;
  const vb = compact
    ? { x: 58 - padding, y: 16 - padding, w: 124 + padding * 2, h: 124 + padding * 2 }
    : { x: -padding, y: -padding, w: VIEWBOX.width + padding * 2, h: VIEWBOX.height + padding * 2 };

  const mono = 'currentColor';
  const petalFill = p ? `url(#${id('petal')})` : knockout;
  const petalStroke = p ? p.petalStroke : mono;
  const petalSW = p ? p.petalStrokeWidth : 2;

  const defs = p
    ? `<defs>
<linearGradient id="${id('petal')}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.petalBase}"/><stop offset=".45" stop-color="${p.petalMid}"/><stop offset="1" stop-color="${p.petalTip}"/></linearGradient>
<radialGradient id="${id('halo')}"><stop offset="0" stop-color="${p.halo}" stop-opacity=".55"/><stop offset="1" stop-color="${p.halo}" stop-opacity="0"/></radialGradient>
</defs>`
    : '';

  const bg = background
    ? `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" rx="${vb.w * 0.22}" fill="${background}"/>`
    : '';

  const book = compact
    ? ''
    : `<g transform="translate(${ANCHORS.spine.x} ${ANCHORS.spine.y})">
<path d="${BOOK.coverLeft}" fill="${p ? p.cover : 'none'}" stroke="${p ? 'none' : mono}" stroke-width="2"/>
<path d="${BOOK.coverRight}" fill="${p ? p.cover : 'none'}" stroke="${p ? 'none' : mono}" stroke-width="2"/>
<path d="${BOOK.pageLeft}" fill="${p ? p.page : 'none'}" stroke="${p ? p.pageLine : mono}" stroke-width="${p ? 0.8 : 2}"/>
<path d="${BOOK.pageRight}" fill="${p ? p.page : 'none'}" stroke="${p ? p.pageLine : mono}" stroke-width="${p ? 0.8 : 2}"/>
${[...BOOK.linesLeft, ...BOOK.linesRight]
  .map((d) => `<path d="${d}" fill="none" stroke="${p ? p.pageLine : mono}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`)
  .join('')}
</g>
<path d="${STEM}" fill="none" stroke="${p ? p.stem : mono}" stroke-width="3.2" stroke-linecap="round"/>
<path d="${LEAVES.right}" fill="${p ? p.leaf : 'none'}" stroke="${p ? 'none' : mono}" stroke-width="1.6"/>
<path d="${LEAVES.left}" fill="${p ? p.leaf : 'none'}" stroke="${p ? 'none' : mono}" stroke-width="1.6"/>`;

  const halo = p
    ? `<circle cx="${ANCHORS.flowerBase.x}" cy="${ANCHORS.flowerBase.y - 30}" r="62" fill="url(#${id('halo')})"/>`
    : '';

  const petals = PETALS.map(
    (pt) =>
      `<path transform="rotate(${pt.angle})" d="${petalPath(pt.len, pt.w)}" fill="${petalFill}" stroke="${petalStroke}" stroke-width="${petalSW}" stroke-linejoin="round"/>`,
  ).join('');

  const facets = DIAMOND.facets
    .map((f) =>
      p
        ? `<path d="${f.d}" fill="${p.diamondFacets[f.tone]}"/>`
        : `<path d="${f.d}" fill="none" stroke="${mono}" stroke-width="1" stroke-linejoin="round"/>`,
    )
    .join('');
  const diamond = `<g transform="translate(${ANCHORS.diamond.x} ${ANCHORS.diamond.y})">${facets}<path d="${DIAMOND.outline}" fill="none" stroke="${p ? p.diamondStroke : mono}" stroke-width="${p ? 1 : 2}" stroke-linejoin="round"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" role="img" aria-label="${BRAND.name}">${defs}${bg}${halo}${book}<g transform="translate(${ANCHORS.flowerBase.x} ${ANCHORS.flowerBase.y})">${petals}</g>${diamond}</svg>`;
}
