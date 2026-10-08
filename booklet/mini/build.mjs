// Garbha Khel — a 24-page A5 activity book done directly on paper:
// colouring, mazes, sudoku, word search, crossword, matching, dot-to-dot, tracing,
// symmetry, spot-the-difference, kolam, brain teasers, sacred geometry — each with its
// spiritual significance — plus an answer key.
// Usage (from booklet/): node mini/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { mandala, mandalaElementCount, kolam, dotGrid } from '../src/art.mjs';
import * as Z from './puzzles.mjs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, 'dist');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (c, mm = 10) => `<img class="em" src="images/${c}.webp" style="width:${mm}mm;height:${mm}mm" alt="">`;
const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ---------- puzzles (fixed seeds → same book every build) ----------
const SU6 = Z.sudoku(6, 2, 14);
const SU9 = Z.sudoku(9, 4, 30);
const MZ = Z.maze(15, 12, 3);
const CM = Z.circMaze(8, 11);
const WORDS = [['SHANTI', 'peace'], ['PREMA', 'love'], ['KARUNA', 'compassion'], ['ANANDA', 'bliss'], ['SATYA', 'truth'], ['AHIMSA', 'non-harm'], ['SEVA', 'service'], ['DHYANA', 'meditation'], ['BHAKTI', 'devotion'], ['MAITRI', 'friendliness'], ['DAYA', 'kindness'], ['SHRADDHA', 'faith']];
const WS = Z.wordSearch(WORDS.map((w) => w[0]), 12, 5);
const CLUES = {
  SARASWATI: 'Goddess of learning who plays the veena', GANESHA: 'Remover of obstacles, rides a mouse', LAKSHMI: 'Goddess of abundance, seated on a lotus', DIWALI: 'Festival of lamps',
  LOTUS: 'Sacred flower that rises pure from the mud', VEENA: 'Stringed instrument of Saraswati', YOGA: 'Union of body, breath and mind', GITA: 'Krishna’s song to Arjuna',
  KRISHNA: 'Plays the flute in Vrindavan', HANUMAN: 'Leapt across the ocean to Lanka', MANTRA: 'Sacred sound repeated in prayer', RANGOLI: 'Colourful floor art at the doorstep',
  GANGA: 'The holiest river', DIYA: 'Small clay oil lamp', SHANTI: 'Peace, said three times after a prayer',
};
const CW = Z.crossword(Object.keys(CLUES).map((w) => ({ w })), 3, 1500);
if (CW.missing.length) throw new Error('crossword missing ' + CW.missing);
const VAHANA = [['Gaṇeśa', 'गणेश', '1f401', 'mouse'], ['Sarasvatī', 'सरस्वती', '1f9a2', 'swan'], ['Lakṣmī', 'लक्ष्मी', '1f989', 'owl'], ['Durgā', 'दुर्गा', '1f981', 'lion'], ['Śiva', 'शिव', '1f402', 'bull (Nandī)'], ['Viṣṇu', 'विष्णु', '1f985', 'eagle (Garuḍa)'], ['Kārttikeya', 'कार्तिकेय', '1f99a', 'peacock']];
const VORDER = [3, 6, 0, 5, 1, 4, 2]; // shuffled picture column
const SYMBOLS = [['1fab7', 'lotus'], ['1fa94', 'diya'], ['1f549-fe0f', 'Om'], ['1f514', 'bell'], ['1f41a', 'conch'], ['1f319', 'moon']];
const GRAHA = ['Sūrya', 'Candra', 'Maṅgala', 'Budha', 'Guru', 'Śukra', 'Śani', 'Rāhu', 'Ketu'];

// spot-the-difference: 4 removed + 3 recoloured motifs, one per ring of the lotus mandala
const SPOT = (() => {
  const total = mandalaElementCount('lotus'); const m = new Map();
  const ringStarts = [0, 8, 16, 24, 56, 72, 104]; // first element index of each non-circle ring (8,8,8,32,16,32,24 motifs)
  const picks = [ringStarts[1] + 3, ringStarts[2] + 6, ringStarts[3] + 13, ringStarts[4] + 9, ringStarts[5] + 2, ringStarts[6] + 17, ringStarts[0] + 5];
  picks.forEach((i, k) => m.set(i % total, k < 4 ? 'remove' : 'recolor'));
  return m;
})();

// symmetry: a connected design on the left half of an 11×11 dot grid, axis x = 5
const SYM = (() => {
  const r = Z.rng(13); const segs = new Set();
  for (const start of [[5, 1], [5, 5], [5, 9]]) {
    let [x, y] = start;
    for (let k = 0; k < 9; k++) {
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 1 && a <= 5 && b >= 0 && b <= 10);
      const [nx, ny] = opts[Math.floor(r() * opts.length)];
      segs.add([x, y, nx, ny].join(',')); x = nx; y = ny;
    }
  }
  return [...segs].map((s) => s.split(',').map(Number));
})();

// dot-to-dot ॐ from the real font outline (Noto Serif Devanagari Bold)
function omDots(total = 105) {
  const { d } = JSON.parse(fs.readFileSync(path.join(HERE, 'data', 'glyphs.json'), 'utf8'))['ॐ'];
  const toks = d.match(/[MLQCZ]|-?[\d.]+/g); const subs = []; let cur = null, i = 0, p = [0, 0];
  const num = () => +toks[i++];
  while (i < toks.length) {
    const c = toks[i++];
    if (c === 'M') { p = [num(), num()]; cur = [p]; subs.push(cur); }
    else if (c === 'L') { p = [num(), num()]; cur.push(p); }
    else if (c === 'Q') { const c1 = [num(), num()], e = [num(), num()]; for (let t = 1; t <= 8; t++) { const u = t / 8; cur.push([(1 - u) ** 2 * p[0] + 2 * (1 - u) * u * c1[0] + u * u * e[0], (1 - u) ** 2 * p[1] + 2 * (1 - u) * u * c1[1] + u * u * e[1]]); } p = e; }
    else if (c === 'C') { const c1 = [num(), num()], c2 = [num(), num()], e = [num(), num()]; for (let t = 1; t <= 10; t++) { const u = t / 10, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, cc = 3 * (1 - u) * u * u, dd = u ** 3; cur.push([a * p[0] + b * c1[0] + cc * c2[0] + dd * e[0], a * p[1] + b * c1[1] + cc * c2[1] + dd * e[1]]); } p = e; }
  }
  const len = (pl) => pl.reduce((s, q, k) => s + (k ? Math.hypot(q[0] - pl[k - 1][0], q[1] - pl[k - 1][1]) : 0), 0) + Math.hypot(pl[0][0] - pl[pl.length - 1][0], pl[0][1] - pl[pl.length - 1][1]);
  const L0 = subs.map(len), T0 = L0.reduce((a, b) => a + b, 0);
  const keep = subs.filter((_, k) => L0[k] >= 0.07 * T0); // drop tiny inner counters that would clutter the numbers
  const L = keep.map(len), T = L.reduce((a, b) => a + b, 0);
  const groups = keep.map((pl, k) => {
    const n = Math.max(6, Math.round((total * L[k]) / T)), closed = [...pl, pl[0]], out = [];
    const step = L[k] / n; let acc = 0, need = 0;
    for (let j = 1; j < closed.length && out.length < n; j++) {
      const a = closed[j - 1], b = closed[j], sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (need <= acc + sl && out.length < n) { const u = sl ? (need - acc) / sl : 0; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); need += step; }
      acc += sl;
    }
    return out;
  });
  const all = groups.flat(); const xs = all.map((q) => q[0]), ys = all.map((q) => q[1]);
  return { groups, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), dropped: subs.length - keep.length };
}

// ---------- page shell ----------
function page(n, cls, body, folio = true) {
  return `<section class="pg ${cls} ${n % 2 ? 'recto' : 'verso'}" data-page="${n}"><div class="in">${body}</div>${folio ? `<div class="folio">${n}</div>` : ''}</section>`;
}
function act(n, { t, sa, lvl, how, sig, play, body }) {
  return page(n, 'act', `
    <div class="hd"><h2>${esc(t)}</h2><span class="sa deva">${esc(sa)}</span><span class="lvl">${stars(lvl)}</span></div>
    <div class="how">${how}</div>
    <div class="sig"><b>✦</b> ${sig}${play ? ` <span class="play">♪ ${esc(play)}</span>` : ''}</div>
    <div class="area">${body}</div>`);
}

// ---------- renderers ----------
const gridTable = (N, val, { bh = 0, bw = 0, cell = 'c' } = {}) => {
  let h = `<table class="grid ${cell}">`;
  for (let y = 0; y < N; y++) {
    h += '<tr>';
    for (let x = 0; x < N; x++) {
      const b = [bh && y % bh === 0 && y ? 'bt' : '', bw && x % bw === 0 && x ? 'bl' : ''].join(' ');
      h += `<td class="${b}">${val(y, x) ?? ''}</td>`;
    }
    h += '</tr>';
  }
  return h + '</table>';
};
const wsSvg = (ws, answers = false) => {
  const S = ws.size, c = 10; let s = '';
  ws.g.forEach((row, y) => row.forEach((ch, x) => { s += `<text x="${x * c + c / 2}" y="${y * c + c * 0.72}" text-anchor="middle" class="wl">${ch}</text>`; }));
  if (answers) for (const p of ws.placed) { const [a, b] = [p.cells[0], p.cells[p.cells.length - 1]]; s = `<line x1="${a[1] * c + c / 2}" y1="${a[0] * c + c / 2}" x2="${b[1] * c + c / 2}" y2="${b[0] * c + c / 2}" stroke="#f3b9a8" stroke-width="7" stroke-linecap="round"/>` + s; }
  return `<svg viewBox="0 0 ${S * c} ${S * c}" style="width:100%;height:100%">${s}</svg>`;
};
const cwTable = (cw, filled = false) => {
  const nums = new Map(cw.placed.map((p) => [p.y + ',' + p.x, p.num]));
  let h = '<table class="cw">';
  for (let y = 0; y < cw.h; y++) {
    h += '<tr>';
    for (let x = 0; x < cw.w; x++) { const k = y + ',' + x, ch = cw.cells.get(k); h += ch ? `<td class="on">${nums.has(k) ? `<i>${nums.get(k)}</i>` : ''}${filled ? ch : ''}</td>` : '<td></td>'; }
    h += '</tr>';
  }
  return h + '</table>';
};
const symSvg = (full = false) => {
  let s = '';
  for (let y = 0; y <= 10; y++) for (let x = 0; x <= 10; x++) s += `<circle cx="${x}" cy="${y}" r="0.09" fill="var(--ink)"/>`;
  s += `<line x1="5" y1="-0.5" x2="5" y2="10.5" stroke="var(--marigold)" stroke-width="0.06" stroke-dasharray="0.25 0.2"/>`;
  for (const [a, b, c, d] of SYM) {
    s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="var(--maroon)" stroke-width="0.14" stroke-linecap="round"/>`;
    if (full) s += `<line x1="${10 - a}" y1="${b}" x2="${10 - c}" y2="${d}" stroke="#d0021b" stroke-width="0.14" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="-0.5 -0.5 11 11" style="width:100%;height:100%">${s}</svg>`;
};
const flowerOfLife = () => {
  const r = 1; let s = ''; const pts = [];
  for (let q = -2; q <= 2; q++) for (let w = -2; w <= 2; w++) { const x = r * (q + w / 2), y = r * (w * Math.sqrt(3) / 2); if (Math.hypot(x, y) <= 2 * r + 1e-6) pts.push([x, y]); }
  for (const [x, y] of pts) s += `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${r}" fill="none" stroke="var(--maroon)" stroke-width="0.03" stroke-dasharray="0.08 0.07"/>`;
  s += `<circle r="${3 * r}" fill="none" stroke="var(--maroon)" stroke-width="0.04" stroke-dasharray="0.1 0.08"/>`;
  for (const [x, y] of pts) s += `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="0.04" fill="var(--marigold)"/>`;
  return { svg: `<svg viewBox="-3.15 -3.15 6.3 6.3" style="width:100%;height:100%">${s}</svg>`, count: pts.length };
};
const trianglesFigure = `<svg viewBox="0 0 100 80" style="width:34mm"><path d="M50 5 L95 75 L5 75 Z M50 5 L27.5 75 M50 5 L50 75 M50 5 L72.5 75" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const unscramble = (w, seed) => { const r = Z.rng(seed); let s; do { s = [...w].sort(() => r() - 0.5).join(''); } while (s === w); return s; };
const COUNT = (() => { const r = Z.rng(77); return Array.from({ length: 24 }, () => (r() < 0.55 ? '1fa94' : r() < 0.5 ? '1fab7' : '1f319')); })();
const DIYAS = COUNT.filter((c) => c === '1fa94').length;
const UNS = ['SHANTI', 'PREMA', 'ANANDA', 'YOGA', 'MANTRA', 'DHYANA'].map((w, i) => [unscramble(w, 50 + i), w]);

function pages() {
  const P = [];
  P.push(page(1, 'cover', `
    <div class="kicker">Puzzles · colouring · mazes · sacred games</div>
    <h1>Garbha Khel</h1><div class="deva cvdeva">गर्भ खेल</div>
    <div class="cvsub">A spiritual activity book for mother & baby</div>
    <div class="cvart"><img src="images/sriyantra-temple.png" alt=""><div class="cvmom">${img('1f930-1f3fd', 32)}</div></div>
    <div class="cvrow">${['1fab7', '1f41d', '1f3a8', '1f549-fe0f', '1fa94', '1f3b6'].map((c) => img(c, 12)).join('')}</div>
    <div class="cvname">Name ______________________ Due date __________</div>`, false));

  const LIST = [['Colour the Śrī Yantra', 3], ['Colour by number', 4], ['Chakravyūha maze', 5], ['Bee to the lotus maze', 6], ['Sacred symbol sudoku', 7], ['Navagraha sudoku', 8], ['Virtue word search', 9], ['Sacred crossword', 10], ['Match the vāhana', 11], ['Dot-to-dot ॐ', 12], ['Trace sacred words', 13], ['Complete the rangoli', 14], ['Spot 7 differences', 15], ['Kolam loop', 16], ['Brain teasers', 17], ['Mantra puzzles', 18], ['Continue the pattern', 19], ['Flower of Life', 20], ['Lotus mandala', 21]];
  P.push(page(2, 'tocpg', `
    <h2>Play list</h2>
    <div class="toc">${LIST.map(([t, p]) => `<div><span class="pn">${p}</span>${esc(t)}<span class="tk"><i></i><i></i><i></i></span></div>`).join('')}</div>
    <div class="tip">${img('1f3b6', 9)}<div><b>Play soft music while you play</b> — bansuri, veena, santoor, tanpura or bhajans, through speakers at a gentle volume. <b>Read clues, words and mantras aloud:</b> from about 19 weeks your baby hears your voice.</div></div>
    <div class="tip">${img('1f9e0', 9)}<div><b>Why puzzles and colouring?</b> They keep your mind active, focused and calm — and a calm, rested, well-nourished mother is the best environment for a growing brain. Tick a box each time; print a page again to repeat it.</div></div>
    <div class="tiny">Answers on pages 22–23 · For personal use · Stop any activity if you feel unwell, and see your doctor for anything unusual.</div>`));

  P.push(act(3, { t: 'Colour the Śrī Yantra', sa: 'श्री यन्त्र', lvl: 2, how: 'Colour the nine triangles from the outside in. Finish at the red dot.', sig: 'Four upward and five downward triangles meet as Śiva and Śakti; creation unfolds from the central bindu.', play: 'tanpura drone', body: `<img src="images/sriyantra-outline.png" class="big" alt="">` }));

  const COLS = [['#E0952B', 'saffron'], ['#C8475A', 'rose'], ['#6E8B69', 'leaf green'], ['#4F7CAC', 'sky blue'], ['#F2C94C', 'yellow'], ['#8E5DA8', 'purple']];
  P.push(act(4, { t: 'Colour by number', sa: 'रङ्ग', lvl: 1, how: 'Colour each shape with the colour of its number.', sig: 'The lotus (padma) rises clean from muddy water — purity and new life.', play: 'Raga Yaman', body: `<div class="legend">${COLS.map(([c, n], i) => `<span><b>${i + 1}</b><i style="background:${c}"></i>${n}</span>`).join('')}</div><div class="fit">${mandala('lotus', { size: 300, stroke: 0.004, labels: (i, type) => (type === 'circle' || type === 'dots' ? null : (i % 6) + 1) })}</div>` }));

  P.push(act(5, { t: 'Chakravyūha maze', sa: 'चक्रव्यूह', lvl: 3, how: 'Enter at the gap in the outer ring and find your way to the golden centre.', sig: 'In the Mahābhārata, Abhimanyu was famed for entering the circular battle formation; folk tradition says he learned it in the womb.', play: 'bansuri', body: `<div class="fit sq">${Z.circMazeSvg(CM)}</div>` }));

  P.push(act(6, { t: 'Bee to the lotus', sa: 'भ्रमर', lvl: 2, how: 'Start at the bee (top left). Find the only path to the lotus (bottom right).', sig: 'The bee drawn to the lotus is a classic image of the mind finding the sweetness within — and of bhrāmarī, the humming breath.', play: 'Raga Bhoopali', body: `<div class="mzwrap"><div class="mzs">${img('1f41d', 10)}</div><div class="fit mz">${Z.mazeSvg(MZ, { cell: 8 })}</div><div class="mzend">${img('1fab7', 12)}</div></div>` }));

  P.push(act(7, { t: 'Sacred symbol sudoku', sa: 'प्रतीक', lvl: 1, how: 'Each row, column and 2×3 box holds all six symbols once. Draw the symbol or write its number.', sig: 'Lotus, diya, Oṃ, bell, conch and moon — six auspicious symbols of the Indian home altar.', play: 'temple bells', body: `<div class="legend">${SYMBOLS.map(([c, n], i) => `<span><b>${i + 1}</b>${img(c, 6)}${n}</span>`).join('')}</div><div class="fit">${gridTable(6, (y, x) => { const v = SU6.puz[y * 6 + x]; return v ? img(SYMBOLS[v - 1][0], 10) : ''; }, { bh: 2, bw: 3, cell: 's6' })}</div>` }));

  P.push(act(8, { t: 'Navagraha sudoku', sa: 'नवग्रह', lvl: 3, how: 'Fill 1–9 so that every row, column and 3×3 box has each number once.', sig: `Nine numbers for the nine grahas: ${GRAHA.map((g, i) => `${i + 1} ${g}`).join(' · ')}.`, play: 'Raga Malkauns', body: `<div class="fit">${gridTable(9, (y, x) => SU9.puz[y * 9 + x] || '', { bh: 3, bw: 3, cell: 's9' })}</div>` }));

  P.push(act(9, { t: 'Virtue word search', sa: 'सद्गुण', lvl: 2, how: 'Find the 12 virtues — across, down and diagonal (some backwards). Say each aloud to baby.', sig: 'Patañjali’s Yoga Sūtra (1.33): friendliness, compassion and joy make the mind serene.', play: 'Bhaja Govindam', body: `<div class="fit sq">${wsSvg(WS)}</div><div class="words">${WORDS.map(([w, m]) => `<span><b>${w}</b> ${m}</span>`).join('')}</div>` }));

  const across = CW.placed.filter((p) => p.dir === 'A').sort((a, b) => a.num - b.num), down = CW.placed.filter((p) => p.dir === 'D').sort((a, b) => a.num - b.num);
  P.push(act(10, { t: 'Sacred crossword', sa: 'शब्द', lvl: 2, how: 'Solve the clues. Read each clue aloud.', sig: 'Stories of the devas, festivals and sacred things — the culture your baby is born into.', body: `<div class="fit">${cwTable(CW)}</div><div class="clues"><div><b>Across</b>${across.map((p) => `<div>${p.num}. ${esc(CLUES[p.w])} (${p.w.length})</div>`).join('')}</div><div><b>Down</b>${down.map((p) => `<div>${p.num}. ${esc(CLUES[p.w])} (${p.w.length})</div>`).join('')}</div></div>` }));

  P.push(act(11, { t: 'Match the vāhana', sa: 'वाहन', lvl: 1, how: 'Draw a line from each deity to the animal they ride.', sig: 'Each vāhana carries a meaning — Gaṇeśa’s tiny mouse shows that even the restless mind can be steered by wisdom.', body: `<div class="match"><div class="mcol">${VAHANA.map(([n, d]) => `<div class="mi"><span><b>${n}</b><br><span class="deva">${d}</span></span><i class="dot"></i></div>`).join('')}</div><div class="mcol">${VORDER.map((k) => `<div class="mi r"><i class="dot"></i>${img(VAHANA[k][2], 16)}</div>`).join('')}</div></div>` }));

  const om = omDots();
  const W = om.maxX - om.minX, H = om.maxY - om.minY, pad = 40;
  let dots = '', k = 0;
  for (const g of om.groups) g.forEach((q, j) => { k++; const x = q[0] - om.minX + pad, y = om.maxY - q[1] + pad; dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${j === 0 ? 9 : 6}" fill="${j === 0 ? 'var(--marigold)' : 'var(--ink)'}"/><text x="${(x + 8).toFixed(1)}" y="${(y - 6).toFixed(1)}" class="dn">${k}</text>`; });
  P.push(act(12, { t: 'Dot-to-dot', sa: 'ॐ', lvl: 1, how: `Join 1 → ${k} in order. Lift your pencil and start again at each orange dot. Add the bindu (dot) above the crescent, then colour it in.`, sig: 'Oṃ — the primordial sound (Māṇḍūkya Upaniṣad). Chant it softly when you finish.', play: 'Oṃ chanting', body: `<div class="fit"><svg viewBox="0 0 ${(W + 2 * pad).toFixed(0)} ${(H + 2 * pad).toFixed(0)}" style="width:100%;height:100%">${dots}</svg></div>` }));

  const TR = [['ॐ', 'oṃ', 'the sacred sound'], ['श्री', 'śrī', 'auspiciousness'], ['शान्ति', 'śānti', 'peace'], ['प्रेम', 'prema', 'love'], ['आनन्द', 'ānanda', 'bliss']];
  P.push(act(13, { t: 'Trace sacred words', sa: 'लिपि', lvl: 1, how: 'Trace the dotted letters slowly, then write each word on the line.', sig: 'Writing a holy word with attention is likhita japa — prayer through the hand.', body: `<div class="trace">${TR.map(([dv, ia, m]) => `<div class="tr"><svg viewBox="0 0 200 60"><text x="4" y="46" class="tw">${dv}</text></svg><span class="tm"><b>${ia}</b> ${m}</span><span class="tb"></span></div>`).join('')}</div>` }));

  P.push(act(14, { t: 'Complete the rangoli', sa: 'रांगोळी', lvl: 2, how: 'Draw the mirror image on the right of the dotted line, dot by dot. Then colour it.', sig: 'Rangoli at the doorstep welcomes guests and the divine — symmetry is a picture of balance.', body: `<div class="fit sq">${symSvg()}</div>` }));

  P.push(act(15, { t: 'Spot 7 differences', sa: 'भेद', lvl: 2, how: 'The lower lotus has 7 changes — missing or different shapes. Circle them.', sig: 'Patient, careful seeing is a form of dhyāna (meditation).', body: `<div class="spot"><div class="fit">${mandala('lotus', { size: 260, colour: true, stroke: 0.004 })}</div><div class="fit">${mandala('lotus', { size: 260, colour: true, stroke: 0.004, mods: SPOT })}</div></div>` }));

  const K = kolam(5, 5, [[2, 1], [9, 2], [8, 9], [1, 8], [4, 1], [9, 4], [6, 9], [1, 6]], { guide: true });
  P.push(act(16, { t: 'Kolam loop', sa: 'कोलम्', lvl: 2, how: 'Trace the kolam in one unbroken line. Then create your own loop around the dots below.', sig: 'Drawn at dawn in rice flour, a kolam feeds ants and birds — kindness to every being.', play: 'veena', body: `<div class="kol"><div class="kw">${K.svg}</div><div class="kw">${dotGrid(7, 7)}</div></div>` }));

  P.push(act(17, { t: 'Brain teasers', sa: 'बुद्धि', lvl: 2, how: 'Four quick puzzles — answers on page 23.', sig: 'Buddhi, the discerning intellect, grows sharper with gentle, joyful use.', body: `
    <div class="tz"><b>1. What comes next?</b><div class="seq">${['1fab7', '1fa94', '1fab7', '1fa94', '1fa94', '1fab7', '1fa94', '1fa94', '1fa94'].map((c) => img(c, 8)).join('')}<span class="q">?</span></div></div>
    <div class="tz"><b>2. Which is the odd one out?</b><div class="seq">${[['A', '1fa88'], ['B', '1f941'], ['C', '1f96d'], ['D', '1f514']].map(([l, c]) => `<span class="opt">${l} ${img(c, 10)}</span>`).join('')}</div></div>
    <div class="tz row"><div><b>3. How many triangles?</b><br><span class="tiny">(The Śrī Yantra has 43!)</span></div>${trianglesFigure}<span class="ans">____</span></div>
    <div class="tz row"><div><b>4. Kubera yantra</b><br><span class="tiny">Every row, column and diagonal adds up to 72. Fill the gaps.</span></div>${gridTable(3, (y, x) => ({ '0,0': 27, '0,1': 20, '1,1': 24, '1,2': 26 })[y + ',' + x] ?? '', { cell: 'mq' })}</div>
    <div class="tz row"><div><b>5. Count the diyas</b><br><span class="tiny">How many lamps are lit for Diwali?</span></div><div class="scatter">${COUNT.map((c) => img(c, 7)).join('')}</div><span class="ans">____</span></div>
    <div class="tz row"><div><b>6. Number pattern</b><br><span class="tiny">1 · 3 · 6 · 10 · 15 · ?</span></div><span class="tiny">(Hint: add one more each time)</span><span class="ans">____</span></div>` }));

  P.push(act(18, { t: 'Mantra puzzles', sa: 'मन्त्र', lvl: 1, how: 'Fill the missing words from the box, then unscramble the six sacred words.', sig: 'Asato mā (Bṛhadāraṇyaka Upaniṣad 1.3.28) — a prayer for light; Sarve bhavantu — for everyone’s happiness.', body: `
    <div class="bank">Word box: <b>jyotir</b> · <b>amṛtaṃ</b> · <b>sad</b> · <b>sukhinaḥ</b> · <b>nirāmayāḥ</b></div>
    <div class="fill">asato mā ________ gamaya<br>tamaso mā ________ gamaya<br>mṛtyor mā ________ gamaya</div>
    <div class="fill">sarve bhavantu ________<br>sarve santu ________</div>
    <div class="uns">${UNS.map(([s]) => `<div><span class="sc">${s}</span><span class="bl"></span></div>`).join('')}</div>
    <div class="bank"><b>Join each mantra to its meaning</b></div>
    <div class="match small">${(() => { const M = [['ॐ शान्तिः शान्तिः शान्तिः', 'Peace, peace, peace'], ['तमसो मा ज्योतिर्गमय', 'Lead me from darkness to light'], ['सह नाववतु', 'May we two be protected together'], ['पूर्णमदः पूर्णमिदम्', 'That is whole; this is whole'], ['वसुधैव कुटुम्बकम्', 'The world is one family']]; const ord = [2, 4, 0, 3, 1]; return `<div class="mcol">${M.map(([d]) => `<div class="mi"><span class="deva">${d}</span><i class="dot"></i></div>`).join('')}</div><div class="mcol">${ord.map((k) => `<div class="mi r"><i class="dot"></i><span>${M[k][1]}</span></div>`).join('')}</div>`; })()}</div>` }));

  const motif = {
    lotus: `<path d="M10 18 Q5 10 10 3 Q15 10 10 18 Z M10 18 Q2 16 1 9 Q7 11 10 18 Z M10 18 Q18 16 19 9 Q13 11 10 18 Z" fill="none" stroke="var(--maroon)" stroke-width="1"/>`,
    wave: `<path d="M0 10 Q5 2 10 10 T20 10" fill="none" stroke="var(--maroon)" stroke-width="1.2"/><circle cx="5" cy="14" r="1.2" fill="var(--maroon)"/><circle cx="15" cy="6" r="1.2" fill="var(--maroon)"/>`,
    diamond: `<path d="M10 2 L18 10 L10 18 L2 10 Z" fill="none" stroke="var(--maroon)" stroke-width="1.1"/><circle cx="10" cy="10" r="2" fill="var(--maroon)"/>`,
    leaf: `<path d="M2 16 Q4 4 18 4 Q16 16 2 16 Z M2 16 L18 4" fill="none" stroke="var(--maroon)" stroke-width="1.1"/>`,
    paisley: `<path d="M6 18 C-1 14 1 4 9 3 C14 2 18 6 16 11 C14 16 9 12 11 9" fill="none" stroke="var(--maroon)" stroke-width="1.1"/><circle cx="8" cy="11" r="1.3" fill="var(--maroon)"/>`,
  };
  const ghost = `<svg viewBox="0 0 20 20" class="ghost"><rect x="1" y="1" width="18" height="18" rx="2"/></svg>`;
  const row = (m) => `<div class="pr">${[0, 1, 2].map(() => `<svg viewBox="0 0 20 20">${motif[m]}</svg>`).join('')}${ghost.repeat(5)}</div>`;
  P.push(act(19, { t: 'Continue the pattern', sa: 'आकृति', lvl: 1, how: 'Copy each border into the empty boxes. Design your own on the last line.', sig: 'Borders like these frame sarees, temple walls and mehendi — rhythm made visible.', body: `<div class="prs">${['lotus', 'paisley', 'wave', 'diamond', 'leaf'].map(row).join('')}<div class="pr">${ghost.repeat(8)}</div></div>` }));

  const FOL = flowerOfLife();
  P.push(act(20, { t: 'Flower of Life', sa: 'जीवन पुष्प', lvl: 2, how: `Trace the ${FOL.count} dotted circles with a coin or bangle, then colour the petals they make.`, sig: 'Circles overlapping from one centre — one life unfolding into many, like cells growing from a single seed.', play: 'santoor', body: `<div class="fit sq">${FOL.svg}</div>` }));

  P.push(act(21, { t: 'Lotus mandala', sa: 'मण्डल', lvl: 1, how: 'Colour from the centre outwards, one ring per song.', sig: 'A maṇḍala is a sacred circle — every ring returns you to the centre.', play: 'Raga Bageshri', body: `<div class="fit">${mandala('flower', { size: 340, stroke: 0.0045 })}</div>` }));

  // ---------- answers ----------
  const sol6 = gridTable(6, (y, x) => SU6.sol[y * 6 + x], { bh: 2, bw: 3, cell: 'a6' });
  const sol9 = gridTable(9, (y, x) => SU9.sol[y * 9 + x], { bh: 3, bw: 3, cell: 'a9' });
  P.push(page(22, 'ans', `<h2>Answers</h2>
    <div class="ag"><div><b>Sacred symbol sudoku</b><span class="tiny">1 lotus · 2 diya · 3 Oṃ · 4 bell · 5 conch · 6 moon</span>${sol6}</div><div><b>Navagraha sudoku</b>${sol9}</div>
    <div><b>Chakravyūha maze</b><div class="am">${Z.circMazeSvg(CM, { showPath: true })}</div></div><div><b>Bee to the lotus</b><div class="am">${Z.mazeSvg(MZ, { cell: 8, showPath: true })}</div></div>
    <div><b>Word search</b><div class="am">${wsSvg(WS, true)}</div></div><div><b>Crossword</b>${cwTable(CW, true).replace('class="cw"', 'class="cw small"')}</div></div>`));
  P.push(page(23, 'ans', `<h2>Answers</h2>
    <div class="ag"><div><b>Spot 7 differences</b><div class="am">${mandala('lotus', { size: 200, colour: true, stroke: 0.004, mods: new Map([...SPOT].map(([i]) => [i, 'highlight'])) })}</div></div>
    <div><b>Complete the rangoli</b><div class="am">${symSvg(true)}</div></div></div>
    <div class="al"><b>Match the vāhana:</b> ${VAHANA.map(([n, , , a]) => `${n} – ${a}`).join(' · ')}.</div>
    <div class="al"><b>Brain teasers:</b> 1. lotus (one lotus, then one more diya each time) · 2. C, the mango (the others are musical instruments) · 3. 10 triangles · 4. Kubera yantra: 27 20 25 / 22 24 26 / 23 28 21 · 5. ${DIYAS} diyas · 6. 21.</div>
    <div class="al"><b>Mantra puzzles:</b> sad · jyotir · amṛtaṃ — sukhinaḥ · nirāmayāḥ. Unscrambled: ${UNS.map(([s, w]) => `${s} → ${w}`).join(' · ')}. Meanings: ॐ śānti – peace · tamaso mā – darkness to light · saha nāvavatu – protected together · pūrṇamadaḥ – whole · vasudhaiva – one family.</div>`));

  P.push(page(24, 'back', `
    <div>${img('1f64f-1f3fd', 18)}</div>
    <div class="deva bkm">सर्वे भवन्तु सुखिनः । सर्वे सन्तु निरामयाः ॥</div>
    <div class="bke">May all be happy; may all be free from illness.</div>
    <div class="tip">${img('1f3b5', 9)}<div><b>Music to play with these pages:</b> Raga Yaman & Bhoopali (bansuri, Hariprasad Chaurasia) · santoor, <i>Call of the Valley</i> · veena, Raga Mohanam · M.S. Subbulakshmi, <i>Bhaja Govindam</i> · tanpura drone · lullabies such as <i>Omanathinkal Kidavo</i>.</div></div>
    <div class="tiny">Images: Microsoft Fluent Emoji 3D (MIT); Śrī Yantra rendered with the sri-yantra package (MIT). Dot-to-dot traced from Noto Serif Devanagari (OFL). Not medical advice — keep up your antenatal check-ups.</div>`, false));
  return P;
}

function css() {
  const font = (fam, file, w, st = 'normal') => `@font-face{font-family:'${fam}';src:url('../fonts/${file}');font-weight:${w};font-style:${st}}`;
  return [font('Corm', 'CormorantGaramond-600.ttf', 600), font('Corm', 'CormorantGaramond-700.ttf', 700), font('Corm', 'CormorantGaramond-Italic-400.ttf', 400, 'italic'),
    font('NS', 'NotoSans-400.ttf', 400), font('NS', 'NotoSans-600.ttf', 600), font('NS', 'NotoSans-700.ttf', 700), font('NS', 'NotoSans-Italic-400.ttf', 400, 'italic'),
    font('Deva', 'NotoSerifDevanagari-500.ttf', 400), font('Deva', 'NotoSerifDevanagari-700.ttf', 700), font('Sym', 'NotoSansSymbols2-Regular.ttf', 400), font('NSerif', 'NotoSerif-400.ttf', 400)].join('\n') + `
:root{--ivory:#FBF6EC;--maroon:#7A1F2B;--marigold:#E0952B;--sage:#6E8B69;--gold:#B8913A;--ink:#2E2A26;--tint:#F6E7CF;--line:#CDBBA0;--m0:#F3D9DE;--m1:#F8E1C0;--m2:#DDE6D6;--m3:#EFE3C4}
@page{size:148mm 210mm;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#888}
body{font-family:'NS','Deva','Sym','NSerif','Corm';color:var(--ink);font-size:8.6pt;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:148mm;height:210mm;position:relative;overflow:hidden;background:#fff;break-after:page;margin:0 auto}
@media screen{.pg{margin-bottom:6mm}}
.in{position:absolute;top:8mm;bottom:10mm;display:flex;flex-direction:column;gap:1.6mm}
.recto .in{left:12mm;right:9mm}.verso .in{left:9mm;right:12mm}
.folio{position:absolute;bottom:4mm;font-family:'Corm';font-weight:700;color:var(--maroon);font-size:10pt}.recto .folio{right:9mm}.verso .folio{left:9mm}
h1,h2{font-family:'Corm','Deva';color:var(--maroon);margin:0;line-height:1.05}h1{font-size:40pt}h2{font-size:17pt}
.deva{font-family:'Deva','NS'}.em{object-fit:contain;vertical-align:middle}.tiny{font-size:7pt;color:#6b6157}
.hd{display:flex;align-items:baseline;gap:2.5mm;border-bottom:0.5mm solid var(--marigold);padding-bottom:1mm}.hd .sa{color:var(--gold);font-size:11pt}.hd .lvl{margin-left:auto;color:var(--marigold);font-family:'Sym','NS';font-size:9pt}
.how{font-size:9pt;font-weight:600}.sig{font-size:7.6pt;color:#5b5249;line-height:1.25}.sig b{color:var(--maroon)}.play{color:var(--sage);white-space:nowrap}
.area{flex:1;min-height:0;display:flex;flex-direction:column;gap:2mm}
.fit{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}.fit>svg{max-width:100%;max-height:100%;width:auto;height:100%}
.fit.sq>svg{aspect-ratio:1}.big{flex:1;min-height:0;object-fit:contain;width:100%}
.mandala .mg{fill:none;stroke:var(--ink);stroke-width:var(--sw)}.mandala.line .mp,.mandala.line .md{fill:none}.mandala.col .mp,.mandala.col .md{stroke:var(--maroon)}.mlab{font-family:'NS';fill:#7a6f63;font-weight:600}
.legend{display:flex;flex-wrap:wrap;gap:1.5mm 3mm;font-size:7.6pt}.legend span{display:flex;align-items:center;gap:1mm}.legend b{color:var(--maroon)}.legend i{width:4mm;height:4mm;border-radius:1mm;display:inline-block;border:0.2mm solid #0002}
table.grid{border-collapse:collapse;border:0.6mm solid var(--maroon)}table.grid td{border:0.25mm solid var(--line);text-align:center;vertical-align:middle;padding:0}table.grid td.bt{border-top:0.6mm solid var(--maroon)}table.grid td.bl{border-left:0.6mm solid var(--maroon)}
.s6 td{width:18mm;height:18mm}.s9 td{width:12.6mm;height:12.6mm;font-size:13pt;font-weight:700;color:var(--maroon)}.mq td{width:9mm;height:9mm;font-size:10pt;font-weight:700}
.a6 td{width:5.2mm;height:5.2mm;font-size:7pt}.a9 td{width:4.6mm;height:4.6mm;font-size:6.6pt}
.mzwrap{flex:1;min-height:0;display:flex;flex-direction:column}.mzs{align-self:flex-start}.mz{width:100%}.mzend{align-self:flex-end}
.wl{font-family:'NS';font-weight:600;font-size:6.6px;fill:var(--ink)}
.words{display:grid;grid-template-columns:repeat(3,1fr);gap:0.6mm 2mm;font-size:7.4pt}.words b{color:var(--maroon)}
table.cw{border-collapse:collapse}table.cw td{width:8.2mm;height:8.2mm;padding:0;position:relative;text-align:center;vertical-align:middle;font-weight:700;font-size:9pt}table.cw td.on{border:0.3mm solid var(--ink);background:#fff}table.cw i{position:absolute;top:0.2mm;left:0.5mm;font-size:5pt;font-style:normal;font-weight:600;color:var(--maroon)}
table.cw.small td{width:3.7mm;height:3.7mm;font-size:5pt}table.cw.small i{display:none}
.clues{display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-size:7.3pt;line-height:1.25}.clues b{color:var(--maroon)}
.match{flex:1;display:flex;justify-content:space-between;padding:0 4mm}.mcol{display:flex;flex-direction:column;justify-content:space-around}.mi{display:flex;align-items:center;gap:4mm;justify-content:space-between;min-width:35mm;font-size:9pt}.mi.r{justify-content:flex-start;min-width:0}.mi .deva{color:var(--gold)}
.dot{width:3mm;height:3mm;border-radius:50%;background:var(--maroon);display:inline-block}
.dn{font-family:'NS';font-size:22px;fill:var(--maroon);font-weight:600}
.trace{flex:1;display:flex;flex-direction:column;justify-content:space-between}.tr{display:grid;grid-template-columns:78mm 1fr;align-items:center;gap:1mm 3mm}.tr svg{width:78mm;height:23mm}.tw{font-family:'Deva';font-weight:700;font-size:46px;fill:#F1E6D6;stroke:var(--maroon);stroke-width:0.9;stroke-dasharray:2.2 1.8}
.tm{font-size:7.6pt}.tb{grid-column:1/3;height:9mm;border-bottom:0.3mm solid var(--line)}
.spot{flex:1;min-height:0;display:flex;flex-direction:column;gap:2mm}
.kol{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-around}.kw{width:66mm}
.kolam .kg{fill:none;stroke:#b35a63;stroke-width:1.2;stroke-dasharray:2.4 1.8;stroke-linecap:round}.kolam .kd{fill:var(--ink)}
.tz{border:0.3mm solid var(--line);border-radius:2mm;padding:2mm 3mm;display:flex;flex-direction:column;gap:1.5mm;font-size:8.6pt}.tz.row{flex-direction:row;align-items:center;justify-content:space-between}.seq{display:flex;align-items:center;gap:1.4mm;flex-wrap:wrap}.q{font-size:15pt;font-weight:700;color:var(--maroon);border:0.4mm dashed var(--maroon);border-radius:1.5mm;padding:0 2mm}.opt{display:flex;align-items:center;gap:1mm;margin-right:3mm;font-weight:700}.ans{font-size:11pt}
.scatter{display:grid;grid-template-columns:repeat(8,7mm);gap:0.8mm}.match.small{flex:none;padding:0 2mm}.match.small .mi{font-size:8.4pt;min-width:0;gap:3mm;margin:1.2mm 0}.match.small .deva{color:var(--maroon);font-size:10pt}
.bank{background:var(--tint);border-radius:2mm;padding:2mm 3mm;font-size:8.6pt}.fill{font-family:'Corm';font-style:italic;font-size:14pt;line-height:1.8}
.uns{display:grid;grid-template-columns:1fr 1fr;gap:3mm 6mm}.uns div{display:flex;align-items:flex-end;gap:2mm}.sc{font-weight:700;letter-spacing:0.15em;color:var(--maroon);font-size:10.5pt;width:22mm}.bl{flex:1;border-bottom:0.3mm solid var(--line);height:6mm}
.prs{flex:1;display:flex;flex-direction:column;justify-content:space-around}.pr{display:flex;gap:1.2mm;justify-content:space-between}.pr svg{width:13.5mm;height:13.5mm}.ghost rect{fill:none;stroke:#ccc0ad;stroke-width:0.5;stroke-dasharray:1.5 1.2}
.toc{display:grid;grid-template-columns:1fr 1fr;gap:1.2mm 4mm;font-size:8.6pt}.toc div{display:flex;align-items:center;gap:2mm;border-bottom:0.2mm solid var(--line);padding:0.8mm 0}.pn{font-family:'Corm';font-weight:700;color:var(--maroon);width:5mm}.tk{margin-left:auto;display:flex;gap:1mm}.tk i{width:3.2mm;height:3.2mm;border:0.3mm solid var(--maroon);border-radius:0.6mm;display:inline-block}
.tocpg .in{gap:3mm}.tip{display:flex;gap:2.5mm;align-items:flex-start;background:var(--tint);border-radius:2.5mm;padding:2.2mm 3mm;font-size:8.2pt}
.cover{background:radial-gradient(circle at 50% 55%,#F7E3BF,var(--ivory) 65%)}.cover .in,.back .in{align-items:center;text-align:center}
.kicker{font-size:7.2pt;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-top:4mm}.cvdeva{font-size:16pt;color:var(--maroon)}.cvsub{font-family:'Corm';font-style:italic;font-size:13pt}
.cvart{position:relative;margin-top:4mm}.cvart img{width:96mm;height:96mm;border-radius:4mm}.cvmom{position:absolute;right:-12mm;bottom:-8mm}.cvrow{display:flex;gap:3mm;margin-top:7mm}.cvname{margin-top:auto;font-family:'Corm';font-size:11.5pt;color:var(--maroon)}
.back{background:var(--ivory)}.back .in{justify-content:center;gap:4mm}.bkm{font-size:14pt;color:var(--maroon)}.bke{font-family:'Corm';font-style:italic;font-size:12pt}.back .tip{text-align:left}
.ans .in{gap:2mm}.ag{display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-size:7.6pt}.ag>div{display:flex;flex-direction:column;gap:1mm;align-items:flex-start}.ag b{color:var(--maroon)}.am{width:100%;max-width:56mm;aspect-ratio:1}.am svg{width:100%;height:100%}.al{font-size:7.8pt;line-height:1.35}.al b{color:var(--maroon)}`;
}

async function main() {
  const { chromium } = (() => { for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(c); } catch { /* next */ } } throw new Error('Playwright not found'); })();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'preview'), { recursive: true });
  const P = pages();
  if (P.length % 4) throw new Error(`page count ${P.length} not divisible by 4`);
  const htmlPath = path.join(HERE, 'garbha-khel.html');
  fs.writeFileSync(htmlPath, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Garbha Khel</title><style>${css()}</style></head><body>${P.join('\n')}</body></html>`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 1000 }, deviceScaleFactor: 1.6 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => { await Promise.all([...document.fonts].map((f) => f.load().catch(() => null))); await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => null))); });
  const issues = await page.evaluate(() => [...document.querySelectorAll('.pg')].flatMap((pg) => {
    const inn = pg.querySelector('.in'), out = [];
    if (inn.scrollHeight > inn.clientHeight + 1) out.push(`page ${pg.dataset.page}: overflow ${((inn.scrollHeight - inn.clientHeight) / 3.78).toFixed(1)} mm`);
    const ir = inn.getBoundingClientRect();
    pg.querySelectorAll('.in > *, .area > *, table').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && (r.right > ir.right + 2 || r.left < ir.left - 2 || r.bottom > ir.bottom + 2)) out.push(`page ${pg.dataset.page}: ${el.tagName}.${el.className} spills ${(Math.max(r.right - ir.right, ir.left - r.left, r.bottom - ir.bottom) / 3.78).toFixed(1)} mm`); });
    pg.querySelectorAll('img').forEach((im) => { if (!im.naturalWidth) out.push(`page ${pg.dataset.page}: missing image ${im.getAttribute('src')}`); });
    return out;
  }));
  const pdfA5 = path.join(DIST, 'garbha-khel-A5.pdf');
  await page.pdf({ path: pdfA5, width: '148mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  for (const el of await page.$$('.pg')) await el.screenshot({ path: path.join(DIST, 'preview', `page-${String(await el.getAttribute('data-page')).padStart(2, '0')}.png`) });
  await browser.close();
  fs.unlinkSync(htmlPath);
  await impose(pdfA5, path.join(DIST, 'garbha-khel-A4-booklet.pdf'));
  const uniq = [...new Set(issues)];
  console.info(`${P.length} pages · sudoku givens ${SU6.givens}/${SU9.givens} (unique) · crossword ${CW.placed.length} words ${CW.h}×${CW.w}\n${uniq.length ? uniq.slice(0, 30).join('\n') : 'no layout issues'}`);
}

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
