// Build the booklet: data → HTML → PDF (Chromium via Playwright) → print boxes (pdf-lib) → PNG previews.
// Usage:
//   node src/build.mjs                       colour A4, no bleed → dist/booklet-A4.pdf
//   node src/build.mjs --theme lowink        → dist/booklet-lowink.pdf
//   node src/build.mjs --bleed               → dist/booklet-A4-bleed.pdf (3 mm bleed, TrimBox/BleedBox set)
//   node src/build.mjs --all                 all three PDFs + PNG previews + QA json
//   options: --spiritual full|light|secular  --pages 1-8,30  --png  --scale 0.75
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { makeTemplates } from './templates.mjs';
import { solveSriYantra, countSriYantraTriangles, mandala, kolam } from './art.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

function loadPlaywright() {
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright'];
  for (const c of candidates) { try { return require(c); } catch { /* try next */ } }
  throw new Error('Playwright not found. Install it with `npm i -D playwright` (Chromium is used for rendering).');
}

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

export function buildPages(cfg) {
  const t = rd(`i18n/${cfg.locale || 'en'}.json`);
  const acts = rd('content/activities.json');
  const weeks = rd('content/weeks.json');
  const nutri = rd('content/nutrition.json');
  const mantras = rd('content/mantras.json');
  const stories = rd('content/stories.json');
  const gloss = rd('content/glossary.json');
  const refs = rd('content/references.json');

  // ordered page plan (88 pages)
  const plan = [
    ['cover', 'cover'], ['dedication', 'dedication'], ['title', 'title'], ['contents', 'contents'], ['howto', 'howto'],
    ['medical', 'medical'], ['path', 'path'], ['warning', 'warning'],
    ['journey', 'journey'], ['sages', 'sages'],
    ['gs', 'gs'], ['tve', 'tve'], ['kosha', 'kosha'], ['chakra', 'chakra'], ['mudra', 'mudra'], ['yantra', 'yantra'], ['yantraPage', 'yantraPage'],
    ['kolam', 'kolam'], ['sound', 'sound'], ['mantras1', 'mantras', ['gayatri', 'sahanav', 'asato']], ['mantras2', 'mantras', ['purnam', 'sarve', 'madalasa']],
    ['lull1', 'lullabies', ['sa', 'hi', 'mr', 'gu'], 'I'], ['lull2', 'lullabies', ['ta', 'te', 'kn', 'ml', 'bn'], 'II'],
    ['stories1', 'stories', ['monkey', 'hare'], 'I'], ['stories2', 'stories', ['squirrel', 'hanuman'], 'II'],
    ['nourish', 'nourish'], ['masa', 'masa'],
    ['div1', 'divider', 1], ...weeks.filter((w) => w.tri === 1).map((w) => ['w' + w.w, 'week', w]), ['moon', 'colourPage', 'moon', 1],
    ['div2', 'divider', 2], ...weeks.filter((w) => w.tri === 2).map((w) => ['w' + w.w, 'week', w]), ['flower', 'colourPage', 'flower', 2],
    ['div3', 'divider', 3], ...weeks.filter((w) => w.tri === 3).map((w) => ['w' + w.w, 'week', w]), ['own', 'colourPage', 'own', 3],
    ['daily', 'daily'], ['playlist', 'playlist'], ['family', 'family'], ['tree', 'tree'], ['celebrate', 'celebrate'],
    ['kicks', 'kicks'], ['appts', 'appts'], ['bag', 'bag'], ['birth', 'birth'], ['newborn', 'newborn'], ['names', 'names'], ['photos', 'photos'], ['met', 'met'],
    ['glossary', 'glossary'], ['refs', 'refs'], ['tveFull', 'tveFull'], ['index', 'index'], ['back', 'back'],
  ];
  const pageNo = Object.fromEntries(plan.map((p, i) => [p[0], i + 1]));
  const pageOf = (id) => pageNo[id];

  // cross-references written into the text must point at the right pages
  const expect = { warning: 8, kosha: 13, chakra: 14, mudra: 15, yantraPage: 17, kolam: 18, mantras1: 20, mantras2: 21, lull1: 22, lull2: 23, stories1: 24, stories2: 25, masa: 27, div3: 56, own: 70, playlist: 72, family: 73, tree: 74, celebrate: 75, appts: 77, bag: 78, newborn: 80, tveFull: 86 };
  const xrefErrors = Object.entries(expect).filter(([id, p]) => pageNo[id] !== p).map(([id, p]) => `${id} is on page ${pageNo[id]}, text says ${p}`);

  const contents = [
    ['Welcome & how to use', 'howto'], ['When to call your doctor', 'warning'], ['Your journey', 'journey'],
    ['Foundations: Garbha Gyan primer', 'gs'], ['Pañca Kośa · Cakras · Mudrās', 'kosha', 1], ['Yantras, kolam & mandalas', 'yantra', 1], ['Mantras & sound', 'sound', 1], ['Lullabies of India', 'lull1', 1], ['Stories to read aloud', 'stories1', 1], ['Nourish & traditional care', 'nourish', 1],
    ['Trimester 1 · Bīja, the Seed', 'div1'], ['Weeks 1–13', 'w1–4', 1], ['Trimester 2 · Aṅkura, the Sprout', 'div2'], ['Weeks 14–27', 'w14', 1], ['Trimester 3 · Puṣpa, the Bloom', 'div3'], ['Weeks 28–40', 'w28', 1],
    ['Daily rhythm', 'daily'], ['Partner & family', 'family'], ['Celebration planner', 'celebrate', 1], ['Trackers & logs', 'kicks'], ['Keepsakes & preparation', 'bag'], ['Glossary', 'glossary'], ['References', 'refs'], ['Tradition vs evidence', 'tveFull'], ['Index of activities', 'index'],
  ].map(([title, id, level]) => ({ title, page: pageNo[id], level }));

  // index: which weeks use each activity
  const used = {};
  for (const w of weeks) for (const s of ['mind', 'body', 'heart', 'spirit']) (used[w[s][0]] ||= []).push(w.w);
  for (const w of weeks) (used[nutri.items[w.nourish].act] ||= []).push(w.w);
  const index = Object.entries(used).map(([id, wks]) => ({ id, ...acts[id], weeks: [...new Set(wks)] })).sort((a, b) => (a.min || 99) - (b.min || 99) || a.title.localeCompare(b.title));

  const P = makeTemplates({ t, cfg, acts, weeks, nutri, mantras, stories, gloss, refs, pageOf });
  const html = plan.map(([id, tpl, a, b], i) => {
    const n = i + 1;
    if (tpl === 'contents') return P.contents(n, contents);
    if (tpl === 'index') return P.index(n, index);
    return P[tpl](n, a, b);
  });
  return { html, plan, xrefErrors, acts, weeks };
}

function htmlDoc(cfg, sheets, pw, ph, bleed) {
  const css = pathToFileURL(path.join(ROOT, 'src', 'styles.css')).href;
  return `<!doctype html><html lang="en" class="${cfg.theme === 'lowink' ? 'lowink' : 'colour'}" style="--pw:${pw}mm;--ph:${ph}mm;--bleed:${bleed}mm"><head><meta charset="utf-8"><title>${cfg.title}</title>
<link rel="stylesheet" href="${css}"><style>@page { size: ${pw + 2 * bleed}mm ${ph + 2 * bleed}mm; margin: 0; }</style></head><body>${sheets.join('\n')}</body></html>`;
}

// QA run inside the page: overflow, clipping, small type
const pageQA = () => {
  const out = [];
  const mm = 96 / 25.4;
  document.querySelectorAll('.sheet').forEach((sh) => {
    const n = sh.dataset.page;
    const c = sh.querySelector('.content');
    if (c.scrollHeight > c.clientHeight + 1) out.push({ page: n, issue: 'content overflow', by_mm: +((c.scrollHeight - c.clientHeight) / mm).toFixed(1) });
    const cr = c.getBoundingClientRect();
    c.querySelectorAll('.act, .box, table, svg, .lines, h1, h2, h3, h4, p').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > cr.right + 1 || r.left < cr.left - 1 || r.bottom > cr.bottom + 1)) out.push({ page: n, issue: 'element outside safe area', el: el.className?.baseVal ?? el.className ?? el.tagName, by_mm: +(Math.max(r.right - cr.right, cr.left - r.left, r.bottom - cr.bottom) / mm).toFixed(1) });
    });
    c.querySelectorAll('.act').forEach((el) => { if (el.scrollHeight > el.clientHeight + 1) out.push({ page: n, issue: 'activity box overflow', el: el.className, by_mm: +((el.scrollHeight - el.clientHeight) / mm).toFixed(1) }); });
    // headings orphaned at the bottom of a page (heading in the last 12 mm of the content box)
    c.querySelectorAll('h3, h4').forEach((h) => { const r = h.getBoundingClientRect(); if (cr.bottom - r.bottom < 12 * mm && r.top > cr.top + 40 * mm && !h.nextElementSibling) out.push({ page: n, issue: 'orphan heading', text: h.textContent.slice(0, 40) }); });
    // smallest rendered text
    let min = 99;
    const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const node = walker.currentNode; if (!node.textContent.trim()) continue; const el = node.parentElement; if (el.closest('svg')) continue; const fs = parseFloat(getComputedStyle(el).fontSize) * 0.75; if (fs < min) min = fs; }
    if (min < 6.5) out.push({ page: n, issue: 'text smaller than 6.5pt', pt: +min.toFixed(1) });
  });
  return out;
};

// Force every @font-face to load before printing. Chromium loads fallback faces lazily and
// hides text while a face is loading, so a PDF printed too early silently drops that text.
async function loadAllFonts(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const pending = await page.evaluate(() => [...document.fonts].filter((f) => f.status !== 'loaded').map((f) => f.family + ' ' + f.weight));
  if (pending.length) throw new Error('Fonts failed to load: ' + pending.join(', '));
}

async function render(cfg, { bleed = 0, file, png = false, pages = null, scale = 0.75 }) {
  const { chromium } = loadPlaywright();
  const pw = 210, ph = 297;
  const { html, plan, xrefErrors } = buildPages(cfg);
  let sheets = html;
  if (pages) sheets = html.filter((_, i) => pages.has(i + 1));
  fs.mkdirSync(DIST, { recursive: true });
  const htmlPath = path.join(DIST, file.replace(/\.pdf$/, '.html'));
  fs.writeFileSync(htmlPath, htmlDoc(cfg, sheets, pw, ph, bleed));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await loadAllFonts(page);
  const fontsLoaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  await page.evaluate(() => document.querySelectorAll('.fill').forEach((f) => { if (f.getBoundingClientRect().height < 30 * 96 / 25.4) f.style.display = 'none'; }));
  const qa = await page.evaluate(pageQA);
  const pdfPath = path.join(DIST, file);
  await page.pdf({ path: pdfPath, width: `${pw + 2 * bleed}mm`, height: `${ph + 2 * bleed}mm`, printBackground: true, preferCSSPageSize: true });
  if (png) {
    const dir = path.join(DIST, 'preview');
    fs.mkdirSync(dir, { recursive: true });
    await page.setViewportSize({ width: 900, height: 1200 });
    const shots = await page.$$('.sheet');
    const p2 = await browser.newPage({ deviceScaleFactor: scale });
    await p2.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await loadAllFonts(p2);
    await p2.evaluate(() => document.querySelectorAll('.fill').forEach((f) => { if (f.getBoundingClientRect().height < 30 * 96 / 25.4) f.style.display = 'none'; }));
    const s2 = await p2.$$('.sheet');
    for (const el of s2) { const n = await el.getAttribute('data-page'); await el.screenshot({ path: path.join(dir, `page-${String(n).padStart(3, '0')}.png`) }); }
    void shots;
  }
  await browser.close();
  if (bleed) await setBoxes(pdfPath, pw, ph, bleed);
  if (!pages) fs.unlinkSync(htmlPath);
  return { qa, xrefErrors, fontsLoaded: [...new Set(fontsLoaded)], pageCount: sheets.length, totalPlanned: plan.length };
}

async function setBoxes(pdfPath, pw, ph, bleed) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(fs.readFileSync(pdfPath));
  const pt = (v) => (v * 72) / 25.4;
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    p.setBleedBox(0, 0, width, height);
    p.setTrimBox(pt(bleed), pt(bleed), pt(pw), pt(ph));
    p.setArtBox(pt(bleed), pt(bleed), pt(pw), pt(ph));
  }
  doc.setTitle('Garbha Gyan — A 40-Week Journey of Mind, Body & Spirit (print, 3 mm bleed)');
  fs.writeFileSync(pdfPath, await doc.save());
}

async function setMeta(pdfPath, title) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(fs.readFileSync(pdfPath));
  doc.setTitle(title); doc.setAuthor('Garbha Gyan project'); doc.setSubject('Pregnancy activity workbook: prenatal science and India’s garbha saṃskāra heritage');
  doc.setKeywords(['pregnancy', 'garbha sanskar', 'prenatal', 'workbook', 'India']); doc.setCreator('booklet/src/build.mjs (Chromium + pdf-lib)');
  fs.writeFileSync(pdfPath, await doc.save());
}

function artChecks() {
  const sy = solveSriYantra();
  const counts = countSriYantraTriangles(sy.L);
  const symmetry = [];
  for (const th of ['lotus', 'flower', 'sun', 'moon', 'tree', 'small']) mandala(th, { report: symmetry });
  const kol = [[3, [[2, 1], [5, 2], [4, 5], [1, 4]]], [5, [[2, 1], [9, 2], [8, 9], [1, 8], [4, 1], [9, 4], [6, 9], [1, 6]]], [5, [[2, 1], [9, 2], [8, 9], [1, 8], [6, 1], [9, 6], [4, 9], [1, 4]]]].map(([n, m]) => kolam(n, n, m).loops);
  return { sriYantra: { maxResidual: sy.maxResidual, equations: sy.equations, unknowns: sy.unknowns, ...counts }, mandalaSymmetryErrors: symmetry, kolamLoops: kol };
}

const parsePages = (s) => { if (!s || s === true) return null; const set = new Set(); for (const part of String(s).split(',')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= (b || a); i++) set.add(i); } return set; };

async function main() {
  const cfg = rd('config.json');
  if (opt('spiritual')) cfg.spiritual = opt('spiritual');
  const results = {};
  if (opt('all')) {
    const art = artChecks();
    results.art = art;
    results.colour = await render({ ...cfg, theme: 'colour' }, { file: 'booklet-A4.pdf', png: true, scale: +opt('scale', 0.75) });
    await setMeta(path.join(DIST, 'booklet-A4.pdf'), 'Garbha Gyan — A 40-Week Journey of Mind, Body & Spirit (A4, home print)');
    results.bleed = await render({ ...cfg, theme: 'colour', bleed: true }, { file: 'booklet-A4-bleed.pdf', bleed: 3 });
    results.lowink = await render({ ...cfg, theme: 'lowink' }, { file: 'booklet-lowink.pdf' });
    await setMeta(path.join(DIST, 'booklet-lowink.pdf'), 'Garbha Gyan — A 40-Week Journey of Mind, Body & Spirit (A4, low-ink)');
  } else {
    const theme = opt('theme', cfg.theme);
    const bleed = opt('bleed') ? 3 : 0;
    const file = opt('out', bleed ? 'booklet-A4-bleed.pdf' : theme === 'lowink' ? 'booklet-lowink.pdf' : 'booklet-A4.pdf');
    results.single = await render({ ...cfg, theme }, { file, bleed, png: !!opt('png'), pages: parsePages(opt('pages')), scale: +opt('scale', 0.75) });
    results.art = artChecks();
  }
  fs.writeFileSync(path.join(DIST, 'qa-results.json'), JSON.stringify(results, null, 1));
  for (const [k, r] of Object.entries(results)) {
    if (!r.qa) continue;
    console.info(`[${k}] pages ${r.pageCount}/${r.totalPlanned} · layout issues ${r.qa.length} · xref errors ${r.xrefErrors.length}`);
    for (const q of r.qa.slice(0, 40)) console.info('   ', JSON.stringify(q));
    for (const e of r.xrefErrors) console.info('    xref:', e);
  }
  console.info('[art]', JSON.stringify(results.art));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
