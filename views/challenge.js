// The play loop. Wires spawner → motion → input → rules → scoring → effects, cards, HUD.
// Decisions are graded only by PP.engine.rules.evaluateAction; this file renders outcomes.
(function (PP) {
  'use strict';
  const E = PP.engine;
  const V = PP.views;

  let deps = null;
  let canvas = null;
  let R = null;
  let fx = null;
  let typeById = new Map();
  let run = null;
  let time = 0;
  let last = 0;
  let hoverUid = null;
  const pointer = { x: -100, y: -100, visible: false };
  const banner = document.getElementById('banner');

  function showBanner(text, color) {
    banner.textContent = text;
    banner.style.color = color;
    banner.style.textShadow = '0 0 30px ' + color;
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
  }

  // ---------- Setup ----------
  function init(d) {
    deps = d;
    typeById = new Map(d.catalog.map((t) => [t.id, t]));
    canvas = document.getElementById('playfield');
    R = E.renderer.createRenderer(canvas, d.lan);
    fx = E.effects.createEffects();
    E.input.createInput(canvas, { pointer: onPointer, pointerZap, action });
    requestAnimationFrame(loop);
  }

  function speed(phase, shift) {
    if (phase.goal_zaps !== null || !phase.speedup_factor) return { interval: phase.spawn_interval_s, dur: phase.travel_time_s };
    const f = Math.pow(phase.speedup_factor, shift.speedLevel);
    return {
      interval: Math.max(phase.min_spawn_interval_s, phase.spawn_interval_s * f),
      dur: Math.max(phase.min_travel_time_s, phase.travel_time_s * f)
    };
  }

  function start(o) {
    const seed = E.rng.seedFromLocation();
    const rng = E.rng.createRng(seed !== null ? seed + o.phase.id : (Date.now() % 2147483647));
    run = {
      phase: o.phase,
      shift: o.shift,
      mode: o.shift.mode,
      rng,
      spawner: E.spawner.createSpawner(o.phase, deps.catalog, deps.lan, rng, { excluded: deps.excluded }),
      packets: [],
      spawnT: 0.8,
      lockUid: null,
      paused: false,
      ended: false,
      waitText: null,
      lastInst: o.lastInst || {}
    };
    V.hud.build({ onLog: () => V.cards.toggleLog(), onMute: () => deps.toggleMute() });
    renderHud();
    const endless = o.phase.goal_zaps === null;
    showBanner(endless ? 'ENDLESS' : 'PHASE ' + o.phase.id, getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim() || '#3ef0ff');
    V.cards.announce((endless ? 'Endless shift' : 'Phase ' + o.phase.id) + ' started: ' + o.phase.title + '.');
    E.audio.phase();
    canvas.focus();
  }

  function stop() {
    run = null;
    hoverUid = null;
    V.cards.setLog(false);
  }

  function renderHud() {
    if (!run) return;
    V.hud.render({ phase: run.phase, shift: run.shift, multiplier: E.scoring.multiplier(run.shift.combo), muted: deps.isMuted() });
  }

  // ---------- Loop ----------
  function loop(now) {
    const rdt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    time += rdt;
    const sc = fx.timeScale(rdt);
    if (run && !run.paused && !run.ended) step(rdt * sc);
    fx.update(rdt, sc);
    draw(rdt);
    requestAnimationFrame(loop);
  }

  const zappableOrHeld = (p) => E.motion.zappable(p);

  function step(dt) {
    const sp = speed(run.phase, run.shift);
    if (run.mode === 'practice') {
      if (!run.packets.some(zappableOrHeld)) {
        run.spawnT -= dt;
        if (run.spawnT <= 0) { spawn(sp.dur); run.spawnT = 0.5; }
      }
    } else {
      run.spawnT -= dt;
      if (run.spawnT <= 0) {
        if (run.packets.filter(zappableOrHeld).length < run.phase.max_packets) spawn(sp.dur);
        run.spawnT = sp.interval;
      }
    }
    for (const p of run.packets.slice()) {
      const ev = E.motion.advance(p, dt, run.mode);
      if (ev === 'held') {
        run.lockUid = p.uid;
        run.waitText = 'Space: zap  ·  L: let through';
        announceLock(p, 'Waiting for your decision');
      } else if (ev === 'reached-lan') {
        if (run.lockUid === p.uid) run.lockUid = null;
      } else if (ev === 'arrived') {
        run.packets = run.packets.filter((q) => q !== p);
        if (!p.graded) decide(p, 'arrived');
        if (run) showArrival(p);
      }
      if (!run || run.ended) break;
    }
  }

  function spawn(dur) {
    const inst = run.spawner.next({ hintTypes: run.shift.hintTypes, dur });
    if (!inst) return;
    if (inst.hinted) run.shift = E.scoring.consumeHint(run.shift, inst.typeId);
    run.packets.push(inst);
    R.bump(inst.src);
  }

  // ---------- Decisions ----------
  function decide(inst, action) {
    if (!run || run.ended) return;
    const res = E.rules.evaluateAction(inst, action, deps.catalog, deps.lan);
    inst.graded = true;
    inst.outcome = res.outcome;
    const type = typeById.get(inst.typeId);
    const before = run.shift;
    run.shift = E.scoring.apply(run.shift, res.outcome, inst.typeId, run.phase);
    const after = run.shift;
    if (res.outcome !== 'delivered') {
      run.lastInst[inst.typeId] = inst;
      V.cards.add(E.feedback.buildCard(res.outcome, type, inst));
    }
    const theme = R.theme;
    if (res.outcome === 'zap-correct') {
      const pts = R.packetPoints(inst);
      const mult = E.scoring.multiplier(after.combo);
      fx.zap(pts, mult, theme);
      fx.float(pts[0][0], pts[0][1] - 20, '+' + (after.score - before.score), theme.rgb.yellow, 24 + mult * 3);
      E.audio.zap(after.combo);
      if (after.combo > 0 && after.combo % 4 === 0) { showBanner('COMBO x' + mult + '!', theme.yellow); E.audio.combo(); }
    } else if (res.outcome === 'zap-wrong') {
      const pt = R.packetPoints(inst)[0];
      fx.wrong(pt, theme);
      fx.float(pt[0], pt[1] - 20, 'LEGIT!', theme.rgb.red, 26);
      E.audio.wrong();
      if (type.wrong_zap_banner) {
        R.flash(inst.src, 'bad'); R.flash(inst.peer, 'bad');
        showBanner(E.spawner.fill(type.wrong_zap_banner, inst.ctx), theme.red);
      }
    } else if (res.outcome === 'delivered' && after.combo > 0 && after.combo % 4 === 0) {
      showBanner('COMBO x' + E.scoring.multiplier(after.combo) + '!', theme.yellow);
      E.audio.combo();
    }
    if (after.speedLevel > before.speedLevel) {
      showBanner('SPEED UP', theme.magenta);
      E.audio.speedup();
      V.cards.announce('Speed up: level ' + (after.speedLevel + 1) + '.');
    }
    renderHud();
    if (after.status === 'phase-cleared') endPhase();
    else if (after.status === 'not-cleared' || after.status === 'integrity-out' || after.status === 'quit') endShift();
  }

  function showArrival(inst) {
    const L = R.layout();
    const pts = inst.targets.map((slot) => [L.routers[slot].x, L.routers[slot].y]);
    if (inst.outcome === 'delivered') {
      inst.targets.forEach((slot) => R.flash(slot, 'good'));
      fx.delivered(pts, R.theme);
      E.audio.delivered();
    } else if (inst.outcome === 'leak') {
      inst.targets.forEach((slot) => R.flash(slot, 'bad'));
      fx.leak(pts, R.theme);
      E.audio.leak();
    }
  }

  function zap(inst) {
    if (!run || run.ended || run.paused || !inst || !E.motion.zappable(inst)) return;
    run.packets = run.packets.filter((p) => p !== inst);
    if (run.lockUid === inst.uid) run.lockUid = null;
    run.waitText = null;
    decide(inst, 'zap');
  }

  function letThrough() {
    if (!run || run.ended || run.mode !== 'practice') return;
    const inst = run.packets.find((p) => p.held);
    if (!inst) { V.cards.announce('No packet is waiting at the LAN.'); return; }
    E.motion.release(inst);
    run.lockUid = null;
    run.waitText = null;
    decide(inst, 'let-through');
  }

  // ---------- Phase and shift end ----------
  function endPhase() {
    run.ended = true;
    const L = R.layout();
    const pts = [];
    for (const p of run.packets) for (const q of R.packetPoints(p)) pts.push(q);
    run.packets = [];
    fx.clear(L.cx, L.cy, Math.max(L.W, L.H), pts, R.theme);
    showBanner('LAN CLEAN!', R.theme.green);
    V.cards.announce('LAN clean! Phase ' + run.phase.id + ' cleared.');
    E.audio.phase();
    const done = run;
    setTimeout(() => { if (run === done) deps.onPhaseCleared(done.shift, done.lastInst); }, 1100);
  }

  function endShift() {
    run.ended = true;
    run.packets = [];
    E.audio.over();
    const L = R.layout();
    L.routers.forEach((r, i) => setTimeout(() => {
      R.flash(i, 'bad');
      fx.burst(r.x, r.y, R.theme.rgb.red, 30, 300);
      fx.ring(r.x, r.y, R.theme.rgb.red, 80, 4);
    }, i * 90));
    V.cards.announce('Shift over.');
    const done = run;
    setTimeout(() => { if (run === done) deps.onShiftEnd(done.shift, done.lastInst); }, 1000);
  }

  function pause() {
    if (!run || run.ended || run.paused) return;
    run.paused = true;
    V.cards.setLog(false);
    V.screens.pause(resume, quit);
  }
  function resume() {
    if (!run || !run.paused) return;
    V.screens.clear();
    run.paused = false;
    canvas.focus();
  }
  function quit() {
    if (!run || run.ended) return;
    V.screens.clear();
    run.paused = false;
    run.shift = E.scoring.quit(run.shift);
    endShift();
  }

  // ---------- Input ----------
  function onPointer(x, y, visible) {
    pointer.x = x; pointer.y = y; pointer.visible = visible;
  }

  function pointerZap(x, y) {
    E.audio.unlock();
    if (!run || run.paused || run.ended) return;
    zap(R.pick(x, y, run.packets));
  }

  function lockable() {
    return run.packets.filter(zappableOrHeld).sort((a, b) => b.t - a.t);
  }

  function cycleLock(dir) {
    const list = lockable();
    if (!list.length) { V.cards.announce('No packets in flight.'); return; }
    const idx = list.findIndex((p) => p.uid === run.lockUid);
    const next = idx === -1 ? list[0] : list[(idx + dir + list.length) % list.length];
    run.lockUid = next.uid;
    pointer.visible = false;
    announceLock(next, 'Locked');
  }

  function announceLock(inst, prefix) {
    const type = typeById.get(inst.typeId);
    const label = E.labels.build(inst, type);
    let text = prefix + ': ' + label.plain;
    if (inst.hinted) text += '. Look at the ' + E.labels.fieldName(inst.decidingField) + '.';
    V.cards.announce(text);
  }

  function action(name, ctx) {
    if (name === 'mute') { deps.toggleMute(); return true; }
    if (V.screens.isOpen()) {
      if (run && run.paused) {
        if (name === 'pause' || name === 'escape') { resume(); return true; }
        if (name === 'quit') { quit(); return true; }
        return false;
      }
      return deps.screenKey ? deps.screenKey(name) : false;
    }
    if (!run || run.ended) return false;
    if (name === 'toggleLog') { V.cards.toggleLog(); return true; }
    if (name === 'escape') {
      if (ctx.inLog || V.cards.isLogOpen()) { V.cards.setLog(false); return true; }
      pause(); return true;
    }
    if (name === 'pause') { pause(); return true; }
    if (ctx.inLog) return false;
    if (name === 'lockNext' || name === 'lockPrev') {
      if (!ctx.onCanvas) return false;
      cycleLock(name === 'lockNext' ? 1 : -1);
      return true;
    }
    if (name === 'zap') {
      if (ctx.onButton) return false;
      const inst = run.packets.find((p) => p.uid === run.lockUid);
      if (inst) zap(inst); else V.cards.announce('No packet locked. Press Tab to lock one.');
      return true;
    }
    if (name === 'letThrough') { letThrough(); return true; }
    return false;
  }

  // ---------- Draw ----------
  function draw(rdt) {
    const items = [];
    const lockedInst = run ? run.packets.find((p) => p.uid === run.lockUid) : null;
    hoverUid = null;
    if (run && !run.ended && pointer.visible) {
      const h = R.pick(pointer.x, pointer.y, run.packets);
      if (h) hoverUid = h.uid;
    }
    if (run) {
      for (const p of run.packets) {
        items.push({ inst: p, label: E.labels.build(p, typeById.get(p.typeId)), locked: p.uid === run.lockUid, hover: p.uid === hoverUid });
      }
    }
    let reticle = null;
    if (pointer.visible) reticle = { x: pointer.x, y: pointer.y, hot: hoverUid !== null };
    else if (lockedInst && E.motion.zappable(lockedInst)) { const q = R.packetPoints(lockedInst)[0]; reticle = { x: q[0], y: q[1], hot: true }; }
    R.draw({
      time, effects: fx, reduced: fx.reduced, packets: items, reticle,
      playing: !!(run && !run.ended), integrity: run ? run.shift.integrity : 100,
      waitText: run && !run.ended ? run.waitText : null
    }, rdt);
  }

  PP.views.challenge = { init, start, stop, renderHud, isRunning: () => !!(run && !run.ended) };
})(globalThis.PP);
