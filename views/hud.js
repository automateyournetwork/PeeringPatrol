// Fixed top bar: phase, integrity (bar + percentage), score, combo, goal, mode, log and sound buttons.
(function (PP) {
  'use strict';
  const h = PP.views.h;
  let els = null;
  let lastMult = 1;

  function build(handlers) {
    const hud = document.getElementById('hud');
    els = {
      phase: h('div', { class: 'val small' }),
      bar: h('span'),
      hp: h('span', { class: 'hp-text' }),
      score: h('div', { class: 'val' }),
      combo: h('span', { class: 'combo' }),
      goalText: h('div', { class: 'val small' }),
      goalBar: h('span'),
      goalLbl: h('div', { class: 'lbl', text: 'Phase goal' }),
      mode: h('span', { class: 'mode-tag' }),
      log: h('button', { class: 'hud-btn', type: 'button', onclick: handlers.onLog, text: 'Log (F)' }),
      sound: h('button', { class: 'hud-btn', type: 'button', onclick: handlers.onMute })
    };
    hud.replaceChildren(
      h('div', { class: 'hud-item' }, [h('div', { class: 'lbl', text: 'Phase' }), els.phase]),
      h('div', { class: 'hud-item' }, [h('div', { class: 'lbl', text: 'LAN integrity' }), h('div', { class: 'hp-row' }, [h('div', { class: 'bar', role: 'presentation' }, els.bar), els.hp])]),
      h('div', { class: 'hud-item' }, [h('div', { class: 'lbl', text: 'Score' }), els.score]),
      h('div', { class: 'hud-item' }, [h('div', { class: 'lbl', text: 'Combo' }), h('div', { class: 'val' }, els.combo)]),
      h('div', { class: 'hud-item' }, [els.goalLbl, els.goalText, h('div', { class: 'bar goal', role: 'presentation' }, els.goalBar)]),
      h('div', { class: 'hud-item' }, [h('div', { class: 'lbl', text: 'Mode' }), els.mode]),
      h('div', { class: 'hud-buttons' }, [els.log, els.sound])
    );
  }

  function integrityBackground(v) {
    if (v > 60) return 'linear-gradient(90deg, var(--green), var(--cyan))';
    if (v > 30) return 'linear-gradient(90deg, var(--yellow), #ff9a3d)';
    return 'linear-gradient(90deg, var(--red), var(--magenta))';
  }

  // s: { phase, shift, multiplier, muted, endless, speedLevel }
  function render(s) {
    if (!els) return;
    const { phase, shift } = s;
    els.phase.textContent = (phase.goal_zaps === null ? '∞' : phase.id) + ' · ' + phase.title;
    els.bar.style.width = shift.integrity + '%';
    els.bar.style.background = integrityBackground(shift.integrity);
    els.hp.textContent = shift.integrity + '%';
    els.score.textContent = shift.score.toLocaleString('en-US');
    els.combo.textContent = 'x' + s.multiplier + (shift.combo > 1 ? ' (' + shift.combo + ')' : '');
    if (s.multiplier > lastMult) { els.combo.classList.add('pop'); setTimeout(() => els.combo.classList.remove('pop'), 120); }
    lastMult = s.multiplier;
    if (phase.goal_zaps === null) {
      els.goalLbl.textContent = 'Endless';
      els.goalText.textContent = shift.endlessCorrectZaps + ' zaps · speed ' + (shift.speedLevel + 1);
      els.goalBar.style.width = '100%';
    } else {
      els.goalLbl.textContent = 'Phase goal';
      els.goalText.textContent = shift.phaseCounts.zapCorrect + ' / ' + phase.goal_zaps + ' · ' + Math.round(PP.engine.scoring.phaseAccuracy(shift) * 100) + '% acc';
      els.goalBar.style.width = Math.min(100, (shift.phaseCounts.zapCorrect / phase.goal_zaps) * 100) + '%';
    }
    els.mode.textContent = shift.mode === 'practice' ? 'Practice' : 'Arcade';
    els.sound.textContent = 'M · sound ' + (s.muted ? 'off' : 'on');
    els.sound.setAttribute('aria-pressed', s.muted ? 'true' : 'false');
  }

  function clear() { document.getElementById('hud').replaceChildren(); els = null; lastMult = 1; }

  PP.views.hud = { build, render, clear };
})(globalThis.PP);
