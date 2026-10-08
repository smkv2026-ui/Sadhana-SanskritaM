// Garbha Khel — a 16-page A5 activity booklet (repeatable games, art and music for mother & baby).
// Usage: node mini/build.mjs   (from booklet/)  →  mini/dist/garbha-khel-A5.pdf
//                                                  mini/dist/garbha-khel-A4-booklet.pdf (2-up, print duplex & fold)
//                                                  mini/dist/preview/page-XX.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { mandala, kolam, dotGrid } from '../src/art.mjs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, 'dist');
const C = JSON.parse(fs.readFileSync(path.join(HERE, 'content.json'), 'utf8'));
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (code, mm = 14, cls = '') => `<img class="em ${cls}" src="images/${code}.webp" style="width:${mm}mm;height:${mm}mm" alt="">`;
const BADGE = { S: ['●', 'Science-backed'], E: ['◐', 'Emerging evidence'], T: ['✦', 'Tradition'] };
const badge = (b) => `<span class="badge b${b}">${BADGE[b][0]} ${BADGE[b][1]}</span>`;
const circles = (n) => `<span class="ticks">${'<i></i>'.repeat(n)}</span>`;

function page(n, cls, body, folio = true) {
  return `<section class="pg ${cls} ${n % 2 ? 'recto' : 'verso'}" data-page="${n}"><div class="in">${body}</div>${folio ? `<div class="folio">${n}</div>` : ''}</section>`;
}

function art(a) {
  switch (a.art) {
    case 'mandala': return `<div class="art">${mandala('flower', { size: 300, stroke: 0.0045 })}</div>`;
    case 'yantra': return `<div class="art"><img src="images/sriyantra-outline.png" style="width:80mm;height:80mm" alt="Śrī Yantra"></div>`;
    case 'kolam': {
      const k = kolam(5, 5, [[2, 1], [9, 2], [8, 9], [1, 8], [4, 1], [9, 4], [6, 9], [1, 6]], { guide: true });
      return `<div class="art row2"><div><div class="cap">Trace me</div><div style="width:44mm">${k.svg}</div></div><div><div class="cap">Your turn</div><div style="width:50mm">${dotGrid(6, 6)}</div></div></div>`;
    }
    case 'frame': return `<div class="art"><div class="frame">today’s feeling · date ____</div></div>`;
    case 'garland': {
      let s = '';
      for (let i = 0; i < 30; i++) {
        const t = i / 29, x = 8 + t * 104, y = 10 + Math.sin(t * Math.PI) * 30;
        s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-2.1" rx="1.4" ry="2.1" transform="rotate(${r})" class="gp"/>`).join('')}<circle r="1" class="gc"/></g>`;
      }
      return `<div class="art"><svg viewBox="0 0 120 48" style="width:118mm"><path d="M8 10 Q60 70 112 10" class="gs"/>${s}<circle cx="8" cy="10" r="1.6" class="gc"/><circle cx="112" cy="10" r="1.6" class="gc"/></svg></div>`;
    }
    case 'raga': return `<div class="art"><table class="score"><tr><th>Round</th>${Array.from({ length: 8 }, (_, i) => `<th>${i + 1}</th>`).join('')}</tr><tr><td>Mother</td>${'<td></td>'.repeat(8)}</tr><tr><td>Partner</td>${'<td></td>'.repeat(8)}</tr></table></div>`;
    case 'story': return `<div class="story"><b>The Monkey and the Crocodile</b> (Pañcatantra). A kind monkey shared sweet rose-apples with his friend the crocodile every day. The crocodile’s wife wanted the monkey’s sweet heart, so the crocodile carried him across the river on his back — and confessed halfway. The monkey stayed calm: “My heart? I left it in my tree! Take me back and I’ll fetch it.” Back on the bank, he leapt to safety. <i>A calm mind finds a way, even in deep water.</i></div>`;
    case 'moons': return `<div class="art"><table class="score"><tr><th>Night</th>${Array.from({ length: 8 }, (_, i) => `<th>${i + 1}</th>`).join('')}</tr><tr><td>Moon shape</td>${'<td></td>'.repeat(8)}</tr></table></div>`;
    default: return a.id === 'kick'
      ? `<div class="art"><table class="score"><tr><th>Day</th>${Array.from({ length: 8 }, (_, i) => `<th>${i + 1}</th>`).join('')}</tr><tr><td>Kicks back</td>${'<td></td>'.repeat(8)}</tr></table></div>`
      : '';
  }
}

function activity(n, a, i) {
  const safety = {
    bhramari: 'Never hold the breath. Stop if dizzy.',
    sway: 'Hold support; stop with pain, dizziness or contractions.',
    kick: 'Gentle touch only. If baby moves less than usual, call your doctor now.',
    belly: 'Only natural henna or body-safe paint — never “black henna”. Patch-test first.',
    yantra: 'Keep the diya safe and away from fabric; never stare or strain.',
    lullaby: '', raga: 'Comfortable volume — never headphones on the belly.',
  }[a.id] || '';
  return page(n, 'act', `
    <div class="ahead"><div class="num">${i + 1}</div><div class="tt"><h2>${esc(a.title)}</h2><div class="sa"><span class="deva">${esc(a.sa[0])}</span> · ${esc(a.sa[1])}</div></div><div class="ims">${a.imgs.map((c) => img(c, a.imgs.length > 3 ? 11 : 13)).join('')}</div></div>
    <div class="chips"><span class="chip">⏱ ${a.min} min</span><span class="chip">${esc(a.when)}</span>${badge(a.badge)}<span class="chip">Repeat often</span></div>
    ${art(a)}
    ${['kick', 'lullaby', 'belly', 'bhramari'].includes(a.id) ? `<div class="hero">${a.imgs.slice(0, 2).map((c) => img(c, 30)).join('')}</div>` : ''}
    <ol class="steps">${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="duo"><div class="box music"><div class="lab">♪ Play alongside</div>${esc(a.music)}</div>
    <div class="box spirit"><div class="lab">✦ Spiritual touch</div><div class="deva mt">${esc(a.spirit.deva)}</div><div class="ia">${esc(a.spirit.iast)}</div><div class="me">${esc(a.spirit.meaning)}</div></div></div>
    <div class="why"><div><b>For baby:</b> ${esc(a.baby)}</div><div><b>For you:</b> ${esc(a.mom)}</div></div>
    <div class="notes"><div class="lab">My notes · baby’s response</div>${'<span></span>'.repeat(12)}</div>
    <div class="track"><span class="lab">Done</span>${circles(14)}</div>
    ${safety ? `<div class="safe">⚕ ${esc(safety)}</div>` : ''}`);
}

function pages() {
  const P = [];
  P.push(page(1, 'cover', `
    <div class="kicker">A little book to do again and again</div>
    <h1>${esc(C.title)}</h1><div class="deva cvdeva">${esc(C.titleDeva)}</div>
    <div class="cvsub">${esc(C.subtitle)}</div>
    <div class="cvart"><img src="images/sriyantra-temple.png" alt=""><div class="cvmom">${img('1f930-1f3fd', 34)}</div></div>
    <div class="cvrow">${['1fab7', '1f3a8', '1f3b6', '1fa94', '1f4d6', '1f319'].map((c) => img(c, 13)).join('')}</div>
    <div class="cvname">This book belongs to ______________________</div>`, false));
  const days = [['Mon', 'Mandala + Lullaby'], ['Tue', 'Kolam game + Humming bee'], ['Wed', 'Story with voices + Gratitude'], ['Thu', 'Śrī Yantra + Kick-and-tap'], ['Fri', 'Paint your feelings + Lullaby'], ['Sat', 'Name-that-raga + Moonlight sway'], ['Sun', 'Belly art (any week) + family choice']];
  P.push(page(2, 'howto', `
    <h2>How to play</h2>
    <p>Twelve short activities — games, drawing, painting, music and stillness — each paired with music to play alongside and a spiritual touch. Every one is chosen to <b>calm you</b> and to give your baby <b>soothing sound, rhythm and touch</b>. Do one or two a day; repeat your favourites as often as you like. Tick a circle each time.</p>
    <table class="week">${days.map(([d, a]) => `<tr><td class="d">${d}</td><td>${esc(a)}</td><td class="tk">${circles(4)}</td></tr>`).join('')}</table>
    <div class="legend">${['S', 'E', 'T'].map(badge).join(' ')}</div>
    <p class="small">● strong evidence (e.g. voice, singing, touch, nutrition, sleep) · ◐ promising studies, mostly for the mother’s calm (music, art, breathing) · ✦ tradition and spiritual practice, shared with respect.</p>
    <div class="note"><b>Honest note:</b> no activity makes a “genius” baby or decides looks or gender. What truly helps a baby’s growing brain is a well-nourished, rested, supported and calm mother — and the sound of loving voices. That is what these games give.</div>
    <div class="safe">⚕ Check with your doctor before new breathing or movement practices. Stop if you feel pain, dizziness, bleeding, fluid leakage or contractions.</div>`));
  C.activities.forEach((a, i) => P.push(activity(3 + i, a, i)));
  P.push(page(15, 'play', `
    <h2>Music & mantra card ${img('1f3b5', 10)}</h2>
    <p class="small">Choose calm music (slow, steady beat) at a comfortable volume through room speakers. Never place headphones on the belly. Your own voice — singing, humming, chanting — is baby’s favourite sound.</p>
    <table class="pl">${C.playlist.map(([t, m]) => `<tr><td class="d">${t}</td><td>${esc(m)}</td></tr>`).join('')}</table>
    <h3>Four mantras to know by heart</h3>
    <div class="mantras">
      <div><div class="deva big">ॐ</div><div class="me">Oṃ — chant softly on a long out-breath.</div></div>
      <div><div class="deva">ॐ भूर्भुवः स्वः । तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि । धियो यो नः प्रचोदयात् ॥</div><div class="me">Gāyatrī — may the divine light brighten our minds.</div></div>
      <div><div class="deva">असतो मा सद्गमय । तमसो मा ज्योतिर्गमय । मृत्योर्मा अमृतं गमय ॥</div><div class="me">Lead me from untruth to truth, darkness to light, death to immortality.</div></div>
      <div><div class="deva">सर्वे भवन्तु सुखिनः । सर्वे सन्तु निरामयाः ॥</div><div class="me">May all be happy; may all be free from illness.</div></div>
    </div>
    <div class="small">Secular choice: hum a favourite tune, or read a short poem slowly — the calm comes from the slow out-breath.</div>
    <div class="hero" style="margin-top:auto">${['1fa94', '1fab7', '1f549-fe0f', '1f514', '1f41a'].map((c) => img(c, 18)).join('')}</div>`));
  P.push(page(16, 'basics', `
    <h2>Grow-well basics ${img('1f9e0', 10)}</h2>
    <p class="small">The strongest foundations for baby’s brain and your wellbeing — alongside the games.</p>
    <div class="eat">${C.basics.eat.map(([c, n, f]) => `<div>${img(c, 11)}<div><b>${esc(n)}</b><br>${esc(f)}</div></div>`).join('')}</div>
    <ul class="hab">${C.basics.habits.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <div class="warn">${img('1f6cc-1f3fd', 10)} <span>${esc(C.basics.warn)}</span></div>
    <div class="photo">Our belly-art photo</div>
    <div class="cred">Sources: WHO 2016 & 2020; ACOG 2020; ICMR-NIN 2024; RCOG 2011; Partanen 2013; DeCasper 1986; Marx & Nagy 2015; Corrigan 2022. Images: Microsoft Fluent Emoji (MIT); Śrī Yantra from the sri-yantra package (MIT). For personal use; not medical advice.</div>`));
  return P;
}

function css() {
  const font = (fam, file, w, st = 'normal') => `@font-face{font-family:'${fam}';src:url('../fonts/${file}');font-weight:${w};font-style:${st}}`;
  return [
    font('Corm', 'CormorantGaramond-600.ttf', 600), font('Corm', 'CormorantGaramond-700.ttf', 700), font('Corm', 'CormorantGaramond-Italic-400.ttf', 400, 'italic'),
    font('NS', 'NotoSans-400.ttf', 400), font('NS', 'NotoSans-600.ttf', 600), font('NS', 'NotoSans-700.ttf', 700), font('NS', 'NotoSans-Italic-400.ttf', 400, 'italic'),
    font('Deva', 'NotoSerifDevanagari-500.ttf', 400), font('Deva', 'NotoSerifDevanagari-700.ttf', 700), font('Sym', 'NotoSansSymbols2-Regular.ttf', 400), font('NSerif', 'NotoSerif-400.ttf', 400),
  ].join('\n') + `
:root{--ivory:#FBF6EC;--maroon:#7A1F2B;--marigold:#E0952B;--sage:#6E8B69;--gold:#B8913A;--ink:#2E2A26;--tint:#F6E7CF;--line:#CDBBA0}
@page{size:148mm 210mm;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#888}
body{font-family:'NS','Deva','Sym','NSerif','Corm';color:var(--ink);font-size:9.2pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:148mm;height:210mm;position:relative;overflow:hidden;background:var(--ivory);break-after:page;margin:0 auto}
@media screen{.pg{margin-bottom:6mm}}
.in{position:absolute;top:9mm;bottom:11mm;display:flex;flex-direction:column;gap:2.2mm}
.recto .in{left:13mm;right:10mm}.verso .in{left:10mm;right:13mm}
.folio{position:absolute;bottom:5mm;font-family:'Corm';font-weight:700;color:var(--maroon);font-size:11pt}.recto .folio{right:10mm}.verso .folio{left:10mm}
h1,h2,h3{font-family:'Corm','Deva';color:var(--maroon);margin:0;line-height:1.05}
h1{font-size:40pt}h2{font-size:19pt}h3{font-size:12.5pt;margin-top:1mm}
p{margin:0}.small{font-size:8pt;color:#5b5249}
.deva{font-family:'Deva','NS'}
.em{object-fit:contain;vertical-align:middle}
.ahead{display:flex;align-items:center;gap:3mm}
.num{width:11mm;height:11mm;border-radius:50%;background:var(--maroon);color:#fff;font-family:'Corm';font-weight:700;font-size:17pt;display:flex;align-items:center;justify-content:center;flex:none}
.tt{flex:1}.sa{font-size:8.5pt;color:var(--gold)}.ims{display:flex;gap:1mm}
.chips{display:flex;gap:1.5mm;flex-wrap:wrap}
.chip,.badge{font-size:7.4pt;border:0.25mm solid var(--line);border-radius:3mm;padding:0.2mm 2mm;white-space:nowrap;font-family:'NS','Sym'}
.badge.bS{color:var(--sage);border-color:var(--sage)}.badge.bE{color:#B06F12;border-color:var(--marigold)}.badge.bT{color:var(--maroon);border-color:var(--maroon)}
.art{display:flex;justify-content:center;align-items:center}
.art.row2{gap:6mm;align-items:flex-end}.cap{font-size:7pt;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);text-align:center;margin-bottom:1mm}
.mandala .mg{fill:none;stroke:var(--ink);stroke-width:var(--sw)}.mandala .mp,.mandala .md{fill:none}
.kolam .kg{fill:none;stroke:#b35a63;stroke-width:1.2;stroke-dasharray:2.4 1.8;stroke-linecap:round}.kolam .kd{fill:var(--ink)}
.frame{width:118mm;height:62mm;border:0.6mm dashed var(--gold);border-radius:4mm;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2mm;font-size:7.5pt;color:#8a7d6c;background:#fff}
.gs{fill:none;stroke:var(--sage);stroke-width:.5}.gp{fill:#fff;stroke:var(--maroon);stroke-width:.25}.gc{fill:var(--marigold)}
.score{border-collapse:collapse;width:100%}.score th,.score td{border:0.25mm solid var(--line);height:8mm;text-align:center;font-size:7.5pt;background:#fff}.score th{background:var(--tint);color:var(--maroon);height:5mm}.score td:first-child{width:22mm;color:var(--maroon);font-weight:600}
.story{font-size:9pt;line-height:1.4;background:#fff;border-left:1mm solid var(--marigold);padding:2mm 3mm;border-radius:1mm}
ol.steps{margin:0;padding-left:5mm;font-size:9.6pt}ol.steps li{margin-bottom:.8mm}
.duo{display:grid;grid-template-columns:1fr 1.25fr;gap:2.5mm}
.box{border:0.3mm solid var(--line);border-radius:2.5mm;padding:1.8mm 2.4mm;background:#fff;font-size:8.4pt;line-height:1.3}
.lab{font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--maroon);margin-bottom:.6mm;font-family:'NS','Sym'}
.spirit .mt{font-size:10.5pt;color:var(--maroon);line-height:1.35}.ia{font-family:'Corm';font-style:italic;font-size:9.5pt}.me{font-size:7.8pt;color:#5b5249}
.why{font-size:8.3pt;line-height:1.3;background:var(--tint);border-radius:2.5mm;padding:1.8mm 2.4mm;display:flex;flex-direction:column;gap:.8mm}.why b{color:var(--maroon)}
.track{display:flex;align-items:center;gap:2mm;margin-top:auto}.ticks{display:flex;gap:1.6mm}.ticks i{width:5.2mm;height:5.2mm;border:0.35mm solid var(--maroon);border-radius:50%;display:inline-block;background:#fff}
.safe{font-size:7.4pt;color:var(--maroon);font-family:'NS','Sym','NSerif'}
.cover{background:radial-gradient(circle at 50% 55%,#F7E3BF,var(--ivory) 65%)}.cover .in{align-items:center;text-align:center;justify-content:flex-start;gap:1.5mm}
.kicker{font-size:7.5pt;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-top:3mm}
.cvdeva{font-size:16pt;color:var(--maroon)}.cvsub{font-family:'Corm';font-style:italic;font-size:13pt;max-width:110mm}
.cvart{position:relative;margin-top:3mm}.cvart img{width:92mm;height:92mm;border-radius:4mm}.cvmom{position:absolute;right:-12mm;bottom:-8mm}
.cvrow{display:flex;gap:3mm;margin-top:6mm}.cvname{margin-top:auto;font-family:'Corm';font-size:12pt;color:var(--maroon)}
table.week,table.pl{border-collapse:collapse;width:100%;font-size:8.8pt}table.week td,table.pl td{border-bottom:0.25mm solid var(--line);padding:1.4mm 1mm}td.d{font-weight:700;color:var(--maroon);width:16mm}td.tk{width:28mm}.week .ticks i{width:4.2mm;height:4.2mm}
.legend{display:flex;gap:2mm;flex-wrap:wrap}.note{background:var(--tint);border-radius:2.5mm;padding:2mm 3mm;font-size:8.6pt}
.mantras{display:flex;flex-direction:column;gap:2mm}.mantras .deva{font-size:10.5pt;color:var(--maroon)}.mantras .big{font-size:24pt;line-height:1}
.eat{display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 3mm;font-size:8.2pt}.eat>div{display:flex;gap:2mm;align-items:center}
ul.hab{margin:0;padding-left:4.5mm;font-size:8.4pt}ul.hab li{margin-bottom:.6mm}
.warn{display:flex;gap:2mm;align-items:center;border:0.5mm solid var(--maroon);border-radius:2.5mm;padding:2mm;font-size:8pt;color:var(--maroon);font-weight:600}
.photo{flex:1;min-height:30mm;border:0.5mm dashed var(--gold);border-radius:3mm;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2mm;font-size:7.5pt;color:#8a7d6c;background:#fff}
.hero{display:flex;justify-content:center;gap:8mm;margin:1mm 0}
.notes{flex:1 1 0;min-height:0;overflow:hidden;display:flex;flex-direction:column}.notes span{display:block;height:7mm;flex:none;border-bottom:0.25mm solid var(--line)}
.track{margin-top:0}
.cred{font-size:6.8pt;color:#7a6f63;line-height:1.25}`;
}

async function main() {
  const { chromium } = (() => { for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(c); } catch { /* next */ } } throw new Error('Playwright not found'); })();
  fs.mkdirSync(path.join(DIST, 'preview'), { recursive: true });
  const P = pages();
  if (P.length % 4) throw new Error(`page count ${P.length} not divisible by 4`);
  const htmlPath = path.join(HERE, 'garbha-khel.html'); // next to images/ so relative URLs resolve
  fs.writeFileSync(htmlPath, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${C.title}</title><style>${css()}</style></head><body>${P.join('\n')}</body></html>`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 1000 }, deviceScaleFactor: 1.6 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => { await Promise.all([...document.fonts].map((f) => f.load().catch(() => null))); await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => null))); });
  const issues = await page.evaluate(() => [...document.querySelectorAll('.pg')].flatMap((pg) => {
    const inn = pg.querySelector('.in'); const out = [];
    if (inn.scrollHeight > inn.clientHeight + 1) out.push(`page ${pg.dataset.page}: overflow ${(inn.scrollHeight - inn.clientHeight) / 3.78 | 0} mm`);
    pg.querySelectorAll('img').forEach((im) => { if (!im.complete || !im.naturalWidth) out.push(`page ${pg.dataset.page}: missing image ${im.getAttribute('src')}`); });
    return out;
  }));
  const pdfA5 = path.join(DIST, 'garbha-khel-A5.pdf');
  await page.pdf({ path: pdfA5, width: '148mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  for (const el of await page.$$('.pg')) await el.screenshot({ path: path.join(DIST, 'preview', `page-${String(await el.getAttribute('data-page')).padStart(2, '0')}.png`) });
  await browser.close();
  fs.unlinkSync(htmlPath);
  await impose(pdfA5, path.join(DIST, 'garbha-khel-A4-booklet.pdf'));
  console.info(`${P.length} pages · ${issues.length ? issues.join('; ') : 'no layout issues'}`);
  if (issues.length) process.exitCode = 1;
}

// Saddle-stitch imposition: A5 pages two-up on A4 landscape, in folding order.
async function impose(src, dst) {
  const { PDFDocument } = require('pdf-lib');
  const a5 = await PDFDocument.load(fs.readFileSync(src));
  const out = await PDFDocument.create();
  const n = a5.getPageCount();
  const pages = await out.embedPdf(a5, [...Array(n).keys()]);
  const W = 841.89, H = 595.28;
  for (let s = 0; s < n / 2; s++) {
    const [l, r] = s % 2 === 0 ? [n - 1 - s, s] : [s, n - 1 - s];
    const p = out.addPage([W, H]);
    p.drawPage(pages[l], { x: 0, y: 0, width: W / 2, height: H });
    p.drawPage(pages[r], { x: W / 2, y: 0, width: W / 2, height: H });
  }
  out.setTitle('Garbha Khel — A4 booklet (print double-sided, flip on short edge, fold in half)');
  fs.writeFileSync(dst, await out.save());
}

main().catch((e) => { console.error(e); process.exit(1); });
