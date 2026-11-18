// Peering Patrol bootstrap and screen state machine (data-model.md → Screens).
// loading → (error | menu) → briefing → play → phase summary → briefing … → shift summary → menu
(function (PP) {
  'use strict';
  const E = PP.engine;
  const V = PP.views;
  const S = {
    saved: null, excluded: new Set(), emptyPhases: new Set(), shift: null, phase: null, onRestartKey: null
  };
  const phases = () => PP.data.phases;
  const phaseById = (id) => phases().find((p) => p.id === id) || null;
  const typeById = (id) => PP.data.packets.find((t) => t.id === id);
  const save = () => E.storage.save(S.saved);

  function boot() {
    V.cards.init();
    V.screens.loading();
    let result;
    try {
      result = E.validate.validateAll(PP.data, E);
    } catch (e) {
      result = { ok: false, errors: ['Unexpected error while checking the content: ' + e.message] };
    }
    if (!result.ok) { V.screens.error(result.errors); return; }
    S.excluded = new Set(result.excludedTypes.map((x) => x.id));
    S.emptyPhases = new Set(result.emptyPhases);
    if (result.excludedTypes.length && globalThis.console) {
      console.warn('Peering Patrol: packet types held back from play:', result.excludedTypes);
    }
    S.saved = E.storage.load();
    E.audio.setMuted(S.saved.settings.muted);
    V.challenge.init({
      catalog: PP.data.packets,
      lan: PP.data.lan,
      excluded: [...S.excluded],
      onPhaseCleared,
      onShiftEnd,
      toggleMute,
      isMuted: () => E.audio.isMuted(),
      screenKey
    });
    menu();
  }

  function toggleMute() {
    S.saved.settings.muted = !S.saved.settings.muted;
    E.audio.setMuted(S.saved.settings.muted);
    save();
    V.challenge.renderHud();
    V.cards.announce('Sound ' + (S.saved.settings.muted ? 'off' : 'on') + '.');
  }

  function screenKey(name) {
    if (name === 'restart' && S.onRestartKey) { S.onRestartKey(); return true; }
    return false;
  }

  function menu() {
    S.onRestartKey = null;
    V.challenge.stop();
    V.hud.clear();
    S.shift = null;
    V.menu.render({
      saved: S.saved,
      phases: phases(),
      emptyPhases: [...S.emptyPhases],
      onStart: startShift,
      onMode: (mode) => { S.saved.settings.mode = mode; save(); menu(); }
    });
  }

  function startShift(phaseId) {
    E.audio.unlock();
    S.onRestartKey = null;
    const phase = phaseById(phaseId);
    if (!phase || !S.saved.unlocked.includes(phaseId)) { menu(); return; }
    if (S.emptyPhases.has(phase.id)) { V.screens.empty(phase, menu); return; }
    V.challenge.stop();
    V.cards.clear();
    S.shift = E.scoring.newShift(phase, S.saved.settings.mode);
    S.lastInst = {};
    brief(phase, null);
  }

  function brief(phase, carry) {
    S.phase = phase;
    V.briefing.render({
      phase,
      catalog: PP.data.packets,
      excluded: S.excluded,
      teachingCount: phases().filter((p) => p.goal_zaps !== null).length,
      carry,
      onStart: () => {
        V.screens.clear();
        V.challenge.start({ phase, shift: S.shift, lastInst: S.lastInst });
      }
    });
  }

  function reviewCards(typeIds, lastInst) {
    return typeIds.filter((id) => lastInst[id] && typeById(id)).map((id) => E.feedback.reviewEntry(typeById(id), lastInst[id]));
  }

  function onPhaseCleared(shift, lastInst) {
    S.shift = shift;
    S.lastInst = lastInst;
    const pr = E.scoring.phaseResult(shift);
    S.saved = E.scoring.updateProgress(S.saved, pr);
    save();
    V.challenge.stop();
    const next = phaseById(shift.phaseId + 1);
    const playableNext = next && !S.emptyPhases.has(next.id) ? next : null;
    V.summary.phase({
      result: pr,
      phase: phaseById(shift.phaseId),
      next: playableNext,
      reviewCards: reviewCards(pr.reviewTypes, lastInst),
      onContinue: () => {
        S.shift = E.scoring.enterPhase(shift, playableNext);
        brief(playableNext, { integrity: shift.integrity, score: shift.score });
      },
      onMenu: () => {
        const sr = E.scoring.shiftResult(Object.assign({}, shift, { status: 'quit' }), S.saved);
        S.saved = E.scoring.updateProgress(S.saved, sr);
        save();
        menu();
      }
    });
  }

  function onShiftEnd(shift, lastInst) {
    V.challenge.stop();
    const sr = E.scoring.shiftResult(shift, S.saved);
    S.saved = E.scoring.updateProgress(S.saved, sr);
    save();
    const restart = () => startShift(sr.restartPhaseId);
    S.onRestartKey = restart;
    V.summary.shift({
      result: sr,
      restartPhase: phaseById(sr.restartPhaseId),
      reviewCards: reviewCards(sr.reviewTypes, lastInst),
      onRestart: restart,
      onMenu: menu
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(globalThis.PP);
