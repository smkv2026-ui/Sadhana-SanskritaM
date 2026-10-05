// Page templates. Every page is a fixed-size sheet; text comes from content/*.json and i18n.
import * as A from './art.mjs';

export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nl = (s = '') => esc(s).replace(/\n/g, '<br>');
const lines = (n, cls = '') => `<div class="lines ${cls}">${'<span></span>'.repeat(n)}</div>`;
const cx = (...c) => c.filter(Boolean).join(' ');
const MED = '<svg class="medi" viewBox="0 0 10 10" width="9" height="9"><rect x="0.5" y="0.5" width="9" height="9" rx="2" fill="var(--maroon)"/><path d="M5 2.2 V7.8 M2.2 5 H7.8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>';

export function makeTemplates(ctx) {
  const { t, cfg, acts, weeks, nutri, mantras, stories, gloss, refs, pageOf } = ctx;
  const badge = (k, withLabel = false) => A.badgeIcon(k, 11) + (withLabel ? ` <span class="small">${esc(t.badge[k] || t.tve.x)}</span>` : '');
  const time = (m) => (m ? `<span class="chip time">${m} ${t.min}</span>` : '');
  const head = (title, sub, extra = '') => `<div class="pagehead"><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}${extra}<div class="orn">${A.divider(130)}</div></div>`;
  const fill = (theme = 'flower') => `<div class="fill">${A.mandala(theme, { size: 300, stroke: 0.004 }).replace('class="mandala line"', 'class="mandala line deco"')}</div>`;
  const wisdomBox = (id) => { const w = mantras.wisdom[id]; return w ? `<div class="wisdom"><span class="deva">${esc(w.deva)}</span><br><span class="iast">${esc(w.iast)}</span> — ${esc(w.meaning)} <span class="tiny">(${esc(w.src)})</span></div>` : ''; };

  // spiritual level: swap tradition-heavy activities for their secular twins
  const swap = (id) => {
    const a = acts[id];
    if (!a?.alt) return id;
    if (cfg.spiritual === 'secular') return a.alt;
    if (cfg.spiritual === 'light' && ['S02', 'S03', 'S07', 'M07', 'M09'].includes(id)) return a.alt;
    return id;
  };

  const sheet = (num, cls, body, { runhead = '', folio = '', bleedbg = '', noFolio = false } = {}) => {
    const side = num % 2 === 1 ? 'recto' : 'verso';
    return `<section class="sheet ${cls}" data-page="${num}"><div class="page ${side}">${bleedbg ? `<div class="bleedbg">${bleedbg}</div>` : ''}${runhead ? `<div class="runhead">${esc(runhead)}</div>` : ''}<div class="content">${body}</div>${noFolio ? '' : `<div class="folio"><span class="num">${num}</span><span>${esc(folio)}</span></div>`}</div></section>`;
  };

  const faces = () => {
    const mouth = ['M7 15 Q11 11 15 15', 'M7 14.5 Q11 12.5 15 14.5', 'M7 14 L15 14', 'M7 13.5 Q11 15.5 15 13.5', 'M7 13 Q11 17 15 13'];
    return `<span class="faces">${mouth.map((m) => `<svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="9.5" fill="none" stroke="var(--maroon)" stroke-width="1"/><circle cx="8" cy="9" r="1" fill="var(--maroon)"/><circle cx="14" cy="9" r="1" fill="var(--maroon)"/><path d="${m}" fill="none" stroke="var(--maroon)" stroke-width="1.1" stroke-linecap="round"/></svg>`).join('')}</span>`;
  };

  const spiritArt = (id, focus = '') => {
    const fl = focus.toLowerCase();
    if (id === 'S01' || id === 'S11' || id === 'X12') return A.mandala('small', { size: 92, stroke: 0.006 });
    if (id === 'S02' || id === 'S03') return A.sriYantra({ size: 84, full: false });
    if (id === 'S04') return `<div style="width:26mm">${A.kolam(3, 3, [[2, 1], [5, 2], [4, 5], [1, 4]], { guide: true }).svg}</div>`;
    if (id === 'S05') { const k = ['jñāna', 'dhyāna', 'prāṇa', 'añjali', 'apāna'].find((m) => fl.includes(m)) || 'jñāna'; return A.mudraHand({ 'jñāna': 'jnana', 'dhyāna': 'dhyana', 'prāṇa': 'prana', 'añjali': 'anjali', 'apāna': 'apana' }[k], 70); }
    if (id === 'S07') { const p = fl.includes('root') ? [4, 'लं'] : fl.includes('sacral') ? [6, 'वं'] : [12, 'यं']; return A.cakraGlyph(p[0], p[1], 64); }
    if (id === 'S12') return A.moonPhases(4, 15);
    return A.lotusIcon(64);
  };

  // ---------- activity box ----------
  function actBox(strand, id0, focus, wk) {
    const id = swap(id0);
    const a = acts[id];
    const hdr = `<div class="ah">${A.strandIcon(strand, 15)}<span class="sn">${esc(t.strand[strand])}</span><span class="sp"></span>${badge(a.badge)}${time(a.min)}</div><div class="at">${esc(a.title)}</div>`;
    let body = '';
    if (strand === 'heart') {
      body += `<div class="focus">${esc(focus)}</div><div class="heartlines">${lines(7)}</div>`;
    } else if (strand === 'spirit') {
      body += focus ? `<div class="focus">${esc(id === id0 ? focus : a.steps[0])}</div>` : '';
      body += `<div class="spart"><div style="flex:none">${spiritArt(id, focus)}</div><ol class="steps">${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
    } else {
      body += focus ? `<div class="focus">${esc(focus)}</div>` : '';
      if (wk.wisdom && strand === 'mind') body += wisdomBox(wk.wisdom);
      body += `<ol class="steps">${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    }
    body += `<div class="ev">${badge(a.badge)} ${esc(a.note)}</div>`;
    if (a.doctor || a.stop) body += `<div class="safe">${a.doctor ? `<b>${MED}${esc(t.doctor)}</b> ` : ''}${a.stop ? `<b>Safety:</b> ${esc(a.stop)} ` : ''}${a.doctor ? `<b>${esc(t.stopIfLabel)}</b> ${esc(t.stopIfList)}` : ''}</div>`;
    return `<div class="act a-${strand}">${hdr}${body}</div>`;
  }

  // ---------- pages ----------
  const P = {};

  P.cover = (n) => sheet(n, 'cover', `
    <div class="cv-top"><div class="kicker">${esc(t.cover.kicker)}</div></div>
    <div class="cv-art">${A.mandala('lotus', { size: 470, colour: true, stroke: 0.0035 })}</div>
    <h1>${esc(cfg.title)}</h1>
    <div class="deva cv-deva">${esc(cfg.titleDeva)}</div>
    <div class="subtitle">${esc(cfg.subtitle)}</div>
    <div class="cv-rule">${A.divider(170)}</div>
    <div class="who">${cfg.mother_name ? 'for ' + esc(cfg.mother_name) : esc(t.cover.tag)}</div>`, { noFolio: true, bleedbg: `<div class="cv-band"><span class="deva">${esc(t.cover.bless)}</span><span class="cv-bless-en">${esc(t.cover.blessEn)}</span></div>` });

  P.dedication = (n) => sheet(n, 'ded', `
    <div style="position:absolute;top:0;left:0">${A.corner(70, 0)}</div><div style="position:absolute;top:0;right:0">${A.corner(70, 90)}</div>
    <div style="position:absolute;bottom:0;left:0">${A.corner(70, 270)}</div><div style="position:absolute;bottom:0;right:0">${A.corner(70, 180)}</div>
    <div style="padding:22mm 14mm 0" class="col">
      <h2 class="center">${esc(t.dedication.title)}</h2><div class="center" style="margin:3mm 0 6mm">${A.divider(130)}</div>
      ${t.dedication.lines.map((l, i) => `<div class="field"><span style="min-width:44mm">${esc(l)}</span><b style="color:var(--ink)">${esc([cfg.mother_name, cfg.partner_name, cfg.baby_nickname, cfg.due_date, ''][i] || '')}</b></div>`).join('')}
      <h3 style="margin-top:12mm">${esc(t.dedication.to)}</h3><div class="tiny" style="margin-top:1mm">${esc(t.dedication.note)}</div>
      ${lines(9)}
      <div class="center" style="margin-top:8mm">${A.lotusIcon(70)}</div>
    </div>`, { folio: '' });

  P.title = (n) => {
    const m = mantras.mantras.find((x) => x.id === 'purnam');
    return sheet(n, 'titlepage', `
    <div class="col" style="align-items:center;text-align:center;height:100%">
      <div style="margin-top:14mm">${A.mandala('flower', { size: 230, colour: true })}</div>
      <h1 style="margin-top:8mm">${esc(cfg.title)}</h1>
      <div class="deva" style="font-size:15pt;color:var(--maroon);margin-top:1mm">${esc(cfg.titleDeva)}</div>
      <div style="font-family:var(--serif);font-style:italic;font-size:16pt;margin-top:2mm">${esc(cfg.subtitle)}</div>
      <div class="sub" style="margin-top:4mm">${esc(t.titlePage.by)}</div>
      <div style="margin-top:auto;max-width:130mm" class="mantra">
        <div class="mtxt" style="font-size:12.5pt">${nl(m.deva)}</div>
        <div class="miast" style="font-size:10.5pt">${nl(m.iast)}</div>
        <div class="small">${esc(m.meaning)}</div>
        <div class="tiny" style="margin-top:1mm">${esc(m.source)}</div>
      </div>
      <div class="tiny" style="margin-top:6mm">${esc(t.titlePage.edition)}: ${esc(cfg.edition)} · ${esc(cfg.size.toUpperCase())} · ${esc(cfg.theme === 'lowink' ? 'low-ink' : 'full colour')} · ${esc(cfg.spiritual)}</div>
    </div>`, { folio: '' });
  };

  P.contents = (n, data) => sheet(n, 'contents', `${head(t.contents.title)}
    <div style="font-size:11pt;max-width:150mm">${data.map((s) => `<div style="display:flex;gap:2mm;align-items:baseline;${s.level ? 'padding-left:7mm;font-size:10pt;margin-bottom:1.6mm' : 'font-weight:600;margin:3.4mm 0 1.6mm'}"><span>${esc(s.title)}</span><span style="flex:1;border-bottom:0.25mm dotted var(--line)"></span><span style="font-family:var(--serif);font-weight:700;font-size:12pt;color:var(--maroon)">${s.page}</span></div>`).join('')}</div>
    <div style="margin-top:auto" class="center">${A.lotusIcon(60)}</div>`, { folio: t.contents.title });

  P.howto = (n) => sheet(n, 'howto', `${head(t.howTo.title)}
    <p>${esc(t.howTo.intro)}</p>
    <h4 style="margin:2mm 0">${esc('Five strands')}</h4>
    ${t.howTo.strands.map(([s, d]) => `<div class="row" style="align-items:flex-start;margin-bottom:2mm">${A.strandIcon(s, 20)}<div><b style="color:var(--maroon)">${esc(t.strand[s])}</b> <span class="tiny">${esc(t.strandSub[s])}</span><br>${esc(d)}</div></div>`).join('')}
    <h4 style="margin:3mm 0 2mm">${esc('Evidence badges')}</h4>
    ${t.howTo.badges.map(([b, d]) => `<div class="row" style="align-items:flex-start;margin-bottom:2mm"><span style="padding-top:0.6mm">${A.badgeIcon(b, 14)}</span><div>${esc(d)}</div></div>`).join('')}
    <div class="row" style="margin-top:2mm;align-items:center"><span class="chip time">2 ${t.min}</span><span class="chip time">5 ${t.min}</span><span class="chip time">10 ${t.min}</span><span class="chip time">20 ${t.min}</span><span class="small">${esc(t.howTo.times)}</span></div>
    <p class="small" style="margin-top:3mm">${esc(t.howTo.checkin)}</p>
    <div class="box" style="margin-top:auto;border-color:var(--marigold)"><b style="color:var(--maroon)">Our promise — </b>${esc(t.howTo.promise)}</div>`, { folio: t.howTo.title });

  P.medical = (n) => sheet(n, 'medical', `${head(t.medical.title)}
    ${t.medical.paras.map((p) => `<p>${esc(p)}</p>`).join('')}
    <div class="box" style="margin-top:2mm"><b style="color:var(--maroon)">${esc('Inclusivity — ')}</b>${esc(t.medical.inclusive)}</div>
    <p class="tiny" style="margin-top:auto">${esc(t.medical.disclaimer)}</p>`, { folio: t.medical.title });

  P.path = (n) => sheet(n, 'path', `${head(t.path.title)}
    <p>${esc(t.path.intro)}</p>
    <table class="tbl-sm"><tr><th>${badge('T')} Spiritual practice</th><th>${badge('E')} Secular twin</th></tr>
    ${t.path.rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
    <h4 style="margin:5mm 0 2mm">Three settings</h4>
    ${t.path.levels.map(([a, b]) => `<p><b style="color:var(--maroon)">${esc(a)}:</b> ${esc(b)}</p>`).join('')}
    ${fill('lotus')}<div class="box"><b>${esc(t.path.you)}:</b> ${t.path.choices.map((c) => `<span style="margin-left:5mm"><span class="tick"></span>${esc(c)}</span>`).join('')}</div>`, { folio: t.path.title });

  P.warning = (n) => sheet(n, 'warning', `${head(t.warning.title, t.warning.sub)}
    <div class="alert" style="font-weight:500;color:var(--ink)"><ol style="margin:0;padding-left:6mm;columns:2;column-gap:8mm;font-size:9.8pt">${t.warning.signs.map((s) => `<li style="margin-bottom:1.8mm;break-inside:avoid">${esc(s)}</li>`).join('')}</ol></div>
    <div class="row" style="margin-top:4mm">${t.warning.numbers.map(([l, v]) => `<div class="box grow center"><div class="small">${esc(l)}</div><div style="font-family:var(--serif);font-size:24pt;font-weight:700;color:var(--maroon)">${esc(v)}</div></div>`).join('')}</div>
    <div style="margin-top:3mm">${t.warning.fill.map(([l]) => `<div class="field"><span style="min-width:40mm">${esc(l)}</span></div>`).join('')}</div>
    <p style="margin-top:4mm;font-family:var(--serif);font-size:14pt;color:var(--maroon);font-style:italic" class="center">${esc(t.warning.instinct)}</p>${fill('small')}
    <div class="foot">${esc(t.warning.src)}</div>`, { folio: t.warning.title });

  const simpleTable = (cols, rows, cls = 'tbl-sm', firstBold = true) => `<table class="${cls}"><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 && firstBold ? ' style="font-weight:700;color:var(--maroon)"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;

  P.journey = (n) => sheet(n, 'journey', `${head(t.journey.title, t.journey.sub)}
    ${simpleTable(t.journey.cols, t.journey.rows)}
    <div class="row" style="margin-top:6mm;justify-content:center;gap:12mm;align-items:flex-end">${['seed', 'round', 'long', 'melon'].map((s, i) => `<div class="center">${A.fruitIcon(s, 40 + i * 14)}<div class="tiny">${['week 5', 'week 15', 'week 24', 'week 40'][i]}</div></div>`).join('')}</div>
    <div class="foot">${esc(t.journey.foot)}</div>`, { folio: 'Your journey', runhead: 'Your journey' });

  P.sages = (n) => sheet(n, 'sages', `${head(t.sages.title, t.sages.sub)}
    ${simpleTable(t.sages.cols, t.sages.rows)}
    ${fill('moon')}<div class="foot">${badge('T')} ${esc(t.sages.foot)}</div>`, { folio: 'Your journey', runhead: 'Your journey' });

  P.gs = (n) => sheet(n, 'gs', `${head(t.gs.title)}
    ${t.gs.paras.map((p) => `<p>${esc(p)}</p>`).join('')}
    <h4 style="margin:2mm 0">The pregnancy saṃskāras</h4>
    ${t.gs.samskara.map(([a, b]) => `<p class="small"><b style="color:var(--maroon)">${esc(a)}.</b> ${esc(b)}</p>`).join('')}
    <div class="box" style="border-color:var(--maroon)"><b style="color:var(--maroon)">${esc(t.gs.promiseTitle)}</b><ul class="plain small" style="margin-top:1mm">${t.gs.promise.map((p) => `<li>✗ ${esc(p)}</li>`).join('')}</ul></div>
    ${fill('lotus')}<div class="foot">${esc(t.gs.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Garbha Gyan primer' });

  P.tve = (n) => sheet(n, 'tve', `${head(t.tve.title, t.tve.sub)}
    <p>${esc(t.tve.intro)}</p>
    <table class="tbl-sm"><tr><th></th><th>Belief or practice</th><th>What we know</th></tr>${t.tve.rows.map(([b, a, c]) => `<tr><td>${A.badgeIcon(b, 14)}</td><td style="font-weight:600">${esc(a)}</td><td>${esc(c)}</td></tr>`).join('')}</table>
    <div class="row" style="margin-top:4mm;flex-wrap:wrap;gap:5mm" class="small">${['S', 'E', 'T', 'X'].map((b) => `<span class="small">${A.badgeIcon(b, 11)} ${esc(t.badge[b] || t.tve.x)}</span>`).join('')}</div>
    ${fill('flower')}<div class="foot">${esc(t.tve.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Garbha Gyan primer' });

  P.kosha = (n) => {
    const rings = [0.98, 0.8, 0.62, 0.44, 0.26];
    const lbl = ['Body', 'Breath', 'Mind', 'Wisdom', 'Joy'];
    const diag = `<svg viewBox="-1.05 -1.05 2.1 2.1" width="230" height="230">${rings.map((r, i) => `<circle r="${r}" fill="${['var(--tint-sage)', 'var(--tint-gold)', 'var(--tint-marigold)', 'var(--tint-maroon)', 'var(--paper)'][i]}" stroke="var(--maroon)" stroke-width="0.01"/>`).join('')}${rings.map((r, i) => `<text y="${-r + 0.11}" text-anchor="middle" font-size="0.085" font-family="NS" fill="var(--maroon)" font-weight="700">${lbl[i]}</text>`).join('')}<circle r="0.04" fill="var(--maroon)"/></svg>`;
    return sheet(n, 'kosha', `${head(t.kosha.title, t.kosha.sub)}
      <div class="center" style="margin-bottom:3mm">${diag}</div>
      <table class="tbl-sm"><tr><th>Kośa</th><th>Layer</th><th>Check-in question</th><th>In this book</th></tr>${t.kosha.rows.map(([a, d, l, q, b]) => `<tr><td><b style="color:var(--maroon)">${esc(a)}</b><br><span class="deva">${esc(d)}</span></td><td>${esc(l)}</td><td>${esc(q)}</td><td class="small">${esc(b)}</td></tr>`).join('')}</table>
      ${fill('small')}<div class="foot">${esc(t.kosha.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Pañca Kośa' });
  };

  P.chakra = (n) => sheet(n, 'chakra', `${head(t.chakra.title, t.chakra.sub)}
    <table class="tbl-sm"><tr><th></th>${t.chakra.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${t.chakra.rows.map(([nm, dv, pl, pt, bj, q, af]) => `<tr><td style="padding:0.8mm">${A.cakraGlyph(pt, bj, 40)}</td><td><b style="color:var(--maroon)">${esc(nm)}</b><br><span class="deva">${esc(dv)}</span></td><td>${esc(pl)}</td><td>${pt}</td><td class="deva" style="font-size:12pt;color:var(--maroon)">${esc(bj || '—')}</td><td>${esc(q)}</td><td style="font-style:italic">${esc(af)}</td></tr>`).join('')}</table>
    ${fill('sun')}<div class="foot">${badge('T')} Tradition & culture · Secular twin: head-to-toe feelings check. Source: Pūrṇānanda, Ṣaṭ-cakra-nirūpaṇa (1577); Woodroffe, The Serpent Power (1919).</div>`, { folio: 'Foundations', runhead: 'Foundations · Cakras' });

  P.mudra = (n) => sheet(n, 'mudra', `${head(t.mudra.title, t.mudra.sub)}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm">${t.mudra.items.map(([k, nm, how, use]) => `<div class="box center">${A.mudraHand(k, 96)}<h4 style="margin-top:1mm">${esc(nm)}</h4><p class="small" style="margin:1mm 0">${esc(how)}</p><p class="tiny" style="margin:0">${esc(use)}</p></div>`).join('')}</div>
    <div class="box" style="margin-top:5mm"><b style="color:var(--maroon)">2-minute practice:</b> sit comfortably, choose a mudrā, rest the hands on the thighs or belly, and breathe slowly — longer out than in. Notice the touch of the fingertips. <span class="chip time">2 ${t.min}</span></div>
    ${fill('flower')}<div class="foot">${esc(t.mudra.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Mudrās' });

  P.yantra = (n) => sheet(n, 'yantra', `${head(t.yantra.title)}
    <div class="row"><div class="grow">${t.yantra.paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div><div style="flex:none">${A.sriYantra({ size: 210, colour: true })}</div></div>
    <div class="box"><h4>${esc(t.yantra.howTitle)}</h4><ol class="steps" style="margin-top:1mm">${t.yantra.how.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><div class="small" style="color:var(--maroon);margin-top:1.5mm"><b>Safety:</b> ${esc(t.yantra.safety)}</div></div>
    ${fill('lotus')}<div class="foot">${esc(t.yantra.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Yantra' });

  P.yantraPage = (n) => sheet(n, 'yantrapage colourpg', `${head(t.yantraPage.title, t.yantraPage.sub)}
    <div class="grow" style="display:flex;align-items:center;justify-content:center">${A.sriYantra({ size: 640, colour: false })}</div>
    <div class="foot">${badge('T')} Geometry solved in code: all 22 incidence conditions (apexes on bases, corners on lines, triple meeting points) hold to within 10⁻¹². Secular twin: colour it simply as geometry.</div>`, { folio: 'Foundations', runhead: 'Foundations · Yantra' });

  P.kolam = (n) => {
    const k1 = A.kolam(3, 3, [[2, 1], [5, 2], [4, 5], [1, 4]], { guide: true });
    const k2 = A.kolam(5, 5, [[2, 1], [9, 2], [8, 9], [1, 8], [4, 1], [9, 4], [6, 9], [1, 6]], { guide: true });
    const k3 = A.kolam(5, 5, [[2, 1], [9, 2], [8, 9], [1, 8], [6, 1], [9, 6], [4, 9], [1, 4]], { guide: true });
    return sheet(n, 'kolam', `${head(t.kolam.title)}
      ${t.kolam.paras.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="row" style="justify-content:space-around;align-items:flex-end;margin-top:2mm">${[[k1, 34], [k2, 52], [k3, 52]].map(([k, w]) => `<div class="center"><div style="width:${w}mm">${k.svg}</div><div class="caps" style="color:var(--gold)">${esc(t.kolam.trace)}</div></div>`).join('')}</div>
      <div class="center" style="margin-top:4mm"><div class="caps" style="color:var(--gold);margin-bottom:1mm">${esc(t.kolam.try)}</div><div style="width:92mm;margin:0 auto">${A.dotGrid(7, 7)}</div></div>
      <div class="foot">${esc(t.kolam.foot)} Each traced kolam is one continuous loop (verified in code).</div>`, { folio: 'Foundations', runhead: 'Foundations · Kolam & rangoli' });
  };

  P.sound = (n) => {
    const om = mantras.mantras.find((m) => m.id === 'om');
    return sheet(n, 'sound', `${head(t.sound.title, t.sound.sub)}
      <div class="row"><div class="grow"><h4>How to chant (or hum)</h4><ol class="steps" style="margin-top:1mm">${t.sound.how.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="box center" style="flex:0 0 58mm"><div class="deva" style="font-size:54pt;color:var(--maroon);line-height:1.1">${esc(om.deva)}</div><div class="iast">${esc(om.iast)}</div><p class="tiny" style="margin-top:1mm">${esc(om.meaning)}</p><div class="small"><b>${badge('E')} Secular twin:</b> ${esc(om.alt)}</div></div></div>
      <h4 style="margin:4mm 0 1mm">${esc(t.sound.keyTitle)}</h4>
      <table class="tbl-sm">${t.sound.key.map(([a, b]) => `<tr><td style="font-family:var(--serif);font-size:12pt;font-style:italic;color:var(--maroon);width:28mm">${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
      <div class="box" style="margin-top:3mm">${badge('E')} ${esc(t.sound.evidence)}</div>
      ${fill('small')}<div class="foot">${esc(t.sound.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Mantra & sound' });
  };

  const mantraBlock = (m) => `<div class="mantra"><h3>${esc(m.title)}</h3><div class="mtxt">${nl(m.deva)}</div><div class="miast">${nl(m.iast)}</div><p><b style="color:var(--maroon)">Meaning:</b> ${esc(m.meaning)}</p>${m.note ? `<p class="small" style="color:var(--maroon)">${esc(m.note)}</p>` : ''}<div class="row small" style="justify-content:space-between"><span>${badge('E')} <b>Secular twin:</b> ${esc(m.alt)}</span><span class="tiny">${esc(m.source)}</span></div></div>`;
  P.mantras = (n, ids) => sheet(n, 'mantras', `${head(ids.includes('gayatri') ? 'Gāyatrī & Śānti mantras' : 'Fullness, kindness & a mother’s song', 'Read the meaning first. Recite slowly, softly, without holding the breath.')}
    ${ids.map((id) => mantraBlock(mantras.mantras.find((m) => m.id === id))).join('')}
    ${fill('lotus')}<div class="foot">${badge('E')} Chanting may calm the mother; ${badge('T')} texts shared as heritage. Transliteration: IAST (key on page ${pageOf('sound')}).</div>`, { folio: 'Foundations', runhead: 'Foundations · Mantra & sound' });

  P.lullabies = (n, ids, part) => sheet(n, 'lullabies', `${head('Lullabies of India · ' + part, 'Sing slowly, the same song again and again — familiarity is the gift.')}
    ${ids.map((id) => { const l = mantras.lullabies.find((x) => x.id === id); return `<div class="lull" style="border-top:0.3mm solid var(--rule);padding:2.4mm 0 1.4mm"><div class="row" style="justify-content:space-between;align-items:baseline"><h4>${esc(l.lang)}</h4><span class="tiny">${esc(l.credit)}</span></div><div class="native">${nl(l.native)}</div><div class="roman">${nl(l.roman)}</div><div class="small"><b style="color:var(--maroon)">Meaning:</b> ${esc(l.meaning)}</div></div>`; }).join('')}
    ${fill('flower')}<div class="foot">${badge('S')} Singing to baby = familiar voice and melody (Partanen 2013). ${esc(t.lullabyNote)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Lullabies' });

  const storyArt = (k) => ({ tree: A.mandala('tree', { size: 92, colour: true, stroke: 0.006 }), moon: A.moonPhases(5, 18), squirrel: A.lotusIcon(56), sun: A.mandala('sun', { size: 80, colour: true, stroke: 0.006 }) }[k]);
  P.stories = (n, ids, part) => sheet(n, 'stories', `${head('Stories to read aloud · ' + part, t.storiesIntro)}
    ${ids.map((id) => { const s = stories.find((x) => x.id === id); return `<div class="story" style="margin-bottom:3mm"><div class="row" style="align-items:center;margin-bottom:1.5mm"><div style="flex:none">${storyArt(s.art)}</div><div><h3>${esc(s.title)}</h3><div class="tiny">${esc(s.source)}</div></div></div>${s.text.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`; }).join('')}
    ${fill('moon')}<div class="foot">${badge('S')} Reading aloud gives baby your voice (DeCasper & Spence 1986). ${badge('T')} Stories are original retellings of traditional tales.</div>`, { folio: 'Foundations', runhead: 'Foundations · Stories' });

  P.nourish = (n) => sheet(n, 'nourish', `${head(t.nourish.title, t.nourish.sub)}
    ${simpleTable(t.nourish.cols, t.nourish.rows)}
    <h4 style="margin:3mm 0 1.5mm">${esc(t.nourish.safeTitle)}</h4>
    <div class="row"><div class="box grow"><b style="color:var(--sage)"><span class="sym">✓</span> Do</b><ul class="plain small" style="margin-top:1mm">${t.nourish.do.map((x) => `<li>✓ ${esc(x)}</li>`).join('')}</ul></div><div class="box grow"><b style="color:var(--maroon)"><span class="sym">✗</span> Don’t</b><ul class="plain small" style="margin-top:1mm">${t.nourish.dont.map((x) => `<li>✗ ${esc(x)}</li>`).join('')}</ul></div></div>
    <div class="foot">${badge('S')} ${esc(t.nourish.foot)} ${MED}${esc(t.doctor)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Nourish' });

  P.masa = (n) => sheet(n, 'masa', `${head(t.masa.title, t.masa.sub)}
    <div class="alert" style="margin-bottom:3mm">${badge('T')} ${esc(t.masa.warn)}</div>
    ${simpleTable(t.masa.cols, t.masa.rows)}
    <p style="margin-top:3mm">${esc(t.masa.thread)}</p>
    ${fill('flower')}<div class="foot">${esc(t.masa.foot)}</div>`, { folio: 'Foundations', runhead: 'Foundations · Tradition' });

  P.divider = (n, tri) => {
    const d = t.dividers[tri];
    return sheet(n, 'divpage', `
      <div class="caps" style="color:var(--gold);letter-spacing:0.3em">${esc(t.trimester)} ${tri} · ${esc(d.range)}</div>
      <h1 style="font-size:38pt;margin-top:2mm">${esc(d.name[0])} <span class="deva" style="font-size:26pt">${esc(d.name[1])}</span></h1>
      <div style="font-family:var(--serif);font-style:italic;font-size:17pt">${esc(d.name[2])}</div>
      <p style="max-width:140mm;margin-top:3mm">${esc(d.text)}</p>
      <div class="row small" style="gap:6mm;justify-content:center">${d.focus.map((f) => `<span>${A.badgeIcon('S', 9)} ${esc(f)}</span>`).join('')}</div>
      <div style="margin:5mm 0">${A.mandala(d.art, { size: 470, stroke: 0.0032 })}</div>
      <div class="small">${wisdomBox(d.wisdom)}</div>
      <div class="tiny">Colour the mandala slowly, one ring at a time. ${A.badgeIcon('E', 9)} Structured colouring may ease anxiety.</div>`, { folio: `${t.trimester} ${tri}`, bleedbg: ' ' });
  };

  P.colourPage = (n, kind, tri) => {
    const [title, text] = t.colouring[kind];
    const art = kind === 'own' ? ownGuide() : A.mandala(kind, { size: 500, stroke: 0.0032 });
    return sheet(n, 'colourpg', `${head(title, text)}
      <div style="display:flex;justify-content:center">${art}</div>
      <div class="box" style="width:100%;margin-top:auto"><b style="color:var(--maroon)">${esc(t.trimester)} ${tri} — reflection</b>${t.colouring.reflect.map((r) => `<div class="small" style="margin-top:1.5mm">${esc(r)}</div>${lines(1, 'tight')}`).join('')}</div>`, { folio: `${t.trimester} ${tri}`, runhead: `${t.trimester} ${tri}` });
  };
  const ownGuide = () => {
    let s = '';
    for (const r of [0.08, 0.2, 0.34, 0.5, 0.68, 0.86, 1]) s += `<circle r="${r}" fill="none" stroke="var(--line)" stroke-width="0.004" stroke-dasharray="0.01 0.012"/>`;
    for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8; s += `<line x1="0" y1="0" x2="${Math.cos(a).toFixed(3)}" y2="${Math.sin(a).toFixed(3)}" stroke="var(--line)" stroke-width="0.003" stroke-dasharray="0.01 0.014"/>`; }
    return `<svg viewBox="-1.03 -1.03 2.06 2.06" width="500" height="500">${s}<circle r="0.015" fill="var(--maroon)"/></svg>`;
  };

  // ---------- weekly page ----------
  P.week = (n, wk) => {
    const isRange = typeof wk.w === 'string';
    const [fruit, shape, cm, g] = wk.size;
    const nu = nutri.items[wk.nourish];
    const na = acts[nu.act];
    const tri = wk.tri;
    const sizeTxt = `${esc(t.sizeNote)} <b>${esc(fruit)}</b><br>≈ ${cm < 1 ? cm * 10 + ' mm' : cm + ' cm'}${g ? ` · ≈ ${g >= 1000 ? (g / 1000).toFixed(1) + ' kg' : g + ' g'}` : ''}`;
    const body = `
      <div class="wkhead">
        <div><div class="wlabel">${esc(isRange ? t.weeks : t.week)}</div><div class="wnum ${isRange ? 'range' : ''}">${esc(wk.w)}</div><div class="wlabel">${esc(t.trimester)} ${tri}</div></div>
        <div class="theme"><div class="sa">${esc(wk.name[0])}<span class="deva">${esc(wk.name[1])}</span></div><div class="en">${esc(wk.name[2])}</div></div>
        <div class="size"><span class="fruit">${A.fruitIcon(shape, 40)}</span><span>${sizeTxt}</span></div>
      </div>
      <div class="baby"><div class="bt"><h4>${esc(t.babyThisWeek)}</h4><div style="font-size:9.8pt;line-height:1.38">${esc(wk.baby)}</div></div><div class="hn"><span class="caps" style="color:var(--marigold)">${esc(t.honest)}</span><br>${esc(wk.note)}</div></div>
      <div class="grid4">${actBox('mind', wk.mind[0], wk.mind[1], wk)}${actBox('body', wk.body[0], wk.body[1], wk)}${actBox('heart', wk.heart[0], wk.heart[1], wk)}${actBox('spirit', wk.spirit[0], wk.spirit[1], wk)}</div>
      <div class="act nourish-box"><div class="ah">${A.strandIcon('nourish', 15)}<span class="sn">${esc(t.strand.nourish)}</span><span class="sp"></span>${badge(na.badge)}<span class="small" style="color:var(--soft-ink)">${esc(na.title)}</span></div>
        <div class="nourish"><div><div class="at">${esc(nu.food)}</div><div class="focus" style="margin-bottom:0.6mm">${esc(nu.why)}</div><div class="recipe"><b>${esc(t.recipe)}:</b> ${esc(nu.recipe)}</div></div>
        <div class="dd"><div class="yes">${esc(nu.do)}</div><div class="no">${esc(nu.dont)}</div><div class="ev" style="margin-top:0">${esc(na.note)}</div><div class="safe" style="margin-top:0">${MED}${esc(t.doctor)}</div></div></div></div>
      <div class="checkin">
        <div class="box" style="padding:2mm 3mm"><div class="caps" style="color:var(--maroon);margin-bottom:1mm">${esc(t.checkin)}</div>
          <div class="ci">
            <span class="lab">${esc(t.mood)}</span>${faces()}<span class="lab">${esc(t.sleep)}</span><span class="blankline"></span>
            <span class="lab">${esc(t.water)}</span><span class="glasses">${'<i></i>'.repeat(10)}</span><span class="lab">${esc(t.energy)}</span><span class="dots5">${'<i></i>'.repeat(5)}</span>
            <span class="lab">${esc(tri === 1 ? t.nausea : t.kicksLabel)}</span><span class="small">${tri === 1 ? '<span class="dots5">' + '<i></i>'.repeat(5) + '</span>' : wk.w < 24 ? '<span class="tick"></span>felt flutters / movement' : '<span class="tick"></span>normal for my baby'}</span><span></span><span></span>
            <span class="lab">${esc(t.partnerTask)}</span><span class="partner" style="grid-column:span 3"><span class="tick"></span>${esc(wk.partner)}</span>
          </div></div>
        <div class="calm"><span class="caps">${esc(t.calmMinute)}</span>${A.badgeIcon('E', 9)}<br>${esc(wk.calm)}<div class="lines tight" style="margin-top:0.5mm"><span></span></div></div>
      </div>`;
    return sheet(n, 'wk', body, { folio: `${t.week} ${wk.w} · ${t.trimester} ${tri}`, runhead: `${t.trimester} ${tri} · ${t.week} ${wk.w}` });
  };

  // ---------- daily / family / trackers / keepsakes ----------
  P.daily = (n) => sheet(n, 'daily', `${head(t.daily.title)}
    <div class="row">${['morning', 'evening'].map((k) => `<div class="box grow"><div class="row" style="align-items:center">${k === 'morning' ? A.mandala('sun', { size: 60, colour: true, stroke: 0.008 }) : A.moonPhases(3, 18)}<h3>${esc(t.daily[k].title)}</h3></div><ol class="steps" style="margin-top:2mm">${t.daily[k].steps.map((s) => `<li style="margin-bottom:1.5mm"><span class="tick"></span>${esc(s)}</li>`).join('')}</ol></div>`).join('')}</div>
    <p class="small" style="margin-top:3mm">${badge('S')} ${esc(t.daily.note)} ${MED}${esc(t.doctor)}</p>
    <h3 style="margin-top:3mm">My own rhythm</h3>
    <table class="tbl-sm"><tr><th style="width:30mm">Time</th><th>Morning</th><th>Afternoon</th><th>Evening</th></tr>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<tr><td>${d}</td><td class="blank"></td><td class="blank"></td><td class="blank"></td></tr>`).join('')}</table>`, { folio: t.daily.title, runhead: 'Daily rhythm' });

  P.playlist = (n) => sheet(n, 'playlist', `${head(t.playlist.title, t.playlist.ideas)}
    <table class="tbl-sm"><tr>${t.playlist.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${Array.from({ length: t.playlist.rows }, () => '<tr><td class="blank" style="height:7.6mm"></td><td></td><td style="width:22mm"></td></tr>').join('')}</table>
    <p class="small" style="color:var(--maroon);margin-top:1.5mm">${esc(t.playlist.safety)}</p>
    <h3 style="margin-top:2mm">${esc(t.playlist.talkTitle)} ${badge('S')}</h3>
    <div class="twocol small" style="margin-top:1.5mm">${t.playlist.talk.map((s) => `<p>💬 ${esc(s)}</p>`).join('').replace(/💬/g, '◦')}</div>`, { folio: 'Daily rhythm', runhead: 'Daily rhythm' });

  P.family = (n) => sheet(n, 'family', `${head(t.family.title)}
    <div class="row"><div class="box grow"><h4>Partner tasks ${badge('S')}</h4><ul class="ticks small" style="margin-top:1.5mm">${t.family.partner.map((s) => `<li><span class="tick"></span>${esc(s)}</li>`).join('')}</ul></div>
    <div class="box grow"><h4>Grandparents & elders ${badge('E')}</h4><ul class="ticks small" style="margin-top:1.5mm">${t.family.grand.map((s) => `<li><span class="tick"></span>${esc(s)}</li>`).join('')}</ul></div></div>
    <h3 style="margin-top:4mm">${esc(t.family.logTitle)}</h3>
    <table class="tbl-sm"><tr>${t.family.logCols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${Array.from({ length: t.family.logRows }, () => '<tr><td class="blank" style="width:24mm"></td><td style="width:30mm"></td><td></td><td style="width:36mm"></td></tr>').join('')}</table>${fill('flower')}`, { folio: 'Family', runhead: 'Family' });

  P.tree = (n) => {
    const tb = (label, w = 36) => `<div class="treebox" style="width:${w}mm">${esc(label)}</div>`;
    return sheet(n, 'tree', `${head(t.tree.title, t.tree.sub)}
    <div class="col" style="align-items:center;gap:5mm;margin-top:4mm;position:relative">
      <div class="caps" style="color:var(--gold)">${esc(t.tree.great)}</div>
      <div class="row" style="gap:2.5mm">${Array.from({ length: 8 }, () => tb('', 19)).join('')}</div>
      <div class="row" style="gap:6mm">${t.tree.grand.map((g) => tb(g, 38)).join('')}</div>
      <div class="row" style="gap:30mm">${t.tree.parents.map((g) => tb(g, 48)).join('')}</div>
      <div style="margin-top:2mm">${A.mandala('tree', { size: 240, colour: true, stroke: 0.004 })}</div>
      ${tb(t.tree.baby + (cfg.baby_nickname ? ' · ' + cfg.baby_nickname : ''), 60)}
    </div>
    <div class="foot">${badge('T')} Tradition & culture · knowing one’s roots and the people who will love this child.</div>`, { folio: 'Family', runhead: 'Family' });
  };

  P.celebrate = (n) => sheet(n, 'celebrate', `${head(t.celebrate.title, t.celebrate.sub)}
    <p class="small">${badge('T')} ${esc(t.celebrate.intro)}</p>
    ${t.celebrate.fields.map((f) => `<div class="field"><span style="min-width:44mm">${esc(f)}</span></div>`).join('')}
    <h3 style="margin-top:4mm">${esc(t.celebrate.blessTitle)}</h3>
    <table class="tbl-sm"><tr><th style="width:38mm">From</th><th>Blessing / wish</th></tr>${Array.from({ length: t.celebrate.blessRows }, () => '<tr><td class="blank"></td><td></td></tr>').join('')}</table>${fill('lotus')}`, { folio: 'Family', runhead: 'Family' });

  P.kicks = (n) => sheet(n, 'kicks', `${head(t.kicks.title, t.kicks.sub)}
    <p class="small">${esc(t.kicks.how)}</p>
    <table class="tbl-sm"><tr>${t.kicks.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${Array.from({ length: 13 }, (_, i) => `<tr><td style="font-weight:700;color:var(--maroon)">${28 + i}</td>${'<td class="blank" style="height:8.6mm"><span class="tick"></span></td>'.repeat(7)}<td></td></tr>`).join('')}</table>
    <div class="alert" style="margin-top:3mm">${esc(t.kicks.alert)}</div>
    <div class="foot">${badge('S')} ${esc(t.kicks.src)}</div>`, { folio: 'Trackers', runhead: 'Trackers & logs' });

  P.appts = (n) => sheet(n, 'appts', `${head(t.appts.title)}
    <table class="tbl-sm"><tr>${t.appts.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${Array.from({ length: t.appts.rows }, () => '<tr><td class="blank" style="width:22mm"></td><td style="width:14mm"></td><td style="width:30mm"></td><td style="width:16mm"></td><td style="width:16mm"></td><td></td></tr>').join('')}</table>
    <h3 style="margin-top:4mm">${esc(t.appts.qTitle)}</h3>${lines(t.appts.qRows)}`, { folio: 'Trackers', runhead: 'Trackers & logs' });

  P.bag = (n) => sheet(n, 'bag', `${head(t.bag.title)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm">${['mother', 'baby', 'partner', 'home'].map((k, i) => `<div class="box"><h4>${esc(t.bag.titles[i])}</h4><ul class="ticks small" style="margin-top:2mm">${t.bag[k].map((s) => `<li><span class="tick"></span>${esc(s)}</li>`).join('')}<li><span class="tick"></span><span class="blankline" style="width:50mm"></span></li><li><span class="tick"></span><span class="blankline" style="width:50mm"></span></li></ul></div>`).join('')}</div>
    ${fill('lotus')}<div class="foot">Pack by week 36. Keep your MCP card and reports in one folder.</div>`, { folio: 'Keepsakes & prep', runhead: 'Keepsakes & prep' });

  P.birth = (n) => sheet(n, 'birth', `${head(t.birth.title, t.birth.sub)}
    ${t.birth.items.map((s) => `<div style="margin-bottom:1.4mm"><div class="small" style="font-weight:600;color:var(--maroon)">${esc(s)}</div>${lines(2)}</div>`).join('')}`, { folio: 'Keepsakes & prep', runhead: 'Keepsakes & prep' });

  P.newborn = (n) => sheet(n, 'newborn', `${head(t.newborn.title)}
    <div class="row"><div class="box grow"><h4>Feeding ${badge('S')}</h4><ul class="plain small" style="margin-top:1mm">${t.newborn.feed.map((s) => `<li style="margin-bottom:1mm">◦ ${esc(s)}</li>`).join('')}</ul></div><div class="box grow"><h4>Vaccinations & sleep ${badge('S')}</h4><p class="small" style="margin-top:1mm">${esc(t.newborn.vacc)}</p><p class="small">${esc(t.newborn.sleep)}</p></div></div>
    <div class="alert" style="margin-top:4mm"><h4 style="color:var(--maroon)">${esc(t.newborn.dangerTitle)}</h4><ol style="margin:1.5mm 0 0;padding-left:5mm;font-weight:500;color:var(--ink);font-size:9.8pt">${t.newborn.danger.map((s) => `<li style="margin-bottom:1mm">${esc(s)}</li>`).join('')}</ol></div>
    <h4 style="margin-top:4mm">Useful numbers</h4>${['Paediatrician', 'Lactation support', 'ASHA / ANM', 'Hospital'].map((f) => `<div class="field"><span style="min-width:40mm">${f}</span></div>`).join('')}
    ${fill('small')}<div class="foot">${esc(t.newborn.src)}</div>`, { folio: 'Keepsakes & prep', runhead: 'Keepsakes & prep' });

  P.names = (n) => sheet(n, 'names', `${head(t.names.title, t.names.sub)}
    <table class="tbl-sm"><tr>${t.names.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${Array.from({ length: t.names.rows }, () => '<tr><td class="blank" style="height:10.5mm"></td><td></td><td></td><td></td></tr>').join('')}</table>
    <p class="tiny" style="margin-top:2mm">${esc(t.names.seeds)}</p>${fill('small')}`, { folio: 'Keepsakes & prep', runhead: 'Keepsakes & prep' });

  P.photos = (n) => sheet(n, 'photos', `${head(t.photos.title)}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm">${t.photos.labels.map((l) => `<div class="photo" style="height:62mm">${esc(l)}</div>`).join('')}</div>
    <h3 style="margin-top:5mm">${esc(t.photos.us)}</h3>
    <div class="photo" style="height:66mm;margin-top:2mm;border-style:solid">${esc(t.photos.usDate)}</div>`, { folio: 'Keepsakes & prep', runhead: 'Keepsakes & prep' });

  P.met = (n) => sheet(n, 'met', `${head(t.met.title)}
    <div class="center">${A.lotusIcon(90)}</div>
    ${t.met.lines.map((l) => `<div class="field"><span style="min-width:62mm">${esc(l)}</span></div>`).join('')}
    <h4 style="margin-top:5mm">Our story</h4>${lines(9)}
    <div class="photo" style="height:54mm;margin-top:4mm">Our first photo together</div>`, { folio: 'Keepsakes & prep', runhead: 'Keepsakes & prep' });

  P.glossary = (n) => sheet(n, 'glossary', `${head(t.glossTitle)}
    <div class="twocol" style="font-size:9.2pt">${gloss.map(([a, d, m]) => `<p style="margin-bottom:2mm"><b style="color:var(--maroon)">${esc(a)}</b> <span>${esc(d)}</span> — ${esc(m)}</p>`).join('')}</div>`, { folio: 'Back matter', runhead: 'Back matter' });

  P.refs = (n) => {
    const groups = ['guideline', 'science', 'classical', 'india', 'law'];
    return sheet(n, 'refsp', `<h2 style="margin-bottom:1mm">${esc(t.refTitle)}</h2><div class="tiny" style="margin-bottom:2mm">Links for every source are in research/research-notes.md. [needs verification] marks items awaiting expert review.</div>
      <div class="refs">${groups.map((g) => `<h4>${esc(t.refGroups[g])}</h4>${refs.filter((r) => r.group === g).map((r) => `<p>${esc(r.text)}</p>`).join('')}`).join('')}</div>`, { folio: 'Back matter', runhead: 'Back matter' });
  };

  P.tveFull = (n) => sheet(n, 'tvefull', `${head(t.tveFull.title)}
    <table class="tbl-sm"><tr>${t.tveFull.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${t.tveFull.rows.map(([a, b, c]) => `<tr><td style="font-weight:600">${esc(a)}</td><td>${esc(b)}</td><td style="white-space:nowrap">${A.badgeIcon(c, 12)} <span class="tiny">${esc(t.badge[c] || t.tve.x)}</span></td></tr>`).join('')}</table>
    ${fill('small')}<div class="foot">Full evidence table with sources and confidence levels: research/evidence-table.csv. Items marked [needs verification] are listed in QA-report.md.</div>`, { folio: 'Back matter', runhead: 'Back matter' });

  P.index = (n, idx) => sheet(n, 'index', `${head(t.index.title, t.index.sub)}
    <div class="twocol" style="font-size:8.2pt;line-height:1.3">${['S', 'E', 'T'].map((b) => `<h4 style="font-size:10.5pt;margin:1mm 0">${A.badgeIcon(b, 11)} ${esc(t.badge[b])}</h4>${idx.filter((r) => r.badge === b).map((r) => `<p style="margin:0 0 0.9mm"><b>${esc(r.title)}</b> <span class="chip time" style="font-size:6.6pt">${r.min ? r.min + ' ' + t.min : 'meal'}</span> <span class="tiny">wk ${esc(r.weeks.join(', '))}</span></p>`).join('')}`).join('')}</div>`, { folio: 'Back matter', runhead: 'Back matter' });

  P.back = (n) => sheet(n, 'back cover', `
    <div class="col" style="align-items:center;text-align:center;height:100%;justify-content:center;gap:6mm">
      ${A.mandala('moon', { size: 300, colour: true })}
      <div class="deva" style="font-size:15pt;color:var(--maroon)">${nl(mantras.mantras.find((m) => m.id === 'sarve').deva)}</div>
      <div style="font-family:var(--serif);font-style:italic;font-size:13pt;max-width:130mm">${esc(t.back.bless)}</div>
      <div class="small" style="max-width:140mm">${esc(t.back.review)}</div>
      <div class="tiny" style="max-width:140mm">${esc(t.medical.disclaimer)}<br>${esc(t.back.credits)}</div>
    </div>`, { noFolio: true, bleedbg: ' ' });

  return P;
}
