// Game-feel effects: particles, shockwave rings, floating text, shake, hit-stop, slow motion, flashes.
// contracts/visual-design.md → Effects, including the reduced-motion profile.
(function (PP) {
  'use strict';
  const MAX_PARTICLES = 600;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function createEffects() {
    const E = {
      reduced: false, parts: [], rings: [], floats: [],
      shake: 0, flash: 0, flashC: '255,77,109', hitstop: 0, slow: 0
    };
    try {
      const mq = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
      E.reduced = mq.matches;
      const onChange = (e) => { E.reduced = e.matches; if (E.reduced) { E.shake = 0; E.hitstop = 0; E.slow = 0; } };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
    } catch (e) { /* no matchMedia */ }

    E.burst = (x, y, col, n, pow) => {
      const count = E.reduced ? Math.ceil(n * 0.3) : n;
      for (let i = 0; i < count && E.parts.length < MAX_PARTICLES; i++) {
        const a = rnd(0, 6.283); const v = rnd(0.2, 1) * pow * (E.reduced ? 0.5 : 1);
        E.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: rnd(1.2, 2.4), sz: rnd(1.5, 4.5), col });
      }
    };
    E.ring = (x, y, col, max, w) => E.rings.push({ x, y, r: 4, max: (max || 70) * (E.reduced ? 0.6 : 1), life: 1, col, w: w || 4 });
    E.float = (x, y, txt, col, size) => E.floats.push({ x, y, txt, col, size: size || 22, life: 1 });
    E.doShake = (n) => { if (!E.reduced) E.shake = Math.max(E.shake, n); };
    E.doFlash = (alpha, col) => { E.flash = Math.max(E.flash, alpha); E.flashC = col; };

    E.zap = (pts, mult, theme) => {
      pts.forEach((q, i) => {
        E.burst(q[0], q[1], i ? theme.rgb.cyan : theme.rgb.magenta, i ? 14 : 46, i ? 260 : 520);
        E.ring(q[0], q[1], theme.rgb.cyan, i ? 40 : 110, i ? 2 : 5);
      });
      E.burst(pts[0][0], pts[0][1], theme.rgb.yellow, 18, 340);
      if (!E.reduced) { E.hitstop = 0.06; E.slow = 0.16; }
      E.doShake(7 + mult);
      E.doFlash(0.18, theme.rgb.cyan);
    };
    E.wrong = (pt, theme) => {
      E.burst(pt[0], pt[1], theme.rgb.red, 34, 300);
      E.ring(pt[0], pt[1], theme.rgb.red, 90, 4);
      E.doShake(18);
      E.doFlash(0.45, theme.rgb.red);
    };
    E.leak = (pts, theme) => {
      pts.forEach((q) => { E.burst(q[0], q[1], theme.rgb.red, 10, 160); E.ring(q[0], q[1], theme.rgb.red, 50, 3); });
      E.doShake(9);
      E.doFlash(0.22, theme.rgb.red);
    };
    E.delivered = (pts, theme) => pts.forEach((q) => E.ring(q[0], q[1], theme.rgb.green, 44, 2));
    E.clear = (cx, cy, size, pts, theme) => {
      pts.forEach((q) => E.burst(q[0], q[1], theme.rgb.green, 12, 200));
      E.ring(cx, cy, theme.rgb.green, size, 6);
    };

    E.timeScale = (rdt) => {
      if (E.hitstop > 0) { E.hitstop -= rdt; return 0.04; }
      if (E.slow > 0) { E.slow -= rdt; return 0.35; }
      return 1;
    };
    E.update = (rdt, sc) => {
      const edt = rdt * Math.max(sc, 0.3);
      for (const p of E.parts) { p.x += p.vx * edt; p.y += p.vy * edt; p.vx *= 0.93; p.vy *= 0.93; p.life -= p.dec * edt; }
      E.parts = E.parts.filter((p) => p.life > 0);
      for (const r of E.rings) { r.r += (r.max - r.r) * Math.min(1, edt * 7); r.life -= edt * 2; }
      E.rings = E.rings.filter((r) => r.life > 0);
      for (const f of E.floats) { f.y -= 40 * edt; f.life -= edt * 1.1; }
      E.floats = E.floats.filter((f) => f.life > 0);
      E.shake = Math.max(0, E.shake - rdt * 45);
      E.flash = Math.max(0, E.flash - rdt * 2.2);
    };
    E.shakeOffset = () => (E.shake > 0 ? [rnd(-E.shake, E.shake), rnd(-E.shake, E.shake)] : [0, 0]);
    E.draw = (ctx, fonts) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of E.parts) { ctx.fillStyle = `rgba(${p.col},${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life + 0.5, 0, 6.283); ctx.fill(); }
      for (const r of E.rings) { ctx.strokeStyle = `rgba(${r.col},${r.life})`; ctx.lineWidth = r.w * r.life + 0.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke(); }
      ctx.restore();
      for (const f of E.floats) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, f.life * 1.6);
        const sc = E.reduced ? 1 : 1 + (1 - f.life) * 0.3 + (f.life > 0.85 ? (f.life - 0.85) * 3 : 0);
        ctx.translate(f.x, f.y); ctx.scale(sc, sc);
        ctx.font = `900 ${f.size}px ${fonts.display}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = `rgba(${f.col},1)`; ctx.shadowBlur = 16;
        ctx.fillStyle = `rgb(${f.col})`; ctx.fillText(f.txt, 0, 0);
        ctx.restore();
      }
    };
    return E;
  }

  PP.engine.effects = { createEffects, MAX_PARTICLES };
})(globalThis.PP);
