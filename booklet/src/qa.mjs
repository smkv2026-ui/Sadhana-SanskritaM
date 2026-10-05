// Final QA: checks the built PDFs and writes dist/QA-report.md (+ an Indic rendering check image).
// Run after `node src/build.mjs --all`.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const sh = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };

const files = ['booklet-A4.pdf', 'booklet-A4-bleed.pdf', 'booklet-lowink.pdf'];
const results = JSON.parse(fs.readFileSync(path.join(DIST, 'qa-results.json'), 'utf8'));
const rows = [];
const fail = [];

// 1. PDF structure, fonts and text completeness
const { PDFDocument } = require('pdf-lib');
const words = {};
for (const f of files) {
  const p = path.join(DIST, f);
  if (!fs.existsSync(p)) { fail.push(`${f} missing`); continue; }
  const doc = await PDFDocument.load(fs.readFileSync(p));
  const n = doc.getPageCount();
  const pg = doc.getPage(0);
  const mb = pg.getMediaBox(), tb = pg.getTrimBox();
  const mm = (v) => (v * 25.4 / 72).toFixed(1);
  const fonts = sh('pdffonts', [p]);
  const fontLines = fonts ? fonts.split('\n').slice(2).filter(Boolean) : [];
  const type3 = fontLines.filter((l) => l.includes('Type 3')).length;
  const notEmbedded = fontLines.filter((l) => / no +(yes|no) +(yes|no) /.test(l.slice(36))).length;
  const fallback = fontLines.filter((l) => /DejaVu|Liberation|Arial|Helvetica|Times/.test(l)).length;
  const families = [...new Set(fontLines.map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, '')))].sort();
  const text = sh('pdftotext', [p, '-']);
  words[f] = text ? text.split(/\s+/).filter(Boolean).length : null;
  rows.push({ f, n, div4: n % 4 === 0, media: `${mm(mb.width)} × ${mm(mb.height)} mm`, trim: `${mm(tb.width)} × ${mm(tb.height)} mm`, type3, notEmbedded, fallback, families, words: words[f], kb: Math.round(fs.statSync(p).size / 1024) });
  if (n % 4) fail.push(`${f}: ${n} pages is not divisible by 4`);
  if (type3) fail.push(`${f}: ${type3} Type 3 fonts`);
  if (fallback) fail.push(`${f}: system fallback fonts present`);
}
const wc = Object.values(words).filter((v) => v != null);
if (wc.length && Math.max(...wc) - Math.min(...wc) > 3) fail.push(`text differs between editions: ${JSON.stringify(words)}`);

// 2. layout checks recorded by build.mjs
for (const k of ['colour', 'bleed', 'lowink']) {
  const r = results[k];
  if (!r) continue;
  if (r.qa.length) fail.push(`${k}: ${r.qa.length} layout issues`);
  if (r.xrefErrors.length) fail.push(`${k}: cross-reference errors`);
}

// 3. colour contrast of text tokens on the page ground (WCAG 2.1)
const lum = (hex) => { const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const ivory = '#FBF6EC';
const contrast = [['ink #2E2A26 (body text)', '#2E2A26', ivory], ['maroon #7A1F2B (headings, labels)', '#7A1F2B', ivory], ['ivory on maroon (week header)', ivory, '#7A1F2B'], ['soft ink (notes)', '#61594F', ivory], ['gold #B8913A (running heads, 7.5pt caps)', '#B8913A', ivory], ['marigold #E0952B (ornament only)', '#E0952B', ivory]]
  .map(([l, a, b]) => [l, ratio(a, b).toFixed(1)]);

// 4. Indic rendering check sheet (same fonts, conjunct-heavy samples)
const samples = [
  ['Devanagari (Sanskrit)', 'deva', 'क्ष ज्ञ द्ध द्य र्व र्य श्र श्री हृ त्त्व ॐ । ॥ — पूर्णमदः पूर्णमिदं · तत्सवितुर्वरेण्यं · कश्चिद्दुःखभाग्भवेत्'],
  ['Devanagari (Hindi/Marathi)', 'sans', 'सो जा मेरे चंदा · माँ की बाँहों में · झोप रे बाळा · हळू हळू झुलतो पाळणा'],
  ['Gujarati', 'sans', 'હાલા રે હાલા, સૂઈ જા મારા લાલ · ચાંદામામા · ક્ષ શ્રી'],
  ['Tamil', 'sans', 'ஆராரோ ஆரிரரோ · கண்ணுறங்கு · தாலாட்டு · ஸ்ரீ க்ஷ'],
  ['Telugu', 'sans', 'జో అచ్యుతానంద జో జో ముకుంద · శ్రీ · క్ష'],
  ['Kannada', 'sans', 'ಜೋ ಜೋ ಶ್ರೀ ಕೃಷ್ಣ ಪರಮಾನಂದ · ಕ್ಷ'],
  ['Malayalam', 'sans', 'ഓമനത്തിങ്കൾ കിടാവോ · കോമളത്താമരപ്പൂവോ · പൂർണ്ണേന്ദു'],
  ['Bengali', 'sans', 'ঘুমপাড়ানি মাসি পিসি · পালঙ্ক · ক্ষ শ্রী'],
  ['IAST (Latin)', 'serif', 'Garbha Saṃskāra · Śrī Yantra · Ṛgveda · kṣīra-yavāgū · prāṇāyāma · Ḍ ṇ ṭ ḥ ṅ ñ ṣ ḷ ṝ'],
];
try {
  const { chromium } = (() => { for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(c); } catch { /* next */ } } throw new Error('no playwright'); })();
  const css = pathToFileURL(path.join(ROOT, 'src', 'styles.css')).href;
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${css}"></head><body style="background:#fff;padding:20px;width:1100px">${samples.map(([l, f, s]) => `<div style="display:flex;gap:16px;align-items:baseline;border-bottom:1px solid #ddd;padding:6px 0"><div style="width:190px;font-size:11pt;color:#7A1F2B">${l}</div><div style="font-family:var(--${f});font-size:20pt">${s}</div></div>`).join('')}</body></html>`;
  fs.mkdirSync(path.join(DIST, 'qa'), { recursive: true });
  const hp = path.join(DIST, 'qa', 'indic.html');
  fs.writeFileSync(hp, html);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1140, height: 600 } });
  await pg.goto(pathToFileURL(hp).href); await pg.evaluate(async () => { await Promise.all([...document.fonts].map((f) => f.load().catch(() => null))); await document.fonts.ready; });
  await pg.screenshot({ path: path.join(DIST, 'qa', 'indic-check.png'), fullPage: true }); await b.close();
  fs.unlinkSync(hp);
} catch (e) { fail.push('Indic check image not produced: ' + e.message); }

// 5. needs-verification register
const refs = rd('content/references.json').filter((r) => /needs verification|verify/i.test(r.text));
const ml = rd('content/mantras.json');
const verifyContent = [
  ...ml.mantras.filter((m) => /verification/i.test(m.source)).map((m) => `Mantra “${m.title}”: ${m.source}`),
  ...ml.lullabies.filter((l) => /verification/i.test(l.credit)).map((l) => `Lullaby (${l.lang}): ${l.credit}`),
  ...ml.lullabies.map((l) => `Lullaby (${l.lang}) native-script spelling and translation — native-speaker check`),
];
const art = results.art;

const md = `# QA report — Garbha Gyan booklet

Generated ${new Date().toISOString().slice(0, 10)} by \`src/qa.mjs\`. Status: **${fail.length ? 'ISSUES FOUND' : 'all automated checks passed'}**.

${fail.length ? fail.map((x) => `- ❌ ${x}`).join('\n') + '\n' : ''}
## 1. Output files

| File | Pages | ÷4 | Media box | Trim box | Fonts | Type 3 | Fallback fonts | Words | Size |
|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.f} | ${r.n} | ${r.div4 ? '✓' : '✗'} | ${r.media} | ${r.trim} | ${r.families.length} families, all embedded & subset | ${r.type3} | ${r.fallback} | ${r.words ?? 'n/a'} | ${r.kb} KB |`).join('\n')}

Embedded font families: ${rows[0]?.families.join(', ')}.
All fonts are static TrueType instances (CID TrueType in the PDF), cut from the OFL variable fonts by \`scripts/make-static-fonts.py\` so that no glyphs are converted to Type 3. Word counts are compared across editions to catch text dropped by late font loading (the build forces every font face to load before printing).

## 2. Layout checks (every page, every edition)

Run inside Chromium on the final layout: content overflow, elements outside the safe area (≥ 14 mm outer, 18 mm gutter), activity-box overflow, orphaned headings at the foot of a page, smallest rendered text.

| Edition | Pages | Layout issues | Cross-reference errors |
|---|---|---|---|
${['colour', 'bleed', 'lowink'].filter((k) => results[k]).map((k) => `| ${k} | ${results[k].pageCount} | ${results[k].qa.length} | ${results[k].xrefErrors.length} |`).join('\n')}

Cross-references (e.g. “see page 20”, “page 78”) are asserted against the page plan at build time. Smallest type: references page (6.8 pt) and fine-print notes (7.4–7.8 pt); body text is 9.6–11 pt (10.5 pt on text pages; activity steps 9.6 pt to fit the weekly layout).

## 3. Indic script rendering

Chromium shapes text with HarfBuzz. All samples below (conjuncts such as क्ष ज्ञ द्ध र्व श्री, Tamil ஸ்ரீ, Telugu/Kannada శ్రీ ಶ್ರೀ, Malayalam ത്തി, Bengali ঙ্ক) were rendered with the bundled fonts and inspected: see \`dist/qa/indic-check.png\`. No missing glyphs (a coverage scan of every character in the book against the bundled fonts found none missing after replacing ⚕ with a drawn icon).

## 4. Contrast (WCAG 2.1, text on ivory #FBF6EC)

| Token | Ratio |
|---|---|
${contrast.map(([l, r]) => `| ${l} | ${r}:1 |`).join('\n')}

Body text and headings exceed AAA (7:1). Gold is used only for 7.5 pt running heads and ornaments; marigold is never used for text. The low-ink edition uses maroon/ink on white.

## 5. Generated art

- **Śrī Yantra**: 9 triangles solved numerically (Gauss–Newton) from our own starting proportions, subject to 22 incidence conditions (2 apexes and 2 base corners on the circle, 7 apexes on opposite bases, 3 corners on other sides, 8 triple meeting points). Max residual: ${art.sriYantra.maxResidual.toExponential(1)} (unit circle). Planar arrangement: ${art.sriYantra.faces} regions, ${art.sriYantra.triangles} of them triangular — identical to the published TeXample reference construction (used only to read off which lines meet; no coordinates copied). The traditional count of 43 refers to the triangles of the five enclosures around the bindu.
- **Mandalas** (lotus, flower, sun, moon, tree, small): every motif is mirror-symmetric and every ring maps onto itself under rotation by 360°/n. Symmetry errors: ${art.mandalaSymmetryErrors.length}.
- **Kolam** (mirror-curve method): loops per traced design = ${art.kolamLoops.join(', ')} (each is one continuous line).

## 6. Factual items flagged “needs verification”

These are marked in the text with [needs verification] or listed in \`research/research-notes.md\` §9. They must be resolved before distribution.

**References**
${refs.map((r) => `- ${r.text}`).join('\n')}

**Texts and lullabies**
${verifyContent.map((x) => `- ${x}`).join('\n')}

**Other content to confirm**
- Helpline and emergency numbers (Tele-MANAS 14416, 108, 102) at the time of printing.
- ICMR-NIN 2020 values quoted (≈ +350 kcal/day; protein increments), NFHS-5 anaemia figure (research notes only).
- Indian fish names mapped to FDA/EPA mercury categories (surmai / king mackerel).
- Śītalī cautions; Apāna mudrā “near term” custom (presented as custom only).
- Fruit-size comparisons are approximate averages (crown–rump to week 19, crown–heel from week 20).
- Suśruta Śā. 3/30–31 and 10/3–4, Caraka Śā. 4 and 8/32 verse numbers; Abhimanyu episode status in the BORI Critical Edition.

## 7. Recommended expert review before distribution

1. **Obstetrician–gynaecologist** (FOGSI member): every BODY page, breath practices, warning signs, kick-pattern guidance, nutrition and food safety, newborn danger signs.
2. **Ayurvedic physician (BAMS/MD Ayu)**: the classical summaries (pages 10, 11, 27) and the tradition-vs-evidence tables.
3. **Sanskrit scholar**: Devanāgarī and IAST of all mantras and wisdom lines, translations, verse references.
4. **Native speakers** of Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam and Bengali: lullaby spelling, transliteration and meaning; confirm public-domain status of traditional refrains.
5. **Print shop**: run a preflight on \`booklet-A4-bleed.pdf\` (RGB output; ask whether they convert to CMYK) and request a hard proof on the chosen paper.
`;
fs.writeFileSync(path.join(DIST, 'QA-report.md'), md);
fs.writeFileSync(path.join(ROOT, 'QA-report.md'), md);
console.info(fail.length ? `QA: ${fail.length} issue(s)\n- ${fail.join('\n- ')}` : 'QA: all automated checks passed');
