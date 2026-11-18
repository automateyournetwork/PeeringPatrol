'use strict';
// T008 — continuous shift scoring (contracts/rules-engine.md → PP.engine.scoring).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAll } = require('./helpers');

const PP = loadAll();
const S = PP.engine.scoring;

const P1 = { id: 1, goal_zaps: 10, clear_accuracy: 0.8, leak_cost: 10, wrong_zap_cost: 20 };
const P2 = { id: 2, goal_zaps: 10, clear_accuracy: 0.8, leak_cost: 10, wrong_zap_cost: 20 };
const E = { id: 6, goal_zaps: null, clear_accuracy: null, leak_cost: 10, wrong_zap_cost: 20, speedup_every_zaps: 10 };

function run(state, seq, phase) {
  for (const [outcome, type] of seq) state = S.apply(state, outcome, type || 't', phase);
  return state;
}
const times = (n, outcome, type) => Array.from({ length: n }, () => [outcome, type]);

test('newShift starts full and running', () => {
  const s = S.newShift(P1, 'arcade');
  assert.equal(s.integrity, 100);
  assert.equal(s.status, 'running');
  assert.equal(s.phaseId, 1);
  assert.equal(s.startPhaseId, 1);
  assert.equal(s.phaseReached, 1);
  assert.equal(s.score, 0);
  assert.equal(s.mode, 'arcade');
});

test('costs: leak costs leak_cost, wrong zap costs wrong_zap_cost (more)', () => {
  let s = S.newShift(P1, 'arcade');
  s = S.apply(s, 'leak', 'cdp', P1);
  assert.equal(s.integrity, 90);
  s = S.apply(s, 'zap-wrong', 'bgp', P1);
  assert.equal(s.integrity, 70);
  assert.ok(P1.wrong_zap_cost > P1.leak_cost);
});

test('multiplier and points', () => {
  assert.equal(S.multiplier(0), 1);
  assert.equal(S.multiplier(3), 1);
  assert.equal(S.multiplier(4), 2);
  assert.equal(S.multiplier(8), 3);
  assert.equal(S.multiplier(1000), 5);
  let s = run(S.newShift(P1, 'arcade'), times(4, 'zap-correct'), P1);
  assert.equal(s.score, 100 + 100 + 100 + 200);
  assert.equal(s.combo, 4);
  s = S.apply(s, 'delivered', 'bgp', P1);
  assert.equal(s.score, 510);
  assert.equal(s.combo, 5);
  assert.equal(s.bestCombo, 5);
});

test('incorrect decisions reset the combo but keep bestCombo', () => {
  let s = run(S.newShift(P1, 'arcade'), [...times(3, 'zap-correct'), ['leak']], P1);
  assert.equal(s.combo, 0);
  assert.equal(s.bestCombo, 3);
});

test('phase gate: 80% boundaries at the 10th correct zap', () => {
  const at = (delivered, incorrect) => run(S.newShift(P1, 'arcade'),
    [...times(delivered, 'delivered'), ...times(incorrect, 'leak'), ...times(10, 'zap-correct')], P1);
  const s79 = at(5, 4); // 15 / 19 = 0.789
  assert.equal(s79.status, 'not-cleared');
  const s80 = at(6, 4); // 16 / 20 = 0.80
  assert.equal(s80.status, 'phase-cleared');
  const s81 = at(7, 4); // 17 / 21 = 0.81
  assert.equal(s81.status, 'phase-cleared');
  assert.ok(Math.abs(S.phaseAccuracy(s80) - 0.8) < 1e-9);
});

test('9 correct zaps do not end the phase', () => {
  const s = run(S.newShift(P1, 'arcade'), times(9, 'zap-correct'), P1);
  assert.equal(s.status, 'running');
});

test('not-cleared ends the shift and freezes the state', () => {
  const s = run(S.newShift(P1, 'arcade'), [...times(5, 'leak'), ...times(10, 'zap-correct')], P1);
  assert.equal(s.status, 'not-cleared');
  const again = S.apply(s, 'zap-correct', 't', P1);
  assert.equal(again, s);
  assert.equal(S.enterPhase(s, P2), s);
});

test('integrity is checked before the goal and never goes below zero', () => {
  let s = run(S.newShift(P1, 'arcade'), [...times(9, 'zap-correct'), ...times(4, 'zap-wrong')], P1);
  assert.equal(s.integrity, 20);
  s = S.apply(s, 'zap-wrong', 'bgp', P1);
  assert.equal(s.integrity, 0);
  assert.equal(s.status, 'integrity-out');
  s = run(S.newShift(P1, 'arcade'), times(15, 'zap-wrong'), P1);
  assert.equal(s.integrity, 0);
});

test('enterPhase carries integrity, score, combo, shift counts and resets phase counts', () => {
  let s = run(S.newShift(P1, 'arcade'), [['leak', 'cdp'], ...times(10, 'zap-correct')], P1);
  assert.equal(s.status, 'phase-cleared');
  const before = s;
  s = S.enterPhase(s, P2);
  assert.equal(s.status, 'running');
  assert.equal(s.phaseId, 2);
  assert.equal(s.phaseReached, 2);
  assert.equal(s.startPhaseId, 1);
  assert.equal(s.integrity, before.integrity);
  assert.equal(s.score, before.score);
  assert.equal(s.combo, before.combo);
  assert.deepEqual(s.shiftCounts, before.shiftCounts);
  assert.deepEqual(s.phaseCounts, { zapCorrect: 0, zapWrong: 0, leak: 0, delivered: 0 });
  assert.deepEqual(s.phaseMissed, []);
  assert.deepEqual(s.shiftMissed, ['cdp']);
});

test('enterPhase on a running shift is a no-op', () => {
  const s = S.newShift(P1, 'arcade');
  assert.equal(S.enterPhase(s, P2), s);
});

test('missed and hint lists are unique and ordered; consumeHint removes one type', () => {
  let s = run(S.newShift(P1, 'arcade'), [['leak', 'cdp'], ['zap-wrong', 'bgp'], ['leak', 'cdp']], P1);
  assert.deepEqual(s.phaseMissed, ['cdp', 'bgp']);
  assert.deepEqual(s.shiftMissed, ['cdp', 'bgp']);
  assert.deepEqual(s.hintTypes, ['cdp', 'bgp']);
  s = S.consumeHint(s, 'cdp');
  assert.deepEqual(s.hintTypes, ['bgp']);
  s = S.apply(s, 'zap-correct', 'stp', P1);
  assert.deepEqual(s.hintTypes, ['bgp']);
});

test('endless: no goal, speed levels, ends only at integrity zero or quit', () => {
  let s = run(S.newShift(E, 'arcade'), times(25, 'zap-correct'), E);
  assert.equal(s.status, 'running');
  assert.equal(s.endlessCorrectZaps, 25);
  assert.equal(s.speedLevel, 2);
  s = run(s, times(10, 'leak'), E);
  assert.equal(s.status, 'integrity-out');
  const q = S.quit(S.newShift(E, 'arcade'));
  assert.equal(q.status, 'quit');
});

test('teaching-phase zaps do not count as endless zaps', () => {
  const s = run(S.newShift(P1, 'arcade'), times(9, 'zap-correct'), P1);
  assert.equal(s.endlessCorrectZaps, 0);
  assert.equal(s.speedLevel, 0);
});

test('phaseResult and shiftResult', () => {
  let s = run(S.newShift(P1, 'arcade'), [['leak', 'cdp'], ...times(10, 'zap-correct')], P1);
  const pr = S.phaseResult(s);
  assert.equal(pr.phaseId, 1);
  assert.deepEqual(pr.unlocks, [2]);
  assert.deepEqual(pr.reviewTypes, ['cdp']);
  assert.ok(Math.abs(pr.phaseAccuracy - 10 / 11) < 1e-9);
  s = run(S.enterPhase(s, P2), times(10, 'zap-wrong', 'bgp'), P2);
  assert.equal(s.status, 'integrity-out');
  const saved = { settings: { mode: 'arcade', muted: false }, unlocked: [1, 2], best: { arcade: { shiftScore: 0, endlessCorrectZaps: 0 }, practice: { shiftScore: 0, endlessCorrectZaps: 0 } } };
  const r = S.shiftResult(s, saved);
  assert.equal(r.status, 'integrity-out');
  assert.equal(r.phaseReached, 2);
  assert.equal(r.restartPhaseId, 2);
  assert.equal(r.zapped, 10);
  assert.deepEqual(r.reviewTypes, ['cdp', 'bgp']);
  assert.deepEqual(r.newRecords, ['shiftScore']);
  const high = JSON.parse(JSON.stringify(saved)); high.best.arcade.shiftScore = 1e9;
  assert.deepEqual(S.shiftResult(s, high).newRecords, []);
});

test('updateProgress unlocks phases and keeps per-mode records', () => {
  const saved = { settings: { mode: 'practice', muted: true }, unlocked: [1], best: { arcade: { shiftScore: 50, endlessCorrectZaps: 3 }, practice: { shiftScore: 0, endlessCorrectZaps: 0 } } };
  const afterPhase = S.updateProgress(saved, { phaseId: 1, unlocks: [2] });
  assert.deepEqual(afterPhase.unlocked, [1, 2]);
  assert.deepEqual(saved.unlocked, [1], 'input not mutated');
  const again = S.updateProgress(afterPhase, { phaseId: 1, unlocks: [2] });
  assert.deepEqual(again.unlocked, [1, 2]);
  const rec = S.updateProgress(afterPhase, { status: 'integrity-out', mode: 'practice', score: 900, endlessCorrectZaps: 12 });
  assert.deepEqual(rec.best.practice, { shiftScore: 900, endlessCorrectZaps: 12 });
  assert.deepEqual(rec.best.arcade, { shiftScore: 50, endlessCorrectZaps: 3 });
  const lower = S.updateProgress(rec, { status: 'quit', mode: 'practice', score: 10, endlessCorrectZaps: 1 });
  assert.deepEqual(lower.best.practice, { shiftScore: 900, endlessCorrectZaps: 12 });
});

test('scoring never takes reaction time as input', () => {
  assert.equal(S.apply.length, 4);
  const s = S.newShift(P1, 'arcade');
  for (const k of Object.keys(s)) assert.doesNotMatch(k, /time|ms|speedBonus/i);
});

// ---------- T042: practice mode grades the same as arcade ----------
test('practice and arcade shifts score, gate, and unlock identically; records are per mode', () => {
  const seq = [['delivered'], ['leak', 'cdp'], ...times(10, 'zap-correct')];
  const a = run(S.newShift(P1, 'arcade'), seq, P1);
  const p = run(S.newShift(P1, 'practice'), seq, P1);
  assert.equal(p.status, a.status);
  assert.equal(S.phaseAccuracy(p), S.phaseAccuracy(a));
  assert.deepEqual(S.phaseResult(p).unlocks, S.phaseResult(a).unlocks);
  const base = S.defaultProgress();
  const after = S.updateProgress(base, S.shiftResult(S.quit(S.enterPhase(p, P2)), base));
  assert.ok(after.best.practice.shiftScore > 0);
  assert.equal(after.best.arcade.shiftScore, 0);
});

// ---------- T055: endless with the shipped phase data ----------
test('shipped endless phase: no goal, speed levels every 10 correct zaps, records', () => {
  const endless = PP.data.phases.find((p) => p.goal_zaps === null);
  assert.ok(endless, 'endless phase exists');
  let s = run(S.newShift(endless, 'arcade'), times(endless.speedup_every_zaps * 3, 'zap-correct'), endless);
  assert.equal(s.status, 'running');
  assert.equal(s.speedLevel, 3);
  s = run(s, times(20, 'zap-wrong', 'bgp'), endless);
  assert.equal(s.status, 'integrity-out');
  const r = S.shiftResult(s, S.defaultProgress());
  assert.deepEqual(r.newRecords.sort(), ['endlessCorrectZaps', 'shiftScore']);
  assert.equal(r.endlessCorrectZaps, endless.speedup_every_zaps * 3);
});

test('a shift continues from Phase 5 into endless', () => {
  const p5 = PP.data.phases[4]; const endless = PP.data.phases[5];
  let s = run(S.newShift(p5, 'arcade'), times(10, 'zap-correct'), p5);
  assert.equal(s.status, 'phase-cleared');
  assert.deepEqual(S.phaseResult(s).unlocks, [6]);
  s = S.enterPhase(s, endless);
  assert.equal(s.phaseId, 6);
  assert.equal(s.phaseReached, 6);
  assert.equal(s.status, 'running');
});
