// Puzzle generators for Garbha Khel. All deterministic (seeded) and self-checking.
export function rng(seed = 7) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- Sudoku (N = 6 with 2×3 boxes, or 9 with 3×3) — unique solution guaranteed ----------
export function sudoku(N = 9, seed = 1, targetGivens = N === 9 ? 30 : 14) {
  const [bh, bw] = N === 9 ? [3, 3] : [2, 3];
  const r = rng(seed);
  const ok = (g, i, v) => {
    const row = Math.floor(i / N), col = i % N;
    for (let k = 0; k < N; k++) if (g[row * N + k] === v || g[k * N + col] === v) return false;
    const br = row - (row % bh), bc = col - (col % bw);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (g[(br + y) * N + bc + x] === v) return false;
    return true;
  };
  const count = (g, limit = 2) => {
    const i = g.indexOf(0);
    if (i < 0) return 1;
    let c = 0;
    for (let v = 1; v <= N && c < limit; v++) if (ok(g, i, v)) { g[i] = v; c += count(g, limit - c); g[i] = 0; }
    return c;
  };
  const fill = (g) => {
    const i = g.indexOf(0);
    if (i < 0) return true;
    for (const v of shuffle([...Array(N)].map((_, k) => k + 1), r)) if (ok(g, i, v)) { g[i] = v; if (fill(g)) return true; g[i] = 0; }
    return false;
  };
  const sol = new Array(N * N).fill(0); fill(sol);
  const puz = [...sol];
  for (const i of shuffle([...puz.keys()], r)) {
    if (puz.filter(Boolean).length <= targetGivens) break;
    const v = puz[i]; puz[i] = 0;
    if (count([...puz]) !== 1) puz[i] = v;
  }
  if (count([...puz]) !== 1) throw new Error('sudoku not unique');
  return { N, bh, bw, puz, sol, givens: puz.filter(Boolean).length };
}

// ---------- Rectangular maze (recursive backtracker) + solution ----------
export function maze(R = 14, C = 12, seed = 3) {
  const r = rng(seed);
  const open = Array.from({ length: R * C }, () => ({ n: false, s: false, e: false, w: false }));
  const seen = new Set([0]); const st = [0];
  while (st.length) {
    const c = st[st.length - 1], y = Math.floor(c / C), x = c % C;
    const nb = [[y - 1, x, 'n', 's'], [y + 1, x, 's', 'n'], [y, x + 1, 'e', 'w'], [y, x - 1, 'w', 'e']].filter(([yy, xx]) => yy >= 0 && yy < R && xx >= 0 && xx < C && !seen.has(yy * C + xx));
    if (!nb.length) { st.pop(); continue; }
    const [yy, xx, d, o] = nb[Math.floor(r() * nb.length)];
    const k = yy * C + xx; open[c][d] = true; open[k][o] = true; seen.add(k); st.push(k);
  }
  // BFS solution from top-left to bottom-right
  const prev = new Map([[0, -1]]); const q = [0];
  while (q.length) { const c = q.shift(); const y = Math.floor(c / C), x = c % C; for (const [d, k] of [['n', c - C], ['s', c + C], ['e', c + 1], ['w', c - 1]]) if (open[c][d] && !prev.has(k)) { prev.set(k, c); q.push(k); } void y; void x; }
  const path = []; for (let c = R * C - 1; c !== -1; c = prev.get(c)) path.unshift(c);
  return { R, C, open, path };
}
export function mazeSvg({ R, C, open, path }, { cell = 8, showPath = false, wall = 'var(--ink)' } = {}) {
  let s = '';
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const o = open[y * C + x], X = x * cell, Y = y * cell;
    if (!o.n && !(y === 0 && x === 0)) s += `M${X} ${Y}h${cell}`;
    if (!o.w) s += `M${X} ${Y}v${cell}`;
    if (y === R - 1 && !(x === C - 1)) s += `M${X} ${Y + cell}h${cell}`;
    if (x === C - 1 && !(y === R - 1)) s += `M${X + cell} ${Y}v${cell}`;
  }
  const sol = showPath ? `<polyline points="${path.map((c) => `${(c % C) * cell + cell / 2},${Math.floor(c / C) * cell + cell / 2}`).join(' ')}" fill="none" stroke="#d0021b" stroke-width="${cell * 0.25}" stroke-linejoin="round"/>` : '';
  return `<svg viewBox="-2 -2 ${C * cell + 4} ${R * cell + 4}" style="width:100%;height:100%"><path d="${s}" fill="none" stroke="${wall}" stroke-width="${cell * 0.13}" stroke-linecap="round"/>${sol}</svg>`;
}

// ---------- Circular maze (Chakravyūha): rings of cells, goal = centre ----------
export function circMaze(rings = 9, seed = 11) {
  const r = rng(seed);
  const counts = [1]; // ring 0 = centre
  for (let i = 1; i <= rings; i++) { const prev = counts[i - 1]; const want = Math.round((2 * Math.PI * i) / 1.0); counts.push(i === 1 ? 6 : want >= prev * 2 ? prev * 2 : prev); }
  const id = (i, j) => `${i},${j}`;
  const nbrs = (i, j) => {
    const out = [];
    if (i > 0) { const n = counts[i]; out.push([i, (j + 1) % n], [i, (j - 1 + n) % n]); const ratio = counts[i] / counts[i - 1]; out.push([i - 1, i === 1 ? 0 : Math.floor(j / ratio)]); }
    if (i < rings) { const ratio = counts[i + 1] / counts[i]; for (let k = 0; k < (i === 0 ? counts[1] : ratio); k++) out.push([i + 1, i === 0 ? k : j * ratio + k]); }
    return out;
  };
  const links = new Set(); const seen = new Set([id(rings, 0)]); const st = [[rings, 0]];
  while (st.length) {
    const [i, j] = st[st.length - 1];
    const nb = nbrs(i, j).filter(([a, b]) => !seen.has(id(a, b)));
    if (!nb.length) { st.pop(); continue; }
    const [a, b] = nb[Math.floor(r() * nb.length)];
    links.add(id(i, j) + '|' + id(a, b)); links.add(id(a, b) + '|' + id(i, j)); seen.add(id(a, b)); st.push([a, b]);
  }
  const linked = (a, b) => links.has(a + '|' + b);
  // solution: BFS outer (rings,0) → centre
  const prev = new Map([[id(rings, 0), null]]); const q = [[rings, 0]];
  while (q.length) { const [i, j] = q.shift(); for (const [a, b] of nbrs(i, j)) { if (linked(id(i, j), id(a, b)) && !prev.has(id(a, b))) { prev.set(id(a, b), [i, j]); q.push([a, b]); } } }
  const path = []; for (let c = [0, 0]; c; c = prev.get(id(c[0], c[1]))) path.unshift(c);
  return { rings, counts, linked, id, path };
}
export function circMazeSvg(m, { showPath = false } = {}) {
  const { rings, counts, linked, id, path } = m;
  const W = 1; const pt = (rad, t) => [rad * Math.cos(t - Math.PI / 2), rad * Math.sin(t - Math.PI / 2)];
  let s = '';
  const arc = (rad, t0, t1) => { const [x0, y0] = pt(rad, t0), [x1, y1] = pt(rad, t1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${rad} ${rad} 0 ${t1 - t0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  for (let i = 1; i <= rings; i++) {
    const n = counts[i], dt = (2 * Math.PI) / n;
    for (let j = 0; j < n; j++) {
      const t0 = j * dt, t1 = (j + 1) * dt;
      const inner = i === 1 ? [0, 0] : [i - 1, Math.floor(j / (counts[i] / counts[i - 1]))];
      if (!linked(id(i, j), id(inner[0], inner[1]))) s += arc(i * W + 1, t0, t1);
      const ccw = [i, (j - 1 + n) % n];
      if (!linked(id(i, j), id(ccw[0], ccw[1]))) { const [x0, y0] = pt(i * W + 1, t0), [x1, y1] = pt((i + 1) * W + 1, t0); s += `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`; }
    }
  }
  // outer wall with an entrance gap at cell (rings,0)
  const n = counts[rings], dt = (2 * Math.PI) / n, R = (rings + 1) * W + 1;
  s += arc(R, dt, 2 * Math.PI);
  let sol = '';
  if (showPath) {
    const c = (i, j) => { if (i === 0) return [0, 0]; const dtt = (2 * Math.PI) / counts[i]; return pt(i * W + 1.5, (j + 0.5) * dtt); };
    const pts = [pt(R + 0.6, dt / 2), ...path.slice().reverse().map(([i, j]) => c(i, j))];
    sol = `<polyline points="${pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="#d0021b" stroke-width="0.3" stroke-linejoin="round"/>`;
  }
  const V = R + 1.2;
  return `<svg viewBox="${-V} ${-V} ${2 * V} ${2 * V}" style="width:100%;height:100%"><circle r="0.9" fill="var(--marigold)"/><path d="${s}" fill="none" stroke="var(--ink)" stroke-width="0.16" stroke-linecap="round"/>${sol}</svg>`;
}

// ---------- Word search ----------
export function wordSearch(words, size = 12, seed = 5) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const g = Array.from({ length: size }, () => Array(size).fill(''));
    const placed = [];
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [1, -1], [-1, -1]];
    let fail = false;
    for (const w of [...words].sort((a, b) => b.length - a.length)) {
      let done = false;
      for (let t = 0; t < 400 && !done; t++) {
        const [dy, dx] = dirs[Math.floor(r() * (t < 200 ? 4 : 8))];
        const y = Math.floor(r() * size), x = Math.floor(r() * size);
        const cells = [...w].map((_, k) => [y + dy * k, x + dx * k]);
        if (cells.some(([a, b]) => a < 0 || b < 0 || a >= size || b >= size)) continue;
        if (cells.some(([a, b], k) => g[a][b] && g[a][b] !== w[k])) continue;
        cells.forEach(([a, b], k) => { g[a][b] = w[k]; });
        placed.push({ w, cells }); done = true;
      }
      if (!done) { fail = true; break; }
    }
    if (fail) continue;
    const letters = words.join('');
    for (const row of g) for (let x = 0; x < size; x++) if (!row[x]) row[x] = letters[Math.floor(r() * letters.length)];
    return { g, placed, size };
  }
  throw new Error('word search failed');
}

// ---------- Crossword (greedy placement, many random tries, keep the best) ----------
export function crossword(entries, seed = 9, tries = 400) {
  const r = rng(seed);
  let best = null;
  for (let t = 0; t < tries; t++) {
    const order = [entries[0], ...shuffle(entries.slice(1), r)];
    const grid = new Map(); const placed = [];
    const at = (y, x) => grid.get(y + ',' + x);
    const canPlace = (w, y, x, dir) => {
      const [dy, dx] = dir === 'A' ? [0, 1] : [1, 0];
      if (at(y - dy, x - dx) || at(y + dy * w.length, x + dx * w.length)) return -1;
      let cross = 0;
      for (let k = 0; k < w.length; k++) {
        const yy = y + dy * k, xx = x + dx * k, c = at(yy, xx);
        if (c) { if (c !== w[k]) return -1; cross++; continue; }
        // side neighbours must be empty for new letters
        if (at(yy + dx, xx + dy) || at(yy - dx, xx - dy)) return -1;
      }
      return cross;
    };
    const put = (e, y, x, dir) => { const [dy, dx] = dir === 'A' ? [0, 1] : [1, 0]; [...e.w].forEach((ch, k) => grid.set((y + dy * k) + ',' + (x + dx * k), ch)); placed.push({ ...e, y, x, dir }); };
    put(order[0], 0, 0, 'A');
    let pending = order.slice(1), progress = true;
    while (pending.length && progress) {
     progress = false;
     const next = [];
     for (const e of pending) {
      const opts = [];
      for (const p of placed) for (let i = 0; i < p.w.length; i++) for (let k = 0; k < e.w.length; k++) {
        if (p.w[i] !== e.w[k]) continue;
        const dir = p.dir === 'A' ? 'D' : 'A';
        const py = p.y + (p.dir === 'D' ? i : 0), px = p.x + (p.dir === 'A' ? i : 0);
        const y = dir === 'D' ? py - k : py, x = dir === 'A' ? px - k : px;
        const c = canPlace(e.w, y, x, dir);
        if (c > 0) opts.push([c, y, x, dir]);
      }
      if (opts.length) { opts.sort((a, b) => b[0] - a[0]); const o = opts[Math.floor(r() * Math.min(3, opts.length))]; put(e, o[1], o[2], o[3]); progress = true; } else next.push(e);
     }
     pending = next;
    }
    const ys = [...grid.keys()].map((k) => +k.split(',')[0]), xs = [...grid.keys()].map((k) => +k.split(',')[1]);
    const h = Math.max(...ys) - Math.min(...ys) + 1, w = Math.max(...xs) - Math.min(...xs) + 1;
    const score = placed.length * 100 - Math.max(h, w) * 3 - Math.abs(h - w);
    if (Math.max(h, w) <= 14 && (!best || score > best.score)) best = { score, placed, grid, minY: Math.min(...ys), minX: Math.min(...xs), h, w };
  }
  // numbering
  const P = best.placed.map((p) => ({ ...p, y: p.y - best.minY, x: p.x - best.minX }));
  const starts = [...new Set(P.map((p) => p.y * 100 + p.x))].sort((a, b) => a - b);
  P.forEach((p) => { p.num = starts.indexOf(p.y * 100 + p.x) + 1; });
  const cells = new Map(); for (const [k, v] of best.grid) { const [y, x] = k.split(',').map(Number); cells.set((y - best.minY) + ',' + (x - best.minX), v); }
  return { placed: P, cells, h: best.h, w: best.w, missing: entries.filter((e) => !P.some((p) => p.w === e.w)).map((e) => e.w) };
}
