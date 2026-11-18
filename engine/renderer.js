// Canvas renderer for the playfield. Geometry and colors: contracts/visual-design.md.
// All packets look the same whatever their outcome; color reflects only player state and results.
(function (PP) {
  'use strict';
  const FALLBACK = {
    bg: '#060a18', node: '#0c1734', nodeLan: '#0a1534', line: '#2b3a6b', text: '#e6f0ff', muted: '#8aa0c8',
    cyan: '#3ef0ff', magenta: '#ff3df0', green: '#3dffa2', red: '#ff4d6d', yellow: '#ffd23d',
    routerStroke: 'rgba(120,160,255,.9)', routerIcon: '#9fc0ff'
  };
  const VARS = {
    bg: '--bg', node: '--node', nodeLan: '--node-lan', line: '--line', text: '--text', muted: '--muted', cyan: '--cyan',
    magenta: '--magenta', green: '--green', red: '--red', yellow: '--yellow', routerStroke: '--router-stroke', routerIcon: '--router-icon'
  };
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return '255,255,255';
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }
  function readTheme() {
    const theme = Object.assign({}, FALLBACK);
    try {
      const cs = getComputedStyle(document.documentElement);
      for (const k of Object.keys(VARS)) { const v = cs.getPropertyValue(VARS[k]).trim(); if (v) theme[k] = v; }
    } catch (e) { /* use fallbacks */ }
    theme.rgb = {};
    for (const k of ['cyan', 'magenta', 'green', 'red', 'yellow', 'text']) theme.rgb[k] = hexToRgb(theme[k]);
    theme.fonts = { display: 'Orbitron, "Segoe UI", sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
    return theme;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function createRenderer(canvas, lan) {
    const ctx = canvas.getContext('2d');
    const theme = readTheme();
    const M = PP.engine.motion;
    let W = 0, H = 0, cx = 0, cy = 0, RX = 0, RY = 0;
    const routers = lan.members.map((m) => ({ slot: m.slot, asn: 'AS' + m.asn, ip: m.ipv4, x: 0, y: 0, flash: 0, fc: theme.rgb.green, bump: 0 }));

    function resize() {
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      W = globalThis.innerWidth; H = globalThis.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2 + 28;
      RY = Math.max(120, (H - 190) * 0.43);
      RX = Math.min(W * 0.4, RY * 1.55);
      routers.forEach((r, i) => { const a = -Math.PI / 2 + i * Math.PI / 4; r.x = cx + Math.cos(a) * RX; r.y = cy + Math.sin(a) * RY; });
    }
    globalThis.addEventListener('resize', resize);
    resize();

    const layout = () => ({ cx, cy, routers, W, H });
    const packetPoints = (inst) => M.positions(inst, layout());
    function flash(slot, kind) { const r = routers[slot]; r.flash = 1; r.fc = kind === 'good' ? theme.rgb.green : theme.rgb.red; }
    function bump(slot) { routers[slot].bump = 1; }
    function pick(x, y, insts) {
      let best = null; let bd = 30;
      for (const inst of insts) {
        if (!M.zappable(inst)) continue;
        const q = packetPoints(inst)[0];
        const d = Math.hypot(q[0] - x, q[1] - y);
        if (d < bd) { bd = d; best = inst; }
      }
      return best;
    }

    function drawBackground(time, scene) {
      ctx.fillStyle = theme.bg; ctx.fillRect(-30, -30, W + 60, H + 60);
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.7);
      bg.addColorStop(0, 'rgba(40,60,160,.28)'); bg.addColorStop(0.5, 'rgba(90,20,120,.10)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg; ctx.fillRect(-30, -30, W + 60, H + 60);
      ctx.strokeStyle = `rgba(${theme.rgb.cyan},.05)`; ctx.lineWidth = 1;
      const gs = 44; const off = scene.reduced ? 0 : (time * 8) % gs;
      ctx.beginPath();
      for (let x = -gs + off; x < W + gs; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = -gs + off; y < H + gs; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    }

    function drawLinks(time, scene) {
      for (const r of routers) {
        ctx.strokeStyle = 'rgba(91,140,255,.22)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.setLineDash([2, 16]); ctx.lineDashOffset = scene.reduced ? 0 : -time * 36;
        ctx.strokeStyle = `rgba(${theme.rgb.cyan},.55)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function drawLan(time, scene) {
      const pw = 230, ph = 76; const pulse = scene.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 2.4);
      ctx.save();
      ctx.shadowColor = `rgba(${theme.rgb.cyan},.9)`; ctx.shadowBlur = 18 + pulse * 16;
      ctx.fillStyle = theme.nodeLan; rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 16); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${theme.rgb.cyan},${0.6 + pulse * 0.4})`; ctx.stroke();
      ctx.restore();
      if (!scene.reduced) {
        ctx.save(); ctx.strokeStyle = `rgba(${theme.rgb.magenta},${0.25 * (1 - pulse)})`; ctx.lineWidth = 2;
        rr(ctx, cx - pw / 2 - 8 - pulse * 8, cy - ph / 2 - 8 - pulse * 8, pw + 16 + pulse * 16, ph + 16 + pulse * 16, 22); ctx.stroke(); ctx.restore();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text; ctx.font = `800 15px ${theme.fonts.display}`; ctx.fillText('IX PEERING LAN · ATM', cx, cy - 14);
      ctx.fillStyle = theme.muted; ctx.font = `11px ${theme.fonts.mono}`;
      ctx.fillText(lan.ipv4_subnet, cx, cy + 7); ctx.fillText(lan.ipv6_prefix, cx, cy + 22);
      if (scene.waitText) {
        ctx.fillStyle = theme.yellow; ctx.font = `700 12px ${theme.fonts.mono}`;
        ctx.fillText(scene.waitText, cx, cy + ph / 2 + 20);
      }
    }

    function drawRouters(rdt) {
      for (const r of routers) {
        r.flash = Math.max(0, r.flash - rdt * 1.6); r.bump = Math.max(0, r.bump - rdt * 4);
        const s = 1 + r.bump * 0.18 + r.flash * 0.12; const rad = 27 * s;
        ctx.save(); ctx.translate(r.x, r.y);
        ctx.shadowColor = r.flash > 0 ? `rgba(${r.fc},1)` : 'rgba(91,140,255,.8)'; ctx.shadowBlur = 14 + r.flash * 30;
        ctx.fillStyle = theme.node; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = r.flash > 0 ? `rgba(${r.fc},${0.5 + r.flash * 0.5})` : theme.routerStroke; ctx.stroke();
        ctx.shadowBlur = 0;
        const col = r.flash > 0 ? `rgba(${r.fc},1)` : theme.routerIcon;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
        const a = rad * 0.45;
        ctx.beginPath();
        for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) { ctx.moveTo(dx * a * 0.25, dy * a * 0.25); ctx.lineTo(dx * a * 1.15, dy * a * 1.15); }
        ctx.stroke();
        for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) { ctx.beginPath(); ctx.arc(dx * a * 1.15, dy * a * 1.15, 2.2, 0, 6.283); ctx.fill(); }
        ctx.restore();
        const ty = r.y < cy - RY * 0.5 ? r.y - rad - 22 : r.y + rad + 16;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.text; ctx.font = `800 13px ${theme.fonts.display}`; ctx.fillText(r.asn, r.x, ty);
        ctx.fillStyle = theme.muted; ctx.font = `11px ${theme.fonts.mono}`; ctx.fillText(r.ip, r.x, ty + 15);
      }
    }

    function drawLabel(q, label, hot) {
      const lines = label.lines;
      const titleFont = `800 12px ${theme.fonts.display}`; const lineFont = `10.5px ${theme.fonts.mono}`;
      let w = 0;
      if (label.title) { ctx.font = titleFont; w = Math.max(w, ctx.measureText(label.title).width); }
      ctx.font = lineFont;
      for (const l of lines) w = Math.max(w, ctx.measureText(l.text).width);
      const rows = lines.length + (label.title ? 1 : 0);
      const bw = w + 18; const bh = 10 + rows * 13; const bx = q[0] - bw / 2; const by = q[1] - 18 - bh;
      ctx.fillStyle = hot ? 'rgba(40,10,50,.92)' : 'rgba(8,14,34,.88)'; rr(ctx, bx, by, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = hot ? `rgba(${theme.rgb.magenta},.9)` : `rgba(${theme.rgb.cyan},.45)`; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let y = by + 11;
      if (label.title) { ctx.font = titleFont; ctx.fillStyle = hot ? '#ffb8f8' : theme.text; ctx.fillText(label.title, q[0], y); y += 13; }
      ctx.font = lineFont;
      for (const l of lines) {
        ctx.fillStyle = l.deciding ? theme.yellow : theme.muted;
        ctx.fillText(l.text, q[0], y);
        if (l.deciding) { const lw = ctx.measureText(l.text).width; ctx.fillRect(q[0] - lw / 2, y + 6, lw, 1); }
        y += 13;
      }
    }

    function drawPackets(time, scene) {
      for (const item of scene.packets) {
        const inst = item.inst; const hot = item.locked || item.hover;
        const pts = M.positionsAt(inst, inst.t, layout());
        const prev = M.positionsAt(inst, Math.max(0, inst.t - 0.09), layout());
        pts.forEach((q, i) => {
          const pv = prev[Math.min(i, prev.length - 1)];
          const g = ctx.createLinearGradient(pv[0], pv[1], q[0], q[1]);
          g.addColorStop(0, `rgba(${theme.rgb.cyan},0)`); g.addColorStop(1, hot ? `rgba(${theme.rgb.magenta},.9)` : `rgba(${theme.rgb.cyan},.85)`);
          ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(pv[0], pv[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
          const wob = scene.reduced ? 1 : 1 + Math.sin(time * 10 + inst.uid) * 0.12;
          const rad = (i ? 7 : 9.5) * wob * (hot ? 1.3 : 1);
          ctx.save(); ctx.shadowColor = hot ? theme.magenta : theme.cyan; ctx.shadowBlur = 22;
          ctx.fillStyle = hot ? theme.magenta : theme.cyan; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 6.283); ctx.fill(); ctx.restore();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q[0], q[1], rad * 0.42, 0, 6.283); ctx.fill();
        });
        if (item.label && inst.state === 'inbound') drawLabel(pts[0], item.label, hot);
      }
    }

    function drawReticle(x, y, hot, time, reduced) {
      const rad = hot ? 20 : 15; const col = hot ? theme.magenta : theme.cyan;
      const rot = reduced ? 0 : time * (hot ? 4 : 1.2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, rad, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + 1.3); ctx.stroke(); }
      ctx.rotate(-rot);
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }

    function draw(scene, rdt) {
      const time = scene.time; const fx = scene.effects;
      ctx.save();
      const [sx, sy] = fx.shakeOffset();
      ctx.translate(sx, sy);
      drawBackground(time, scene);
      drawLinks(time, scene);
      drawLan(time, scene);
      drawRouters(rdt);
      drawPackets(time, scene);
      fx.draw(ctx, theme.fonts);
      ctx.restore();
      if (fx.flash > 0) {
        if (scene.reduced) { ctx.strokeStyle = `rgba(${fx.flashC},${Math.min(1, fx.flash * 1.6)})`; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10); }
        else { ctx.fillStyle = `rgba(${fx.flashC},${fx.flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      const danger = scene.playing && scene.integrity < 35;
      const pulse = scene.reduced ? 0.15 : 0.15 * Math.sin(time * 6);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, danger ? `rgba(255,40,80,${0.25 + pulse})` : 'rgba(0,0,0,.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (scene.reticle) drawReticle(scene.reticle.x, scene.reticle.y, scene.reticle.hot, time, scene.reduced);
    }

    return { theme, resize, layout, packetPoints, flash, bump, pick, draw, routers };
  }

  PP.engine.renderer = { createRenderer, readTheme };
})(globalThis.PP);
