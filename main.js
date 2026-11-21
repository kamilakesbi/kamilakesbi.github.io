// Theme toggle
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
}

// Spectrum: a noisy "natural" spectrum. In AI mode, regularly spaced peaks
// appear, a nod to the periodic artifacts AI generators leave behind.
const canvas = document.getElementById('spectrum');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const buttons = document.querySelectorAll('.seg button[data-mode]');
  const status = document.getElementById('spectrumStatus');
  let mode = buttons.length ? 'human' : 'ai';
  let peak = mode === 'ai' ? 1 : 0;
  let w, h, dpr, t = 0, autoTimer = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  function noise(x, s) {
    return Math.sin(x * 0.9 + s) * 0.5 + Math.sin(x * 2.3 - s * 1.3) * 0.3 + Math.sin(x * 5.1 + s * 0.7) * 0.2;
  }

  function setMode(next) {
    mode = next;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    if (status) {
      status.innerHTML = mode === 'ai'
        ? '<i class="sw sw-ai"></i>AI-generated: evenly spaced peaks'
        : '<i class="sw sw-real"></i>Human-made: no regular pattern';
    }
    if (reduced) { peak = mode === 'ai' ? 1 : 0; draw(); }
  }

  buttons.forEach((b) => b.addEventListener('click', () => {
    clearInterval(autoTimer);
    setMode(b.dataset.mode);
  }));
  if (buttons.length && !reduced) {
    autoTimer = setInterval(() => setMode(mode === 'ai' ? 'human' : 'ai'), 3500);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const target = mode === 'ai' ? 1 : 0;
    peak += (target - peak) * (reduced ? 1 : 0.08);
    const bars = Math.floor(w / 5);
    const step = w / bars;
    const period = Math.max(10, Math.round(bars / 14));
    const ink = css('--ink');
    const sand = css('--sand');
    for (let i = 0; i < bars; i++) {
      const x = i / bars;
      const envelope = Math.exp(-x * 2.2) * 0.85 + 0.12;
      const n = (noise(i * 0.35, t) + 1) / 2;
      let v = envelope * (0.35 + 0.65 * n);
      const isPeak = i % period === 0 && i > 0;
      if (isPeak) v = Math.min(1, v + peak * (0.35 + 0.08 * Math.sin(t * 2 + i)));
      const bh = Math.max(2, v * (h - 8));
      const on = isPeak && peak > 0.05;
      ctx.fillStyle = on ? sand : ink;
      ctx.globalAlpha = on ? 0.28 + 0.72 * peak : 0.28;
      ctx.fillRect(i * step, h - bh, Math.max(1, step - 2), bh);
    }
    ctx.globalAlpha = 1;
    t += 0.012;
    if (!reduced) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduced) draw(); });
  draw();
}

// Reveal sections on scroll
const targets = document.querySelectorAll('.block, .footer');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  targets.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}

// Chart tooltips
const tip = document.getElementById('tip');
if (tip) {
  document.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const r = el.getBoundingClientRect();
      tip.textContent = el.dataset.tip;
      tip.style.left = r.left + r.width / 2 + 'px';
      tip.style.top = r.top + 'px';
      tip.hidden = false;
    });
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
  window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
}

// Collapsible sections
document.querySelectorAll('.section-toggle').forEach((btn) => {
  const body = document.getElementById(btn.getAttribute('aria-controls'));
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    body.classList.toggle('collapsed', open);
  });
});

// Foldable jobs
const jobToggles = [...document.querySelectorAll('.job-toggle')];
function setJob(btn, open) {
  btn.setAttribute('aria-expanded', String(open));
  document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('collapsed', !open);
}
function syncExpandAll() {
  const all = document.querySelector('.expand-all');
  if (!all) return;
  const scoped = [...all.closest('.block').querySelectorAll('.job-toggle')];
  all.textContent = scoped.every((b) => b.getAttribute('aria-expanded') === 'true') ? 'Collapse all' : 'Expand all';
}
jobToggles.forEach((btn) => {
  const head = btn.closest('.cv-head');
  head.classList.add('is-toggle');
  head.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    setJob(btn, btn.getAttribute('aria-expanded') !== 'true');
    syncExpandAll();
  });
});
const expandAll = document.querySelector('.expand-all');
if (expandAll) {
  expandAll.addEventListener('click', () => {
    const open = expandAll.textContent === 'Expand all';
    expandAll.closest('.block').querySelectorAll('.job-toggle').forEach((b) => setJob(b, open));
    syncExpandAll();
  });
  syncExpandAll();
}

// Speed-change explainer: on a linear axis a speed change spreads the peaks
// apart; on a log axis it only shifts them, so one sliding filter still matches.
const slider = document.getElementById('speedSlider');
if (slider) {
  const lin = document.getElementById('speedLinear');
  const lg = document.getElementById('speedLog');
  const out = document.getElementById('speedValue');
  const linStatus = document.getElementById('linStatus');
  const logStatus = document.getElementById('logStatus');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const SPACING = 0.1, PEAKS = 9, FMIN = 0.05;
  const LOGSPAN = Math.log(1 / FMIN);
  let t = 0;

  function fit(c) {
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  const wobble = (x, s) => (Math.sin(x * 9 + s) * 0.5 + Math.sin(x * 23 - s * 1.3) * 0.3 + Math.sin(x * 51 + s * 0.7) * 0.2 + 1) / 2;

  // xOf maps a normalized frequency (0..1) to a horizontal position (0..1).
  function drawPanel(c, xOf, fOf, speed, extra) {
    const { ctx, w, h } = fit(c);
    const ink = css('--ink'), sand = css('--sand');
    const bars = Math.max(40, Math.floor(w / 5));
    const step = w / bars;
    const peakBars = new Set();
    for (let k = 1; k <= PEAKS; k++) {
      const x = xOf(k * SPACING * speed);
      if (x >= 0 && x < 1) peakBars.add(Math.floor(x * bars));
    }
    for (let i = 0; i < bars; i++) {
      const f = fOf((i + 0.5) / bars);
      const env = Math.exp(-f * 2.2) * 0.75 + 0.12;
      let v = env * (0.35 + 0.65 * wobble(i / bars, t));
      const isPeak = peakBars.has(i);
      if (isPeak) v = Math.min(1, v + 0.45);
      const bh = Math.max(2, v * (h - 10));
      ctx.fillStyle = isPeak ? sand : ink;
      ctx.globalAlpha = isPeak ? 1 : 0.28;
      ctx.fillRect(i * step, h - bh, Math.max(1, step - 2), bh);
    }
    ctx.globalAlpha = 1;
    extra(ctx, w, h, ink, sand);
  }

  function render() {
    const s = parseFloat(slider.value);
    out.textContent = s.toFixed(2) + '×';

    // Linear axis: x = f. Dashed lines mark where an unmodified track has its peaks.
    drawPanel(lin, (f) => f, (x) => x, s, (ctx, w, h, ink) => {
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.55; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      for (let k = 1; k <= PEAKS; k++) {
        const x = k * SPACING * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    const caught = Math.abs(s - 1) <= 0.01;
    linStatus.textContent = caught ? '✓ Standard detector: detected' : '✗ Standard detector: missed';
    linStatus.classList.toggle('ok', caught);
    linStatus.classList.toggle('bad', !caught);

    // Log axis: x = log(f / FMIN) / LOGSPAN. A speed change only shifts the pattern.
    const xOfLog = (f) => Math.log(f / FMIN) / LOGSPAN;
    drawPanel(lg, xOfLog, (x) => FMIN * Math.exp(x * LOGSPAN), s, (ctx, w, h, ink, sand) => {
      const x0 = xOfLog(SPACING * s) * w - 8;
      const x1 = Math.min(w - 1, xOfLog(PEAKS * SPACING * s) * w + 8);
      ctx.fillStyle = sand; ctx.globalAlpha = 0.12;
      ctx.fillRect(x0, 2, x1 - x0, h - 4);
      ctx.globalAlpha = 1; ctx.strokeStyle = sand; ctx.lineWidth = 2;
      ctx.strokeRect(x0, 2, x1 - x0, h - 4);
      ctx.lineWidth = 2;
      for (let k = 1; k <= PEAKS; k++) {
        const x = xOfLog(k * SPACING * s) * w;
        if (x > w) continue;
        ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, 12); ctx.stroke();
      }
    });
    logStatus.textContent = '✓ Detected · estimated speed ' + s.toFixed(2) + '×';
  }

  function loop() {
    t += 0.012;
    render();
    requestAnimationFrame(loop);
  }

  slider.addEventListener('input', render);
  window.addEventListener('resize', render);
  if (reducedMotion) render(); else loop();
}

// Hybrid-track explainer: the mix detector's chunk scores follow the loudness
// of whichever stem is AI-generated.
const stemsCanvas = document.getElementById('stemsCanvas');
if (stemsCanvas) {
  const vocals = [0.05, 0.1, 0.15, 0.7, 0.8, 0.75, 0.85, 0.8, 0.7, 0, 0, 0, 0, 0.9, 0.95, 0.9, 0.85, 0.9, 0.8, 0.1, 0, 0, 0.05, 0];
  const accomp = [0.5, 0.6, 0.7, 0.6, 0.55, 0.6, 0.6, 0.55, 0.6, 0.8, 0.85, 0.9, 0.85, 0.6, 0.55, 0.6, 0.6, 0.55, 0.6, 0.7, 0.6, 0.5, 0.4, 0.3];
  const relV = vocals.map((v, i) => v / (v + accomp[i] + 1e-6));
  const relA = relV.map((r) => 1 - r);
  const smooth = (x) => x * x * (3 - 2 * x);
  const jitter = (i) => 0.04 * Math.sin(i * 2.7) + 0.03 * Math.cos(i * 5.1);
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const wmean = (s, w) => s.reduce((a, x, i) => a + x * w[i], 0) / w.reduce((a, b) => a + b, 0);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const buttons = document.querySelectorAll('[data-stem]');
  const verdict = document.getElementById('stemsVerdict');
  let mode = 'voc';
  let shown = null;

  function scores(m) {
    return relV.map((r, i) => {
      const ai = m === 'voc' ? r : m === 'acc' ? 1 - r : 0;
      return clamp(0.06 + (m === 'none' ? 0 : 0.88 * smooth(Math.min(1, ai * 1.4))) + jitter(i));
    });
  }

  function verdicts(s) {
    const pv = wmean(s, relV), pa = wmean(s, relA);
    const level = Math.min(1, (s.reduce((a, b) => a + b, 0) / s.length) * 2.5);
    const soft = (x) => 0.03 + 0.94 * x;
    return { voc: soft(clamp(0.5 + 1.2 * (pv - pa)) * level), acc: soft(clamp(0.5 + 1.2 * (pa - pv)) * level) };
  }

  function draw(s) {
    const dpr = window.devicePixelRatio || 1;
    const w = stemsCanvas.clientWidth, h = stemsCanvas.clientHeight;
    stemsCanvas.width = w * dpr; stemsCanvas.height = h * dpr;
    const ctx = stemsCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ink = css('--ink'), sand = css('--sand'), line = css('--line');
    const lanes = [[s, sand, 1], [relV, ink, 0.55], [relA, ink, 0.3]];
    const laneH = h / 3, gap = 3, barW = w / vocals.length;
    lanes.forEach(([vals, color, alpha], li) => {
      const base = (li + 1) * laneH - 6;
      ctx.fillStyle = line; ctx.globalAlpha = 1;
      ctx.fillRect(0, base, w, 1);
      ctx.fillStyle = color; ctx.globalAlpha = alpha;
      vals.forEach((v, i) => {
        const bh = Math.max(2, v * (laneH - 14));
        ctx.fillRect(i * barW + gap / 2, base - bh, barW - gap, bh);
      });
    });
    ctx.globalAlpha = 1;
  }

  function animateTo(target) {
    const start = shown || target.map(() => 0);
    const t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    function step(now) {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      shown = start.map((v, i) => v + (target[i] - v) * smooth(k));
      draw(shown);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function update() {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stem === mode)));
    const s = scores(mode);
    animateTo(s);
    const p = verdicts(s);
    const pill = (name, v) => `<span class="stem-pill${v > 0.5 ? ' is-ai' : ''}"><span>${name}</span>${v > 0.5 ? 'AI-generated' : 'Human'} · ${Math.round(v * 100)}%</span>`;
    verdict.innerHTML = pill('Vocals', p.voc) + pill('Accompaniment', p.acc);
  }

  buttons.forEach((b) => b.addEventListener('click', () => { mode = b.dataset.stem; update(); }));
  window.addEventListener('resize', () => shown && draw(shown));
  update();
}

// Tabs for the research explainers
const tabs = [...document.querySelectorAll('.rtabs [role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  // Canvases in a hidden panel have no size; redraw now that it is visible.
  window.dispatchEvent(new Event('resize'));
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    next.focus();
    selectTab(next);
  });
});

// Zero-shot explainer: a cluster map of weekly uploads; clicking a cluster shows its
// mean artifact fingerprint and whether a trained classifier would recognize it.
const zsCanvas = document.getElementById('zsCanvas');
if (zsCanvas) {
  const fpCanvas = document.getElementById('zsFp');
  const checks = document.getElementById('zsChecks');
  const knownLabel = document.getElementById('zsKnown');
  const pickButtons = document.querySelectorAll('[data-cluster]');
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

  // Peak layout of each cluster's mean fingerprint, in bars out of FP_BARS.
  const FP_BARS = 96;
  const clusters = {
    real: { label: 'Real music', c: [0.36, 0.56], sd: [0.16, 0.09], n: 260, period: 0, offset: 0, r: 0.3 },
    suno: { label: 'Suno', c: [0.82, 0.3], sd: [0.035, 0.05], n: 60, period: 8, offset: 5, r: 0.12 },
    udio: { label: 'Udio', c: [0.84, 0.72], sd: [0.035, 0.05], n: 55, period: 13, offset: 7, r: 0.12 },
    new: { label: 'New · unlabeled', c: [0.56, 0.16], sd: [0.035, 0.045], n: 45, period: 10, offset: 2, r: 0.12, isNew: true },
  };
  const verdicts = {
    real: { known: null, rows: [['ok', 'Trained classifiers', 'No AI pattern found'], ['ok', 'Clustering', 'Part of the real-music cloud']], verdict: 'Human-made music: no periodic artifacts.' },
    suno: { known: 'suno', rows: [['ok', 'Trained classifiers', 'Matches the known Suno pattern'], ['ok', 'Clustering', 'Known cluster']], verdict: 'Detected: AI-generated, Suno.' },
    udio: { known: 'udio', rows: [['ok', 'Trained classifiers', 'Matches the known Udio pattern'], ['ok', 'Clustering', 'Known cluster']], verdict: 'Detected: AI-generated, Udio.' },
    new: { known: 'suno', rows: [['bad', 'Trained classifiers', 'Clear periodic peaks, but no known pattern matches'], ['ok', 'Clustering', 'Tight, separate cluster with no label']], verdict: 'A new generator, flagged for investigation before any classifier was trained on it.' },
  };
  let selected = 'suno';
  const points = [];
  Object.entries(clusters).forEach(([key, g]) => {
    for (let i = 0; i < g.n; i++) points.push({ key, x: g.c[0] + gauss() * g.sd[0], y: g.c[1] + gauss() * g.sd[1] });
  });

  function size(c) {
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const X = (x, w) => 16 + x * (w - 32), Y = (y, h) => 16 + y * (h - 32);

  function drawMap() {
    const { ctx, w, h } = size(zsCanvas);
    if (!w) return;
    const ink = css('--ink'), sand = css('--sand'), muted = css('--muted');
    points.forEach((p) => {
      const g = clusters[p.key];
      const sel = p.key === selected;
      ctx.fillStyle = g.isNew ? sand : ink;
      ctx.globalAlpha = (g.isNew ? 0.95 : p.key === 'real' ? 0.3 : 0.75) * (sel || selected === null ? 1 : 0.55);
      ctx.beginPath(); ctx.arc(X(p.x, w), Y(p.y, h), g.isNew ? 3.4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    Object.entries(clusters).forEach(([key, g]) => {
      const sel = key === selected;
      const cx = X(g.c[0], w), cy = Y(g.c[1], h);
      if (key === 'real') {
        if (sel) {
          ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.34, h * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.fillStyle = sel ? ink : muted; ctx.fillText(g.label, X(0.06, w), Y(0.95, h));
        return;
      }
      const r = Math.max(28, g.sd[1] * 2.8 * h);
      ctx.strokeStyle = g.isNew ? sand : ink;
      ctx.lineWidth = sel ? 2.5 : 1;
      ctx.globalAlpha = sel ? 1 : 0.5;
      if (!g.isNew) ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = g.isNew ? sand : sel ? ink : muted;
      const tw = ctx.measureText(g.label).width;
      ctx.fillText(g.label, Math.min(w - tw - 6, Math.max(6, cx - tw / 2)), cy + r + 18 > h - 4 ? cy - r - 8 : cy + r + 18);
    });
  }

  const wobble = (i) => (Math.sin(i * 0.9) * 0.5 + Math.sin(i * 2.3 + 1) * 0.3 + Math.sin(i * 5.1 + 2) * 0.2 + 1) / 2;
  const isPeak = (g, i) => g.period > 0 && i >= g.offset && (i - g.offset) % g.period === 0;

  function drawFingerprint() {
    const { ctx, w, h } = size(fpCanvas);
    if (!w) return;
    const ink = css('--ink'), sand = css('--sand');
    const g = clusters[selected];
    const known = verdicts[selected].known ? clusters[verdicts[selected].known] : null;
    const step = w / FP_BARS;
    for (let i = 0; i < FP_BARS; i++) {
      const env = Math.exp(-(i / FP_BARS) * 2) * 0.7 + 0.15;
      let v = env * (0.35 + 0.65 * wobble(i + (selected.length * 7)));
      const peak = isPeak(g, i);
      if (peak) v = Math.min(1, v + 0.42);
      const bh = Math.max(2, v * (h - 8));
      ctx.fillStyle = peak ? sand : ink;
      ctx.globalAlpha = peak ? 1 : 0.28;
      ctx.fillRect(i * step, h - bh, Math.max(1, step - 2), bh);
    }
    ctx.globalAlpha = 1;
    if (known) {
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.6; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      for (let i = 0; i < FP_BARS; i++) {
        if (!isPeak(known, i)) continue;
        const x = i * step + (step - 2) / 2;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }

  function render() {
    pickButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cluster === selected)));
    const v = verdicts[selected];
    knownLabel.textContent = v.known ? (selected === 'new' ? 'closest known pattern (Suno)' : 'known ' + clusters[v.known].label + ' pattern') : 'no known pattern to compare';
    checks.innerHTML = v.rows.map(([state, who, what]) => `<div class="zs-check ${state}"><span class="zs-mark">${state === 'ok' ? '✓' : '✗'}</span><span class="zs-who">${who}</span><span>${what}</span></div>`).join('') + `<p class="zs-verdict${selected === 'new' ? ' is-new' : ''}">${v.verdict}</p>`;
    drawMap();
    drawFingerprint();
  }

  function pick(key) { selected = key; render(); }
  pickButtons.forEach((b) => b.addEventListener('click', () => pick(b.dataset.cluster)));
  zsCanvas.addEventListener('click', (e) => {
    const rect = zsCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const w = rect.width, h = rect.height;
    let best = 'real', bestD = Infinity;
    ['suno', 'udio', 'new'].forEach((k) => {
      const g = clusters[k];
      const d = Math.hypot(px - X(g.c[0], w), py - Y(g.c[1], h));
      if (d < bestD) { bestD = d; best = k; }
    });
    pick(bestD < 60 ? best : 'real');
  });
  zsCanvas.style.cursor = 'pointer';
  window.addEventListener('resize', render);
  render();
}

// Communities explainer: two Voronoi maps (week 1, week 2). In the dense region the cells
// are small and shift, so a track leaves its cluster; grouped into a community, it stays.
const vorW1 = document.getElementById('vorW1');
if (vorW1) {
  const vorW2 = document.getElementById('vorW2');
  const statusEl = document.getElementById('commStatus');
  const viewButtons = document.querySelectorAll('[data-view]');
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  let seed = 5;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // Sites in a 1.6 x 1 box: a dense region on the left, a sparse one on the right.
  const BW = 1.6, BH = 1;
  const sites = [];
  const dc = [0.5, 0.5];
  sites.push([dc[0], dc[1]]);
  [5, 10, 14].forEach((n, ring) => {
    const r = 0.14 + ring * 0.13;
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + ring * 0.4 + (rand() - 0.5) * 0.3;
      sites.push([dc[0] + Math.cos(ang) * r * (1 + (rand() - 0.5) * 0.15), dc[1] + Math.sin(ang) * r * (1 + (rand() - 0.5) * 0.15)]);
    }
  });
  const denseCount = sites.length;
  [[1.25, 0.5], [1.1, 0.12], [1.47, 0.18], [1.5, 0.85], [1.08, 0.88], [1.02, 0.5], [1.35, 0.68]].forEach((p) => sites.push(p));

  // The followed track sits inside cluster A, toward its nearest neighbor N; next week A and N
  // shift slightly and N takes it.
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const A = 10;
  const N = sites.map((p, i) => [i, d2(p, sites[A])]).filter(([i]) => i !== A && i < denseCount).sort((x, y) => x[1] - y[1])[0][0];
  const track = lerp(sites[A], sites[N], 0.24);
  const week2 = sites.map((p, i) => {
    if (i >= denseCount) return [p[0] + (rand() - 0.5) * 0.01, p[1] + (rand() - 0.5) * 0.01];
    return [p[0] + (rand() - 0.5) * 0.04, p[1] + (rand() - 0.5) * 0.04];
  });
  week2[A] = lerp(sites[A], sites[N], -0.3);
  week2[N] = lerp(sites[N], sites[A], 0.65);
  const track2 = [track[0] + 0.004, track[1] - 0.003];

  // Community of A: A, N and the inner clusters closest to the track, the same clusters both weeks.
  const inner = 1 + 5 + 10;
  const community = new Set([A, N, ...sites.map((p, i) => [i, d2(p, track)]).filter(([i]) => i < inner).sort((x, y) => x[1] - y[1]).slice(0, 5).map(([i]) => i)]);

  // Background tracks: many around the dense center, a few spread over the sparse side.
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const dots = [];
  for (let k = 0; k < 340; k++) dots.push([dc[0] + gauss() * 0.4, dc[1] + gauss() * 0.46]);
  for (let k = 0; k < 60; k++) dots.push([0.95 + rand() * 0.62, 0.04 + rand() * 0.92]);
  const dots2 = dots.map((p) => [p[0] + (rand() - 0.5) * 0.012, p[1] + (rand() - 0.5) * 0.012]);

  // Voronoi cell of site i: clip the bounding box by the bisector half-plane of every other site.
  function cell(i, pts) {
    let poly = [[0, 0], [BW, 0], [BW, BH], [0, BH]];
    const p = pts[i];
    pts.forEach((q, j) => {
      if (j === i || !poly.length) return;
      const nx = q[0] - p[0], ny = q[1] - p[1];
      const c = (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2;
      const inside = (v) => v[0] * nx + v[1] * ny <= c;
      const out = [];
      poly.forEach((v, k) => {
        const w = poly[(k + 1) % poly.length];
        const vi = inside(v), wi = inside(w);
        if (vi) out.push(v);
        if (vi !== wi) {
          const t = (c - (v[0] * nx + v[1] * ny)) / ((w[0] - v[0]) * nx + (w[1] - v[1]) * ny);
          out.push([v[0] + (w[0] - v[0]) * t, v[1] + (w[1] - v[1]) * t]);
        }
      });
      poly = out;
    });
    return poly;
  }
  const cells1 = sites.map((_, i) => cell(i, sites));
  const cells2 = week2.map((_, i) => cell(i, week2));

  // Outer border of a group of cells: the edges whose midpoint isn't shared with another cell of the group.
  function outline(cells, pts, group) {
    const dist = (p, q) => Math.sqrt(d2(p, q));
    const segs = [];
    group.forEach((i) => {
      const poly = cells[i];
      poly.forEach((v, k) => {
        const w = poly[(k + 1) % poly.length];
        const m = [(v[0] + w[0]) / 2, (v[1] + w[1]) / 2];
        const di = dist(m, pts[i]);
        if (![...group].some((j) => j !== i && Math.abs(dist(m, pts[j]) - di) < 1e-7)) segs.push([v, w]);
      });
    });
    return segs;
  }

  let view = 'clusters';

  function drawWeek(canvas, cells, pts, bg, t) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ink = css('--ink'), sand = css('--sand'), paper = css('--bg');
    const sx = w / BW, sy = h / BH;
    const path = (poly) => { ctx.beginPath(); poly.forEach((v, k) => (k ? ctx.lineTo(v[0] * sx, v[1] * sy) : ctx.moveTo(v[0] * sx, v[1] * sy))); ctx.closePath(); };
    const group = view === 'comm' ? community : new Set([A]);

    ctx.fillStyle = sand; ctx.globalAlpha = 0.2;
    group.forEach((i) => { path(cells[i]); ctx.fill(); });

    ctx.strokeStyle = ink; ctx.globalAlpha = 0.16; ctx.lineWidth = 1;
    cells.forEach((poly) => { path(poly); ctx.stroke(); });

    ctx.fillStyle = ink; ctx.globalAlpha = 0.32;
    bg.forEach((p) => { ctx.beginPath(); ctx.arc(p[0] * sx, p[1] * sy, 1.4, 0, Math.PI * 2); ctx.fill(); });

    ctx.strokeStyle = sand; ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    outline(cells, pts, group).forEach(([v, u]) => { ctx.moveTo(v[0] * sx, v[1] * sy); ctx.lineTo(u[0] * sx, u[1] * sy); });
    ctx.stroke();

    const x = t[0] * sx, y = t[1] * sy;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = paper; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = sand; ctx.fill();
  }

  function render() {
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    statusEl.textContent = view === 'clusters'
      ? 'Clusters are close together in dense regions of the space, so a track can be assigned to a neighboring cluster even if it barely moved. Grouping clusters into stable communities solves this.'
      : 'Grouped with its neighbors into a community, the amber track stays inside the same group from one week to the next, even though the borders inside it moved. The community also tends to share a genre or a country, like Colombian vallenato.';
    drawWeek(vorW1, cells1, sites, dots, track);
    drawWeek(vorW2, cells2, week2, dots2, track2);
  }
  viewButtons.forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
  window.addEventListener('resize', render);
  render();
}
