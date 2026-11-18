// Seedable PRNG (mulberry32) so spawns are reproducible in tests and with ?seed= (research.md R8).
(function (PP) {
  'use strict';
  function createRng(seed) {
    let a = (seed >>> 0) || 1;
    const rng = {
      next() {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(n) { return Math.floor(rng.next() * n); },
      pick(arr) { return arr[rng.int(arr.length)]; }
    };
    return rng;
  }
  function seedFromLocation() {
    try {
      const m = /[?&]seed=(\d+)/.exec(globalThis.location ? globalThis.location.search : '');
      if (m) return Number(m[1]);
    } catch (e) { /* no location */ }
    return null;
  }
  PP.engine.rng = { createRng, seedFromLocation };
})(globalThis.PP);
