// Original, code-generated vector art for the booklet.
// Every generator returns an SVG string. Colours come from CSS custom properties
// (var(--...)) so the same art works in the colour and low-ink editions.

const f = (n) => +n.toFixed(3);
const TAU = Math.PI * 2;
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];

// ---------- deterministic randomness ----------
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- badges & strand icons ----------
export function badgeIcon(kind, size = 12) {
  const c = 'var(--badge-' + kind + ')';
  if (kind === 'S') return `<svg class="bdg" viewBox="0 0 12 12" width="${size}" height="${size}"><circle cx="6" cy="6" r="5" fill="${c}"/></svg>`;
  if (kind === 'E') return `<svg class="bdg" viewBox="0 0 12 12" width="${size}" height="${size}"><circle cx="6" cy="6" r="4.6" fill="none" stroke="${c}" stroke-width="1"/><path d="M6 1.4 A4.6 4.6 0 0 0 6 10.6 Z" fill="${c}"/></svg>`;
  if (kind === 'T') return `<svg class="bdg" viewBox="0 0 12 12" width="${size}" height="${size}"><path d="M6 0.6 L7.3 4.7 L11.4 6 L7.3 7.3 L6 11.4 L4.7 7.3 L0.6 6 L4.7 4.7 Z" fill="${c}"/></svg>`;
  return `<svg class="bdg" viewBox="0 0 12 12" width="${size}" height="${size}"><circle cx="6" cy="6" r="4.6" fill="none" stroke="${c}" stroke-width="1.2"/><path d="M3 3 L9 9 M9 3 L3 9" stroke="${c}" stroke-width="1.2"/></svg>`;
}

export function strandIcon(strand, size = 16) {
  const s = 'stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const body = {
    mind: `<path d="M3 6 Q8 4 12 6.5 Q16 4 21 6 L21 18 Q16 16 12 18.5 Q8 16 3 18 Z" ${s}/><path d="M12 6.5 L12 18.5" ${s}/>`,
    body: `<circle cx="12" cy="4.6" r="2" ${s}/><path d="M12 7 L12 14 M5 9.5 Q12 12 19 9.5 M12 14 L8 20 M12 14 L16 20" ${s}/>`,
    heart: `<path d="M12 20 C4 14 2.5 10 4.5 7 C6.5 4 10 4.5 12 7.5 C14 4.5 17.5 4 19.5 7 C21.5 10 20 14 12 20 Z" ${s}/>`,
    spirit: lotusPath(12, 15, 8.5, s),
    nourish: `<path d="M3 11 L21 11 Q20 19 12 19 Q4 19 3 11 Z" ${s}/><path d="M9 8 Q8 6 9.5 4.5 M13 8 Q12 6 13.5 4.5" ${s}/>`,
  }[strand];
  return `<svg class="sicon" viewBox="0 0 24 24" width="${size}" height="${size}">${body}</svg>`;
}

function lotusPath(cx, by, h, attrs) {
  // simple side-view lotus: centre petal, two side petals, two outer petals, base line
  const p = (dx, w, ht) => `<path d="M${cx + dx} ${by} Q${cx + dx - w} ${by - ht * 0.55} ${cx + dx} ${by - ht} Q${cx + dx + w} ${by - ht * 0.55} ${cx + dx} ${by} Z" ${attrs}/>`;
  return p(0, h * 0.42, h) +
    `<path d="M${cx} ${by} Q${cx - h * 0.95} ${by - h * 0.25} ${cx - h * 0.62} ${by - h * 0.78} Q${cx - h * 0.25} ${by - h * 0.45} ${cx} ${by} Z" ${attrs}/>` +
    `<path d="M${cx} ${by} Q${cx + h * 0.95} ${by - h * 0.25} ${cx + h * 0.62} ${by - h * 0.78} Q${cx + h * 0.25} ${by - h * 0.45} ${cx} ${by} Z" ${attrs}/>` +
    `<path d="M${cx - h * 1.05} ${by - h * 0.18} Q${cx - h * 0.5} ${by + h * 0.05} ${cx} ${by} Q${cx + h * 0.5} ${by + h * 0.05} ${cx + h * 1.05} ${by - h * 0.18}" ${attrs}/>`;
}

export function lotusIcon(w = 60, cls = '') {
  return `<svg class="lotus ${cls}" viewBox="0 0 24 18" width="${w}" height="${w * 0.75}">${lotusPath(12, 16, 12, 'fill="var(--tint-maroon)" stroke="var(--maroon)" stroke-width="0.7" stroke-linejoin="round"')}</svg>`;
}

export function paisley(w = 30, rot = 0) {
  return `<svg class="paisley" viewBox="-12 -16 24 32" width="${w}" height="${w * 1.33}"><g transform="rotate(${rot})">
  <path d="M0 14 C-11 12 -12 -2 -4 -8 C0 -11 6 -13 4 -15 C10 -10 11 4 0 14 Z" fill="var(--tint-marigold)" stroke="var(--gold)" stroke-width="0.9"/>
  <path d="M0 9 C-6 7 -6 -1 -1 -4 C3 -6 5 2 0 9 Z" fill="none" stroke="var(--maroon)" stroke-width="0.7"/>
  <circle cx="-0.6" cy="2" r="1.4" fill="var(--maroon)"/></g></svg>`;
}

// ---------- mandala generator (true n-fold rotational + mirror symmetry) ----------
// A ring is a motif drawn once inside a wedge and mirrored about the wedge axis, then
// rotated n times. `symmetryCheck` re-samples every motif point and confirms that the
// rotated point set maps onto itself.
function petal(r0, r1, halfAng, bulge = 1) {
  const [x0, y0] = pol(r0, 0);
  const [x1, y1] = pol(r1, 0);
  const [cx1, cy1] = pol((r0 + r1) / 2, halfAng * bulge);
  const [cx2, cy2] = pol((r0 + r1) / 2, -halfAng * bulge);
  return { d: `M${f(x0)} ${f(y0)} Q${f(cx1)} ${f(cy1)} ${f(x1)} ${f(y1)} Q${f(cx2)} ${f(cy2)} ${f(x0)} ${f(y0)} Z`, pts: [[x0, y0], [x1, y1], [cx1, cy1], [cx2, cy2]] };
}
function lotusPetal(r0, r1, halfAng) {
  const tip = pol(r1, 0);
  const a = pol(r0, halfAng), b = pol(r0, -halfAng);
  const c1 = pol(r0 + (r1 - r0) * 0.75, halfAng * 1.05), c2 = pol(r0 + (r1 - r0) * 0.75, -halfAng * 1.05);
  return { d: `M${f(a[0])} ${f(a[1])} Q${f(c1[0])} ${f(c1[1])} ${f(tip[0])} ${f(tip[1])} Q${f(c2[0])} ${f(c2[1])} ${f(b[0])} ${f(b[1])}`, pts: [a, b, tip, c1, c2] };
}

const RINGS = {
  circle: (r) => ({ full: `<circle r="${f(r)}"/>` }),
  dots: (r0, r1, n) => { const p = pol((r0 + r1) / 2, 0); return { d: null, dot: [p[0], p[1], (r1 - r0) * 0.28], pts: [p] }; },
  petals: (r0, r1, n) => petal(r0, r1, (Math.PI / n) * 0.9),
  slimPetals: (r0, r1, n) => petal(r0, r1, (Math.PI / n) * 0.55),
  lotus: (r0, r1, n) => lotusPetal(r0, r1, Math.PI / n),
  scallop: (r0, r1, n) => { const a = pol(r0, Math.PI / n), b = pol(r0, -Math.PI / n), t = pol(r1, 0); return { d: `M${f(a[0])} ${f(a[1])} Q${f(t[0] * 1.02)} ${f(t[1])} ${f(b[0])} ${f(b[1])}`, pts: [a, b, t] }; },
  spikes: (r0, r1, n) => { const a = pol(r0, Math.PI / n), b = pol(r0, -Math.PI / n), t = pol(r1, 0); return { d: `M${f(a[0])} ${f(a[1])} L${f(t[0])} ${f(t[1])} L${f(b[0])} ${f(b[1])}`, pts: [a, b, t] }; },
  flames: (r0, r1, n) => { const h = Math.PI / n; const a = pol(r0, h * 0.8), b = pol(r0, -h * 0.8), t = pol(r1, 0), c1 = pol(r0 + (r1 - r0) * 0.6, h * 1.1), c2 = pol(r0 + (r1 - r0) * 0.45, -h * 0.2); return { d: `M${f(a[0])} ${f(a[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(t[0])} ${f(t[1])} C${f(c2[0])} ${f(-c2[1])} ${f(c1[0])} ${f(-c1[1])} ${f(b[0])} ${f(b[1])}`, pts: [a, b, t, c1, c2, [c1[0], -c1[1]], [c2[0], -c2[1]]] }; },
  crescents: (r0, r1, n) => { const c = pol((r0 + r1) / 2, 0); const rr = (r1 - r0) * 0.42; return { d: `M${f(c[0] - rr)} ${f(c[1])} A${f(rr)} ${f(rr)} 0 1 0 ${f(c[0] + rr)} ${f(c[1])} A${f(rr * 1.25)} ${f(rr * 1.25)} 0 0 1 ${f(c[0] - rr)} ${f(c[1])} Z`, pts: [c] }; },
  leaves: (r0, r1, n) => { const p = petal(r0 + (r1 - r0) * 0.1, r1, (Math.PI / n) * 0.7, 1.2); const v = pol(r1 * 0.98, 0), u = pol(r0 + (r1 - r0) * 0.1, 0); return { d: p.d + ` M${f(u[0])} ${f(u[1])} L${f(v[0])} ${f(v[1])}`, pts: p.pts }; },
  doublePetal: (r0, r1, n) => { const a = petal(r0, r1, (Math.PI / n) * 0.85); const b = petal(r0 + (r1 - r0) * 0.25, r1 * 0.94, (Math.PI / n) * 0.45); return { d: a.d + ' ' + b.d, pts: [...a.pts, ...b.pts] }; },
};

const THEMES = {
  lotus: [['circle', 0.06], ['petals', 0.06, 0.2, 8], ['circle', 0.21], ['lotus', 0.21, 0.42, 8], ['lotus', 0.25, 0.46, 8, 0.5], ['circle', 0.47], ['dots', 0.48, 0.53, 32], ['doublePetal', 0.54, 0.78, 16], ['circle', 0.79], ['scallop', 0.79, 0.86, 32], ['lotus', 0.86, 1, 24]],
  flower: [['circle', 0.05], ['petals', 0.05, 0.17, 6], ['petals', 0.08, 0.22, 6, 0.5], ['circle', 0.24], ['dots', 0.25, 0.3, 24], ['doublePetal', 0.31, 0.55, 12], ['circle', 0.56], ['scallop', 0.56, 0.64, 24], ['petals', 0.65, 0.85, 24], ['dots', 0.86, 0.91, 48], ['scallop', 0.92, 1, 36]],
  sun: [['circle', 0.1], ['spikes', 0.1, 0.22, 12], ['circle', 0.23], ['flames', 0.23, 0.45, 12], ['flames', 0.25, 0.42, 12, 0.5], ['circle', 0.47], ['dots', 0.48, 0.53, 36], ['spikes', 0.54, 0.7, 24], ['circle', 0.71], ['flames', 0.71, 0.92, 24], ['dots', 0.93, 0.98, 48], ['circle', 1]],
  moon: [['circle', 0.12], ['crescents', 0.12, 0.26, 8], ['circle', 0.27], ['slimPetals', 0.27, 0.48, 16], ['circle', 0.49], ['crescents', 0.49, 0.62, 16], ['circle', 0.63], ['scallop', 0.63, 0.7, 32], ['petals', 0.7, 0.92, 16], ['petals', 0.74, 0.88, 16, 0.5], ['dots', 0.93, 0.98, 48], ['circle', 1]],
  tree: [['leaves', 0.5, 0.7, 16], ['circle', 0.72], ['dots', 0.73, 0.78, 40], ['doublePetal', 0.79, 0.96, 24], ['circle', 0.97], ['scallop', 0.97, 1, 48]],
  small: [['circle', 0.12], ['petals', 0.12, 0.4, 8], ['circle', 0.42], ['lotus', 0.42, 0.72, 12], ['circle', 0.73], ['scallop', 0.73, 0.82, 24], ['petals', 0.82, 1, 16]],
};

export function mandala(theme = 'lotus', { size = 400, colour = false, stroke = 0.0035, report, labels = null, mods = null } = {}) {
  // labels(ringIndex) → text placed in every motif of that ring (colour-by-number)
  // mods: Map(elementIndex → 'remove' | 'recolor' | 'highlight') (spot-the-difference)
  const rings = THEMES[theme];
  let out = '';
  let txt = '';
  let el = 0;
  const allPts = [];
  rings.forEach(([type, r0, r1, n, phase = 0], i) => {
    if (type === 'circle') { out += `<circle r="${f(r0)}" class="mr"/>`; return; }
    const m = RINGS[type](r0, r1, n);
    const fill = colour ? ` style="fill:var(--m${i % 4})"` : '';
    for (let k = 0; k < n; k++) {
      const ang = ((k + phase) * 360) / n;
      const mod = mods?.get(el++);
      const st = mod === 'recolor' ? ' style="fill:#C9D9EE"' : mod === 'highlight' ? ' style="stroke:#d0021b;stroke-width:0.014;fill:rgba(208,2,27,0.25)"' : fill;
      if (mod !== 'remove') {
        if (m.dot) {
          const [x, y, r] = m.dot;
          out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="md" transform="rotate(${f(ang)})"${st}/>`;
        } else {
          out += `<path d="${m.d}" class="mp" transform="rotate(${f(ang)})"${st}/>`;
        }
      }
      const lab = labels?.(i, type);
      if (lab != null && !m.dot) {
        const a = (ang * Math.PI) / 180;
        const mx = m.pts.reduce((s2, p) => s2 + p[0], 0) / m.pts.length, my = m.pts.reduce((s2, p) => s2 + p[1], 0) / m.pts.length;
        const fs = Math.min(0.06, (r1 - r0) * 0.42);
        txt += `<text x="${f(mx * Math.cos(a) - my * Math.sin(a))}" y="${f(mx * Math.sin(a) + my * Math.cos(a) + fs * 0.35)}" font-size="${f(fs)}" text-anchor="middle" class="mlab">${lab}</text>`;
      }
      for (const [x, y] of m.pts) { const a = (ang * Math.PI) / 180; allPts.push([x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), n]); }
    }
    // mirror check: each motif must equal its reflection about the x-axis
    for (const [x, y] of m.pts) if (Math.abs(y) > 1e-9 && !m.pts.some(([u, v]) => Math.abs(u - x) < 1e-6 && Math.abs(v + y) < 1e-6)) report?.push(`${theme}/${type}: motif not mirror-symmetric`);
  });
  if (report) report.push(...symmetryCheck(allPts, theme));
  const extra = theme === 'tree' ? treeOfLife() : '';
  return `<svg class="mandala ${colour ? 'col' : 'line'}" viewBox="-1.02 -1.02 2.04 2.04" width="${size}" height="${size}" style="--sw:${stroke}"><g class="mg">${out}${extra}</g>${txt}</svg>`;
}

export function mandalaElementCount(theme) {
  return THEMES[theme].filter((r) => r[0] !== 'circle').reduce((s, r) => s + r[3], 0);
}
export function mandalaRings(theme) { return THEMES[theme].map((r) => r[0]); }

function symmetryCheck(pts, theme) {
  // group by ring order n and confirm rotation by 360/n maps the set to itself
  const byN = new Map();
  for (const [x, y, n] of pts) { if (!byN.has(n)) byN.set(n, []); byN.get(n).push([x, y]); }
  const errs = [];
  for (const [n, set] of byN) {
    const a = TAU / n, c = Math.cos(a), s = Math.sin(a);
    const key = ([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;
    const keys = new Set(set.map(key));
    let miss = 0;
    for (const [x, y] of set) {
      const r = [x * c - y * s, x * s + y * c];
      if (!keys.has(key(r)) && !keys.has(`${Math.round(r[0] * 1e4) + 1},${Math.round(r[1] * 1e4)}`) && !keys.has(`${Math.round(r[0] * 1e4) - 1},${Math.round(r[1] * 1e4)}`) && !keys.has(`${Math.round(r[0] * 1e4)},${Math.round(r[1] * 1e4) + 1}`) && !keys.has(`${Math.round(r[0] * 1e4)},${Math.round(r[1] * 1e4) - 1}`)) miss++;
    }
    if (miss) errs.push(`${theme}: ${miss} points break ${n}-fold symmetry`);
  }
  return errs;
}

function treeOfLife() {
  // a symmetric tree inside the inner circle: trunk, mirrored branches and leaves
  let s = '<g class="tree">';
  s += `<path d="M-0.05 0.42 Q-0.04 0.1 -0.02 -0.05 L0.02 -0.05 Q0.04 0.1 0.05 0.42 Z" class="mp"/>`;
  s += `<path d="M-0.16 0.44 Q0 0.36 0.16 0.44" class="mp" fill="none"/>`;
  const br = [[-0.05, 0.3, -0.26], [0.05, 0.3, 0.26], [-0.03, 0.12, -0.3], [0.03, 0.12, 0.3], [-0.02, -0.02, -0.22], [0.02, -0.02, 0.22], [0, -0.05, 0]];
  for (const [x, y, dx] of br) {
    const ex = x + dx, ey = dx === 0 ? -0.32 : y - 0.22;
    s += `<path d="M${x} ${y} Q${f(x + dx * 0.3)} ${f(y - 0.14)} ${f(ex)} ${f(ey)}" class="mp" fill="none"/>`;
    for (let k = 0; k < 4; k++) {
      const t = 0.35 + k * 0.2, lx = x + (ex - x) * t, ly = y + (ey - y) * t - 0.03 * Math.sin(t * 3);
      for (const side of [-1, 1]) s += `<ellipse cx="${f(lx + side * 0.035)}" cy="${f(ly - 0.02)}" rx="0.028" ry="0.014" transform="rotate(${side * 35} ${f(lx + side * 0.035)} ${f(ly - 0.02)})" class="mp"/>`;
    }
    s += `<circle cx="${f(ex)}" cy="${f(ey)}" r="0.03" class="mp"/>`;
  }
  return s + '</g>';
}

// ---------- Śrī Yantra: numeric solve of the nine triangles ----------
// Unknowns: for each triangle, apex height a, base height b and base half-width w
// (unit circle, y up). Constraints (the incidences of the classical figure):
//   • the two largest triangles have all three vertices on the circle
//   • 7 apexes rest exactly on the base of an opposite triangle
//   • 3 base corners lie exactly on another triangle's side
//   • 8 points where three lines meet (the classical triple "marma" points)
// 22 equations, 27 unknowns: the remaining 5 degrees of freedom are fixed by the
// starting guess. Gauss–Newton (minimum-norm steps) converges onto the solution set.
const SY_ORDER = ['U1', 'D1', 'U2', 'D2', 'U3', 'D3', 'U4', 'D4', 'D5'];
const SY_START = { // rounded starting proportions (our own); solver enforces exact incidences
  U1: [1, -0.24, 0.97], D1: [-1, 0.27, 0.96], U2: [0.72, -0.48, 0.72], D2: [-0.7, 0.47, 0.69],
  U3: [0.27, -0.7, 0.51], D3: [-0.11, 0.72, 0.6], U4: [0.47, -0.11, 0.35], D4: [-0.48, 0.16, 0.34], D5: [-0.24, 0.05, 0.25],
};
function syLines(P) {
  const L = {};
  SY_ORDER.forEach((n, i) => {
    const [a, b, w] = P.slice(i * 3, i * 3 + 3);
    L[n] = { a, b, w, R: [0, a, w, b], Lf: [0, a, -w, b], B: [-1, b, 1, b] };
  });
  return L;
}
function lineInter([x1, y1, x2, y2], [x3, y3, x4, y4]) {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}
function distToLine([px, py], [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  return ((px - x1) * dy - (py - y1) * dx) / Math.hypot(dx, dy);
}
const SY_TRIPLES = [['D1.R', 'U1.B', 'U2.R'], ['D1.R', 'U2.B', 'U3.R'], ['D1.B', 'D2.R', 'U1.R'], ['D1.B', 'D3.R', 'U2.R'], ['D2.B', 'D3.R', 'U1.R'], ['D2.R', 'U1.B', 'U3.R'], ['D3.R', 'D5.B', 'U3.R'], ['D3.R', 'D4.B', 'U4.R']];
const SY_APEX_ON_BASE = [['U3', 'D1'], ['D5', 'U1'], ['D2', 'U3'], ['U2', 'D3'], ['D4', 'U2'], ['D3', 'U4'], ['U4', 'D2']];
const SY_CORNER_ON = [['D4', 'U2.R'], ['D5', 'U4.R'], ['U4', 'D2.R']];
function syResiduals(P) {
  const L = syLines(P);
  const g = (s) => { const [n, k] = s.split('.'); return k === 'B' ? L[n].B : L[n].R; };
  const r = [];
  r.push(L.U1.a - 1, L.D1.a + 1, L.U1.w ** 2 + L.U1.b ** 2 - 1, L.D1.w ** 2 + L.D1.b ** 2 - 1);
  for (const [x, y] of SY_APEX_ON_BASE) r.push(L[x].a - L[y].b);
  for (const [x, line] of SY_CORNER_ON) r.push(distToLine([L[x].w, L[x].b], g(line)));
  for (const [p, q, s] of SY_TRIPLES) r.push(distToLine(lineInter(g(p), g(q)), g(s)));
  return r;
}
function solveLinear(A, b) { // Gaussian elimination with partial pivoting
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
export function solveSriYantra() {
  let P = SY_ORDER.flatMap((n) => SY_START[n]);
  let r = syResiduals(P);
  for (let it = 0; it < 60; it++) {
    const m = r.length, n = P.length, h = 1e-7;
    const J = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let j = 0; j < n; j++) { const Q = [...P]; Q[j] += h; const rq = syResiduals(Q); for (let i = 0; i < m; i++) J[i][j] = (rq[i] - r[i]) / h; }
    const JJt = J.map((ri) => J.map((rk) => ri.reduce((s, v, j) => s + v * rk[j], 0)));
    const y = solveLinear(JJt, r.map((v) => -v));
    P = P.map((p, j) => p + J.reduce((s, row, i) => s + row[j] * y[i], 0));
    r = syResiduals(P);
    if (Math.max(...r.map(Math.abs)) < 1e-13) break;
  }
  const L = syLines(P);
  return { L, maxResidual: Math.max(...r.map(Math.abs)), equations: r.length, unknowns: P.length };
}

export function countSriYantraTriangles(L) {
  // Build the planar arrangement of the 27 triangle edges and count triangular faces.
  const segs = [];
  for (const n of SY_ORDER) { const { a, b, w } = L[n]; segs.push([0, a, w, b], [0, a, -w, b], [-w, b, w, b]); }
  const pts = [], key = (p) => `${Math.round(p[0] * 1e7)},${Math.round(p[1] * 1e7)}`, idx = new Map();
  const add = (p) => { const k = key(p); if (!idx.has(k)) { idx.set(k, pts.length); pts.push(p); } return idx.get(k); };
  const onSeg = segs.map(() => []);
  segs.forEach((s, i) => { onSeg[i].push([0, add([s[0], s[1]])], [1, add([s[2], s[3]])]); });
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const [x1, y1, x2, y2] = segs[i], [x3, y3, x4, y4] = segs[j];
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (Math.abs(d) < 1e-14) continue;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    const e = 1e-9; if (t < -e || t > 1 + e || u < -e || u > 1 + e) continue;
    const id = add([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]); onSeg[i].push([t, id]); onSeg[j].push([u, id]);
  }
  const adj = new Map(); const link = (a, b) => { if (a === b) return; if (!adj.has(a)) adj.set(a, new Set()); if (!adj.has(b)) adj.set(b, new Set()); adj.get(a).add(b); adj.get(b).add(a); };
  for (const list of onSeg) { list.sort((p, q) => p[0] - q[0]); for (let k = 1; k < list.length; k++) link(list[k - 1][1], list[k][1]); }
  const ang = (a, b) => Math.atan2(pts[b][1] - pts[a][1], pts[b][0] - pts[a][0]);
  const sorted = new Map([...adj].map(([v, s]) => [v, [...s].sort((p, q) => ang(v, p) - ang(v, q))]));
  const used = new Set(); let triangles = 0, faces = 0;
  for (const [u, nb] of sorted) for (const v of nb) {
    if (used.has(u + '>' + v)) continue;
    const poly = []; let a = u, b = v;
    while (!used.has(a + '>' + b)) { used.add(a + '>' + b); poly.push(a); const list = sorted.get(b); const i = list.indexOf(a); const c = list[(i - 1 + list.length) % list.length]; a = b; b = c; }
    let area = 0; for (let k = 0; k < poly.length; k++) { const p = pts[poly[k]], q = pts[poly[(k + 1) % poly.length]]; area += p[0] * q[1] - q[0] * p[1]; }
    if (area <= 0) continue; faces++;
    let corners = 0;
    for (let k = 0; k < poly.length; k++) {
      const p0 = pts[poly[(k - 1 + poly.length) % poly.length]], p1 = pts[poly[k]], p2 = pts[poly[(k + 1) % poly.length]];
      const cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
      if (Math.abs(cr) > 1e-9) corners++;
    }
    if (corners === 3) triangles++;
  }
  return { faces, triangles };
}

export function sriYantra({ size = 520, colour = false, full = true } = {}) {
  const { L } = solveSriYantra();
  const R = 1; // triangle circle
  let tri = '';
  for (const n of SY_ORDER) {
    const { a, b, w } = L[n];
    tri += `<polygon points="0,${f(-a)} ${f(w)},${f(-b)} ${f(-w)},${f(-b)}" class="sy-t ${n[0] === 'U' ? 'up' : 'dn'}"/>`;
  }
  let outer = '';
  if (full) {
    // 8-petal and 16-petal lotus rings, three girdles, bhūpura with four gates
    const ring = (r0, r1, n, rot = 0) => { let s = ''; for (let k = 0; k < n; k++) { const p = lotusPetal(r0, r1, (Math.PI / n) * 0.98); s += `<path d="${p.d}" class="sy-p" transform="rotate(${f((k + rot) * 360 / n - 90)})"/>`; } return s; };
    outer += `<circle r="${R}" class="sy-c"/>` + ring(1.0, 1.24, 8, 0.5) + `<circle r="1.25" class="sy-c"/>` + ring(1.25, 1.48, 16, 0.5) + `<circle r="1.5" class="sy-c"/>`;
    outer += `<circle r="1.56" class="sy-c"/><circle r="1.6" class="sy-c"/><circle r="1.64" class="sy-c"/>`;
    for (const off of [0, 0.07, 0.14]) {
      const S = 1.78 + off, G = 0.3 + off, D = 0.16;
      const side = `M${f(-S)} ${f(-S)} L${f(-G)} ${f(-S)} L${f(-G)} ${f(-S - D)} L${f(G)} ${f(-S - D)} L${f(G)} ${f(-S)} L${f(S)} ${f(-S)}`;
      for (let k = 0; k < 4; k++) outer += `<path d="${side}" class="sy-b" transform="rotate(${k * 90})"/>`;
    }
  }
  const vb = full ? 2.0 : 1.04;
  return `<svg class="sriyantra ${colour ? 'col' : 'line'}" viewBox="${-vb} ${-vb} ${vb * 2} ${vb * 2}" width="${size}" height="${size}">${outer}${tri}<circle r="0.018" class="sy-bindu"/></svg>`;
}

// ---------- kolam (mirror-curve / sikku method) ----------
// Dots sit at cell centres of an R×C grid. A line runs diagonally between edge
// midpoints, reflecting off the border and off chosen internal mirrors; this yields
// the continuous loops of pulli kolam. Returns the SVG and the number of loops.
export function kolam(R = 5, C = 5, mirrors = [], { cell = 20, showDots = true, guide = false } = {}) {
  const isMirror = (x2, y2) => { // edge midpoint in doubled coordinates
    if (x2 === 0 || x2 === 2 * C || y2 === 0 || y2 === 2 * R) return true;
    return mirrors.some(([mx, my]) => mx === x2 && my === y2);
  };
  const visited = new Set(); const loops = [];
  const mids = [];
  for (let y = 0; y <= 2 * R; y++) for (let x = 0; x <= 2 * C; x++) if ((x + y) % 2 === 1) mids.push([x, y]);
  for (const [sx, sy] of mids) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const k0 = `${sx},${sy},${dx},${dy}`; if (visited.has(k0)) continue;
    let x = sx, y = sy, vx = dx, vy = dy; const path = [];
    // only start from directions that point into the grid
    if (x + vx < 0 || x + vx > 2 * C || y + vy < 0 || y + vy > 2 * R) continue;
    for (let guard = 0; guard < 10000; guard++) {
      const k = `${x},${y},${vx},${vy}`; if (visited.has(k)) break; visited.add(k);
      visited.add(`${x},${y},${-vx},${-vy}`);
      path.push([x, y]);
      x += vx; y += vy;
      if (isMirror(x, y)) { if (x % 2 === 0) vx = -vx; else vy = -vy; }
    }
    if (path.length > 2) loops.push(path);
  }
  const W = C * cell, H = R * cell, s = cell / 2;
  let paths = '';
  for (const p of loops) {
    // quadratic smoothing: midpoints of consecutive steps as anchors, edge midpoints as controls
    const P = p.map(([x, y]) => [x * s, y * s]);
    const n = P.length; const m = (i) => [(P[i % n][0] + P[(i + 1) % n][0]) / 2, (P[i % n][1] + P[(i + 1) % n][1]) / 2];
    let d = `M${f(m(0)[0])} ${f(m(0)[1])}`;
    for (let i = 1; i <= n; i++) { const c = P[i % n], e = m(i); d += ` Q${f(c[0])} ${f(c[1])} ${f(e[0])} ${f(e[1])}`; }
    paths += `<path d="${d} Z" class="${guide ? 'kg' : 'kl'}"/>`;
  }
  let dots = '';
  if (showDots) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) dots += `<circle cx="${c * cell + s}" cy="${r * cell + s}" r="${cell * 0.07}" class="kd"/>`;
  return { svg: `<svg class="kolam" viewBox="${-s * 0.2} ${-s * 0.2} ${W + s * 0.4} ${H + s * 0.4}">${paths}${dots}</svg>`, loops: loops.length };
}

export function dotGrid(R = 7, C = 7) {
  let s = ''; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) s += `<circle cx="${c * 10 + 5}" cy="${r * 10 + 5}" r="0.8" class="kd"/>`;
  return `<svg class="kolam" viewBox="0 0 ${C * 10} ${R * 10}">${s}</svg>`;
}

// ---------- moon phases ----------
export function moonPhases(n = 8, size = 26) {
  let out = '';
  for (let k = 0; k < n; k++) {
    const t = k / n; // 0 new, 0.5 full
    const r = 10, lit = Math.cos(t * TAU); // +1 new … -1 full
    const sweep = t < 0.5 ? 1 : 0;
    const rx = Math.abs(lit) * r;
    const d = t === 0 ? '' : t === 0.5 ? `<circle r="${r}" class="moon-lit"/>` :
      `<path d="M0 ${-r} A${r} ${r} 0 0 ${sweep} 0 ${r} A${f(rx)} ${r} 0 0 ${lit > 0 ? 1 - sweep : sweep} 0 ${-r} Z" class="moon-lit"/>`;
    out += `<svg viewBox="-12 -12 24 24" width="${size}" height="${size}"><circle r="${r}" class="moon-dark"/>${d}</svg>`;
  }
  return `<span class="moons">${out}</span>`;
}

// ---------- fruit / vegetable size icons ----------
export function fruitIcon(shape, size = 46) {
  const st = 'stroke="var(--maroon)" stroke-width="1.1" stroke-linejoin="round"';
  const leaf = (x, y, r = 0) => `<path d="M${x} ${y} q5 -7 11 -6 q-3 7 -11 6 Z" fill="var(--sage)" ${st} transform="rotate(${r} ${x} ${y})"/>`;
  const shapes = {
    seed: `<path d="M24 10 C33 18 33 34 24 38 C15 34 15 18 24 10 Z" fill="var(--tint-marigold)" ${st}/>`,
    bean: `<path d="M12 26 C10 14 26 10 32 16 C36 20 30 24 34 30 C38 38 14 40 12 26 Z" fill="var(--tint-maroon)" ${st}/>`,
    berry: `<circle cx="24" cy="28" r="12" fill="var(--tint-maroon)" ${st}/><circle cx="19" cy="23" r="2.5" fill="var(--ivory)" opacity="0.8"/>${leaf(24, 16, -20)}`,
    round: `<circle cx="24" cy="28" r="15" fill="var(--tint-marigold)" ${st}/><path d="M24 13 L24 8" ${st}/>${leaf(24, 11, -10)}`,
    long: `<path d="M8 36 C10 24 26 12 40 10 C42 12 40 16 38 18 C30 28 20 38 10 40 Z" fill="var(--tint-sage)" ${st}/>${leaf(39, 11, -60)}`,
    leafy: `<circle cx="24" cy="27" r="15" fill="var(--tint-sage)" ${st}/><path d="M24 12 C18 20 18 34 24 42 M24 12 C30 20 30 34 24 42 M9 27 L39 27" fill="none" ${st}/>`,
    melon: `<ellipse cx="24" cy="27" rx="19" ry="15" fill="var(--tint-sage)" ${st}/><path d="M10 20 Q24 30 38 20 M8 28 Q24 38 40 28" fill="none" ${st}/><path d="M24 12 L24 8" ${st}/>`,
    bunch: `<path d="M10 14 C8 30 20 40 36 38 C24 34 16 26 16 14 Z M16 13 C16 28 26 36 40 32 C28 28 22 22 22 12 Z" fill="var(--tint-marigold)" ${st}/><path d="M10 14 L22 12" ${st}/>`,
  };
  return `<svg class="fruit" viewBox="0 0 48 48" width="${size}" height="${size}">${shapes[shape] || shapes.round}</svg>`;
}

// ---------- mudrā hand diagrams ----------
// A palm-forward right hand; "bent" fingers curve to meet the thumb tip at a gold dot.
export function mudraHand(kind, size = 90) {
  const st = 'fill="var(--tint-marigold)" stroke="var(--maroon)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const ln = 'fill="none" stroke="var(--maroon)" stroke-width="1.4" stroke-linecap="round"';
  if (kind === 'anjali') {
    return `<svg class="mudra" viewBox="0 0 100 100" width="${size}" height="${size}"><path d="M50 12 C44 14 40 30 40 46 L36 70 C34 80 40 90 50 90 C60 90 66 80 64 70 L60 46 C60 30 56 14 50 12 Z" ${st}/><path d="M50 14 L50 88" ${ln}/><path d="M44 30 L44 50 M56 30 L56 50" ${ln} opacity="0.6"/></svg>`;
  }
  if (kind === 'dhyana') {
    // two open palms seen from above, right resting in left, thumb tips touching to form an oval
    const hand = (dy, o) => `<path d="M18 ${58 + dy} C18 ${48 + dy} 30 ${44 + dy} 50 ${44 + dy} C70 ${44 + dy} 82 ${48 + dy} 82 ${58 + dy} C82 ${68 + dy} 70 ${72 + dy} 50 ${72 + dy} C30 ${72 + dy} 18 ${68 + dy} 18 ${58 + dy} Z" ${st} opacity="${o}"/>` +
      [0, 1, 2, 3].map((k) => `<path d="M${24 + k * 3} ${52 + dy + k * 4} L${12 + k * 2} ${51 + dy + k * 4}" ${ln}/>`).join('');
    return `<svg class="mudra" viewBox="0 0 100 100" width="${size}" height="${size}">${hand(8, 1)}${hand(0, 1)}
      <path d="M40 46 C38 34 46 28 50 30 M60 46 C62 34 54 28 50 30" ${ln} stroke-width="5" opacity="0.18"/><path d="M40 46 C38 34 46 28 50 30 M60 46 C62 34 54 28 50 30" ${ln}/><circle cx="50" cy="30" r="2.8" fill="var(--gold)"/></svg>`;
  }
  const bent = { jnana: [0], shuni: [1], prana: [2, 3], apana: [1, 2] }[kind] || [];
  const baseX = [36, 47, 58, 68], len = [30, 34, 31, 24];
  const M = [74, 50]; // meeting point near the thumb tip
  let s = `<path d="M30 58 C28 46 30 40 34 38 L72 38 C76 44 76 60 72 74 C66 88 40 90 32 78 C29 72 30 64 30 58 Z" ${st}/>`;
  baseX.forEach((x, i) => {
    if (bent.includes(i)) s += `<path d="M${x} 40 C${x} 28 ${M[0] - 4} ${M[1] - 22} ${M[0] - 2} ${M[1] - 4}" ${ln} stroke-width="7" stroke="var(--maroon)" opacity="0.18"/><path d="M${x} 40 C${x} 28 ${M[0] - 4} ${M[1] - 22} ${M[0] - 2} ${M[1] - 4}" ${ln}/>`;
    else s += `<rect x="${x - 4.5}" y="${40 - len[i]}" width="9" height="${len[i] + 4}" rx="4.5" ${st}/>`;
  });
  s += `<path d="M70 70 C80 66 84 58 ${M[0] + 2} ${M[1]}" ${ln} stroke-width="8" opacity="0.18"/><path d="M70 70 C80 66 84 58 ${M[0] + 2} ${M[1]}" ${ln}/>`;
  s += `<circle cx="${M[0]}" cy="${M[1] - 2}" r="3.2" fill="var(--gold)"/>`;
  return `<svg class="mudra" viewBox="0 0 100 100" width="${size}" height="${size}">${s}</svg>`;
}

// ---------- cakra petal glyph ----------
export function cakraGlyph(petals, bija = '', size = 52) {
  const n = petals > 100 ? 48 : petals;
  let s = '';
  for (let k = 0; k < n; k++) {
    const p = petal(0.55, petals > 100 ? 0.98 : 1, (Math.PI / n) * 0.85);
    s += `<path d="${p.d}" class="ck-p" transform="rotate(${f((k * 360) / n - 90)})"/>`;
  }
  if (petals > 100) for (let k = 0; k < n; k++) { const p = petal(0.4, 0.78, (Math.PI / n) * 0.85); s += `<path d="${p.d}" class="ck-p2" transform="rotate(${f(((k + 0.5) * 360) / n - 90)})"/>`; }
  s += `<circle r="0.55" class="ck-c"/>`;
  const txt = bija ? `<text y="0.2" text-anchor="middle" class="ck-t">${bija}</text>` : `<circle r="0.12" class="ck-dot"/>`;
  return `<svg class="cakra" viewBox="-1.05 -1.05 2.1 2.1" width="${size}" height="${size}">${s}${txt}</svg>`;
}

// ---------- ornaments ----------
export function border(width = 600, n = 24) {
  let s = '';
  const step = width / n;
  for (let i = 0; i < n; i++) {
    const x = i * step + step / 2;
    s += `<circle cx="${f(x)}" cy="6" r="1.4" class="o-dot"/>`;
    s += `<path d="M${f(x - step / 2)} 6 Q${f(x - step / 4)} 0 ${f(x)} 6 Q${f(x + step / 4)} 12 ${f(x + step / 2)} 6" class="o-line"/>`;
  }
  return `<svg class="border-orn" viewBox="0 0 ${width} 12" preserveAspectRatio="none">${s}</svg>`;
}

export function divider(w = 160) {
  return `<svg class="divider-orn" viewBox="0 0 160 16" width="${w}" height="${w / 10}"><path d="M4 8 L62 8 M98 8 L156 8" class="o-line"/><circle cx="66" cy="8" r="1.6" class="o-dot"/><circle cx="94" cy="8" r="1.6" class="o-dot"/>${lotusPath(80, 13, 9, 'class="o-lotus"')}</svg>`;
}

export function corner(size = 60, rot = 0) {
  return `<svg class="corner-orn" viewBox="0 0 60 60" width="${size}" height="${size}" style="transform:rotate(${rot}deg)"><path d="M4 56 L4 20 Q4 4 20 4 L56 4" class="o-line"/><path d="M10 56 L10 24 Q10 10 24 10 L56 10" class="o-line thin"/><circle cx="16" cy="16" r="3" class="o-dot"/><path d="M16 16 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" class="o-line thin"/></svg>`;
}
