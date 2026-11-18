// Continuous-shift scoring. Pure and immutable: every function returns a new state.
// Contract: specs/001-peering-patrol-game/contracts/rules-engine.md → PP.engine.scoring
// Model: data-model.md → ShiftState, PhaseResult, ShiftResult, SavedProgress.
(function (PP) {
  'use strict';

  const START_INTEGRITY = 100;
  const ZAP_POINTS = 100;
  const DELIVERED_POINTS = 10;
  const MAX_MULTIPLIER = 5;
  const zeroCounts = () => ({ zapCorrect: 0, zapWrong: 0, leak: 0, delivered: 0 });
  const isEndless = (phase) => phase.goal_zaps === null || phase.goal_zaps === undefined;

  function multiplier(combo) {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 4));
  }

  function newShift(startPhase, mode) {
    return {
      mode: mode === 'practice' ? 'practice' : 'arcade',
      startPhaseId: startPhase.id,
      phaseId: startPhase.id,
      phaseReached: startPhase.id,
      integrity: START_INTEGRITY,
      score: 0,
      combo: 0,
      bestCombo: 0,
      phaseCounts: zeroCounts(),
      shiftCounts: zeroCounts(),
      endlessCorrectZaps: 0,
      speedLevel: 0,
      phaseMissed: [],
      shiftMissed: [],
      hintTypes: [],
      status: 'running'
    };
  }

  function accuracyOf(c) {
    const total = c.zapCorrect + c.delivered + c.zapWrong + c.leak;
    return total === 0 ? 1 : (c.zapCorrect + c.delivered) / total;
  }
  const phaseAccuracy = (s) => accuracyOf(s.phaseCounts);
  const shiftAccuracy = (s) => accuracyOf(s.shiftCounts);
  const addUnique = (list, id) => (list.includes(id) ? list : list.concat(id));
  const COUNT_KEY = { 'zap-correct': 'zapCorrect', 'zap-wrong': 'zapWrong', leak: 'leak', delivered: 'delivered' };

  function apply(state, outcome, typeId, phase) {
    if (state.status !== 'running') return state;
    const key = COUNT_KEY[outcome];
    if (!key) throw new Error('Unknown outcome: ' + outcome);
    const s = Object.assign({}, state, {
      phaseCounts: Object.assign({}, state.phaseCounts),
      shiftCounts: Object.assign({}, state.shiftCounts)
    });
    s.phaseCounts[key] += 1;
    s.shiftCounts[key] += 1;
    const correct = outcome === 'zap-correct' || outcome === 'delivered';
    if (correct) {
      s.combo = state.combo + 1;
      s.bestCombo = Math.max(state.bestCombo, s.combo);
      s.score = state.score + (outcome === 'zap-correct' ? ZAP_POINTS * multiplier(s.combo) : DELIVERED_POINTS);
    } else {
      s.combo = 0;
      const cost = outcome === 'zap-wrong' ? phase.wrong_zap_cost : phase.leak_cost;
      s.integrity = Math.max(0, state.integrity - cost);
      s.phaseMissed = addUnique(state.phaseMissed, typeId);
      s.shiftMissed = addUnique(state.shiftMissed, typeId);
      s.hintTypes = addUnique(state.hintTypes, typeId);
    }
    if (isEndless(phase)) {
      if (outcome === 'zap-correct') s.endlessCorrectZaps = state.endlessCorrectZaps + 1;
      const every = phase.speedup_every_zaps || 10;
      s.speedLevel = Math.floor(s.endlessCorrectZaps / every);
    }
    // Integrity is checked before the goal (contract invariant 3).
    if (s.integrity <= 0) {
      s.status = 'integrity-out';
    } else if (!isEndless(phase) && outcome === 'zap-correct' && s.phaseCounts.zapCorrect >= phase.goal_zaps) {
      s.status = phaseAccuracy(s) >= phase.clear_accuracy ? 'phase-cleared' : 'not-cleared';
    }
    return s;
  }

  function enterPhase(state, nextPhase) {
    if (state.status !== 'phase-cleared') return state;
    return Object.assign({}, state, {
      phaseId: nextPhase.id,
      phaseReached: Math.max(state.phaseReached, nextPhase.id),
      phaseCounts: zeroCounts(),
      phaseMissed: [],
      status: 'running'
    });
  }

  function consumeHint(state, typeId) {
    if (!state.hintTypes.includes(typeId)) return state;
    return Object.assign({}, state, { hintTypes: state.hintTypes.filter((t) => t !== typeId) });
  }

  function quit(state) {
    if (state.status !== 'running') return state;
    return Object.assign({}, state, { status: 'quit' });
  }

  function phaseResult(state) {
    return {
      phaseId: state.phaseId,
      score: state.score,
      phaseAccuracy: phaseAccuracy(state),
      bestCombo: state.bestCombo,
      integrity: state.integrity,
      reviewTypes: state.phaseMissed.slice(),
      unlocks: state.status === 'phase-cleared' ? [state.phaseId + 1] : []
    };
  }

  function shiftResult(state, saved) {
    const best = (saved && saved.best && saved.best[state.mode]) || { shiftScore: 0, endlessCorrectZaps: 0 };
    const newRecords = [];
    if (state.score > 0 && state.score > best.shiftScore) newRecords.push('shiftScore');
    if (state.endlessCorrectZaps > 0 && state.endlessCorrectZaps > best.endlessCorrectZaps) newRecords.push('endlessCorrectZaps');
    return {
      status: state.status,
      mode: state.mode,
      startPhaseId: state.startPhaseId,
      phaseReached: state.phaseReached,
      phaseId: state.phaseId,
      score: state.score,
      zapped: state.shiftCounts.zapCorrect,
      accuracy: shiftAccuracy(state),
      phaseAccuracy: phaseAccuracy(state),
      bestCombo: state.bestCombo,
      integrity: state.integrity,
      endlessCorrectZaps: state.endlessCorrectZaps,
      reviewTypes: state.shiftMissed.slice(),
      restartPhaseId: state.phaseReached,
      newRecords
    };
  }

  function defaultProgress() {
    return {
      settings: { mode: 'arcade', muted: false },
      unlocked: [1],
      best: { arcade: { shiftScore: 0, endlessCorrectZaps: 0 }, practice: { shiftScore: 0, endlessCorrectZaps: 0 } }
    };
  }

  function updateProgress(saved, event) {
    const next = JSON.parse(JSON.stringify(saved || defaultProgress()));
    if (event && event.status) {
      const mode = event.mode === 'practice' ? 'practice' : 'arcade';
      const b = next.best[mode] || { shiftScore: 0, endlessCorrectZaps: 0 };
      next.best[mode] = {
        shiftScore: Math.max(b.shiftScore, event.score || 0),
        endlessCorrectZaps: Math.max(b.endlessCorrectZaps, event.endlessCorrectZaps || 0)
      };
    } else if (event && event.unlocks) {
      const set = new Set(next.unlocked.concat(event.unlocks, [1]));
      next.unlocked = [...set].filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b);
    }
    return next;
  }

  PP.engine.scoring = {
    START_INTEGRITY, multiplier, newShift, apply, phaseAccuracy, shiftAccuracy, enterPhase,
    consumeHint, quit, phaseResult, shiftResult, updateProgress, defaultProgress
  };
})(globalThis.PP);
