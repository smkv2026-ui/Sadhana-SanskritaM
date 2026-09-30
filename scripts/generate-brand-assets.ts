/**
 * Generates every logo variant from the single geometry source (src/brand/logoGeometry.ts):
 * full-colour, dark, mono, icon-only (favicon + app icons), horizontal lockup and the OpenGraph image.
 *
 * Run with `npm run brand` (outputs are committed to public/, so CI doesn't need fonts).
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { BRAND, VIEWBOX, buildLogoSvg } from '../src/brand/logoGeometry';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');
const brandDir = join(out, 'brand');
mkdirSync(brandDir, { recursive: true });

const FONT = "'Tiro Devanagari Sanskrit', Georgia, serif";

/** WOFF 1.0 → plain sfnt (TTF/OTF) so resvg can shape Devanagari with the real brand font. */
function woffToSfnt(woff: Buffer): Buffer {
  const numTables = woff.readUInt16BE(12);
  const flavor = woff.readUInt32BE(4);
  const tables = Array.from({ length: numTables }, (_, i) => {
    const o = 44 + i * 20;
    const tag = woff.readUInt32BE(o);
    const offset = woff.readUInt32BE(o + 4);
    const compLength = woff.readUInt32BE(o + 8);
    const origLength = woff.readUInt32BE(o + 12);
    const checksum = woff.readUInt32BE(o + 16);
    const raw = woff.subarray(offset, offset + compLength);
    return { tag, checksum, data: compLength < origLength ? inflateSync(raw) : Buffer.from(raw) };
  });
  const headerSize = 12 + numTables * 16;
  let offset = headerSize;
  const dir = Buffer.alloc(headerSize);
  dir.writeUInt32BE(flavor, 0);
  dir.writeUInt16BE(numTables, 4);
  let pow = 1;
  let log = 0;
  while (pow * 2 <= numTables) {
    pow *= 2;
    log++;
  }
  dir.writeUInt16BE(pow * 16, 6);
  dir.writeUInt16BE(log, 8);
  dir.writeUInt16BE(numTables * 16 - pow * 16, 10);
  const bodies: Buffer[] = [];
  tables.forEach((t, i) => {
    const o = 12 + i * 16;
    dir.writeUInt32BE(t.tag, o);
    dir.writeUInt32BE(t.checksum, o + 4);
    dir.writeUInt32BE(offset, o + 8);
    dir.writeUInt32BE(t.data.length, o + 12);
    const padded = Buffer.alloc((t.data.length + 3) & ~3);
    t.data.copy(padded);
    bodies.push(padded);
    offset += padded.length;
  });
  return Buffer.concat([dir, ...bodies]);
}

const fontDir = mkdtempSync(join(tmpdir(), 'ss-fonts-'));
const fontFiles = ['devanagari-400-normal', 'latin-400-normal', 'latin-400-italic', 'latin-ext-400-normal'].map((variant) => {
  const src = join(root, `node_modules/@fontsource/tiro-devanagari-sanskrit/files/tiro-devanagari-sanskrit-${variant}.woff`);
  const dest = join(fontDir, `${variant}.ttf`);
  writeFileSync(dest, woffToSfnt(readFileSync(src)));
  return dest;
});

function png(svg: string, width: number): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false, fontFiles, defaultFontFamily: 'Tiro Devanagari Sanskrit' },
  })
    .render()
    .asPng();
}

function inner(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

function write(name: string, data: string | Buffer) {
  writeFileSync(join(out, name), data);
  console.info(`  ✓ public/${name} (${(Buffer.byteLength(data) / 1024).toFixed(1)} KB)`);
}

// ---- mark variants ----
write('brand/logo-full.svg', buildLogoSvg({ tone: 'full', idPrefix: 'lf' }));
write('brand/logo-dark.svg', buildLogoSvg({ tone: 'full-dark', idPrefix: 'ld', background: BRAND.colors.midnight, padding: 12 }));
write('brand/logo-mono.svg', buildLogoSvg({ tone: 'mono', idPrefix: 'lm' }).replace('<svg ', `<svg color="${BRAND.colors.indigo}" `));
write('brand/logo-mono-light.svg', buildLogoSvg({ tone: 'mono', idPrefix: 'll', knockout: BRAND.colors.midnight }).replace('<svg ', `<svg color="${BRAND.colors.ivory}" `));

// ---- icon-only ----
const icon = buildLogoSvg({ tone: 'full-dark', idPrefix: 'ic', background: BRAND.colors.midnight, compact: true, padding: 8 });
write('favicon.svg', icon);
write('favicon-32.png', png(icon, 32));
write('apple-touch-icon.png', png(icon, 180));
write('icon-192.png', png(icon, 192));
write('icon-512.png', png(icon, 512));
const maskable = buildLogoSvg({ tone: 'full-dark', idPrefix: 'mk', background: BRAND.colors.midnight, compact: true, padding: 34 });
write('icon-maskable-512.png', png(maskable, 512));

// ---- horizontal lockup (mark + wordmark) ----
function lockup(tone: 'full' | 'full-dark') {
  const ink = tone === 'full' ? BRAND.colors.midnight : BRAND.colors.ivory;
  const sub = tone === 'full' ? '#5b6078' : '#c8c3b4';
  const mark = inner(buildLogoSvg({ tone, idPrefix: `hz${tone}` }));
  const scale = 120 / VIEWBOX.height;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 130" role="img" aria-label="${BRAND.name}">
<g transform="translate(4 5) scale(${scale.toFixed(4)})">${mark}</g>
<text x="128" y="66" font-family="${FONT}" font-size="46" font-weight="600" fill="${ink}">${BRAND.name}</text>
<text x="130" y="104" font-family="${FONT}" font-size="26" fill="${sub}">${BRAND.nameDeva}</text>
</svg>`;
}
write('brand/logo-horizontal.svg', lockup('full'));
write('brand/logo-horizontal-dark.svg', lockup('full-dark'));

// ---- OpenGraph image 1200×630 ----
const ogMark = inner(buildLogoSvg({ tone: 'full-dark', idPrefix: 'og' }));
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
<radialGradient id="bg" cx="0.3" cy="0.45" r="0.8"><stop offset="0" stop-color="#2A3270"/><stop offset="0.7" stop-color="#0B1026"/></radialGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F1C66E" stop-opacity=".35"/><stop offset="1" stop-color="#F1C66E" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="300" cy="300" r="260" fill="url(#glow)"/>
<g transform="translate(150 60) scale(${(500 / VIEWBOX.height).toFixed(4)})">${ogMark}</g>
<text x="560" y="260" font-family="${FONT}" font-size="64" font-weight="600" fill="#FFFBF2">${BRAND.name}</text>
<text x="562" y="325" font-family="${FONT}" font-size="36" font-style="italic" fill="#F1C66E">${BRAND.motto.iast}</text>
<text x="562" y="410" font-family="${FONT}" font-size="34" font-style="italic" fill="#d8d3c4">${BRAND.tagline}</text>
<text x="562" y="500" font-family="${FONT}" font-size="26" fill="#9aa0bf">Live cohorts · Recorded courses · Events</text>
</svg>`;
write('brand/og-image.svg', og);
write('og-image.png', png(og, 1200));

// ---- web app manifest ----
write(
  'manifest.webmanifest',
  JSON.stringify(
    {
      name: BRAND.name,
      short_name: 'Sadhana',
      description: BRAND.tagline,
      start_url: '.',
      scope: '.',
      display: 'standalone',
      background_color: BRAND.colors.ivory,
      theme_color: BRAND.colors.midnight,
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    null,
    2,
  ),
);

rmSync(fontDir, { recursive: true, force: true });
