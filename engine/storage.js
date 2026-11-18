// Safe persistence for settings, unlocked phases, and bests (research.md R12).
// Every access is wrapped: the game works with storage blocked (private mode, file:// quirks).
(function (PP) {
  'use strict';
  const KEY = 'peeringPatrol.v1';
  let memory = null;

  function sanitize(raw) {
    const d = PP.engine.scoring.defaultProgress();
    if (!raw || typeof raw !== 'object') return d;
    const s = raw.settings || {};
    d.settings.mode = s.mode === 'practice' ? 'practice' : 'arcade';
    d.settings.muted = s.muted === true;
    if (Array.isArray(raw.unlocked)) {
      const set = new Set([1].concat(raw.unlocked.filter((n) => Number.isInteger(n) && n >= 1 && n <= 6)));
      d.unlocked = [...set].sort((a, b) => a - b);
    }
    for (const mode of ['arcade', 'practice']) {
      const b = raw.best && raw.best[mode];
      if (b) {
        const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
        d.best[mode] = { shiftScore: num(b.shiftScore), endlessCorrectZaps: num(b.endlessCorrectZaps) };
      }
    }
    return d;
  }

  function load() {
    try {
      const raw = globalThis.localStorage && globalThis.localStorage.getItem(KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (e) { /* blocked or corrupt: fall back */ }
    return sanitize(memory);
  }

  function save(progress) {
    memory = JSON.parse(JSON.stringify(progress));
    try {
      if (globalThis.localStorage) globalThis.localStorage.setItem(KEY, JSON.stringify(progress));
    } catch (e) { /* keep the in-memory copy */ }
  }

  PP.engine.storage = { KEY, load, save, sanitize };
})(globalThis.PP);
