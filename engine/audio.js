// Synthesized sound effects (Web Audio, no files). Sound is never the only signal (FR-030).
(function (PP) {
  'use strict';
  let AC = null;
  let muted = false;

  function ac() {
    if (!AC) {
      try { AC = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f1, f2, d, type, v, delay) {
    if (muted) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + d);
    g.gain.setValueAtTime(v || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, v, f) {
    if (muted) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime;
    const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = a.createBufferSource(); const fl = a.createBiquadFilter(); const g = a.createGain();
    s.buffer = b; fl.type = 'lowpass';
    fl.frequency.setValueAtTime(f || 3000, t);
    fl.frequency.exponentialRampToValueAtTime(200, t + d);
    g.gain.value = v || 0.25;
    s.connect(fl).connect(g).connect(a.destination);
    s.start(t);
  }

  PP.engine.audio = {
    unlock: () => { ac(); },
    setMuted: (m) => { muted = !!m; },
    isMuted: () => muted,
    zap(combo) { const b = 1 + Math.min(combo, 14) * 0.07; tone(1500 * b, 160, 0.16, 'square', 0.09); tone(240 * b, 55, 0.28, 'sine', 0.28); noise(0.28, 0.32, 4000); },
    combo() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, f * 1.01, 0.12, 'triangle', 0.12, i * 0.06)); },
    wrong() { tone(170, 80, 0.4, 'sawtooth', 0.16); tone(120, 60, 0.4, 'square', 0.08, 0.06); },
    leak() { tone(120, 45, 0.35, 'sine', 0.3); noise(0.18, 0.1, 600); },
    delivered() { tone(880, 880, 0.05, 'sine', 0.03); },
    phase() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.13, i * 0.08)); },
    speedup() { [660, 880].forEach((f, i) => tone(f, f * 1.02, 0.12, 'triangle', 0.1, i * 0.07)); },
    over() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.3, 'triangle', 0.15, i * 0.16)); }
  };
})(globalThis.PP);
