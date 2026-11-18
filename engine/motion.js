// Packet motion: member → LAN (inbound, zappable), then LAN → one peer or all others (outbound).
// t runs 0 → 1 inbound and 1 → 2 outbound. Practice mode holds packets just before the LAN.
(function (PP) {
  'use strict';
  const HOLD_T = 0.86;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function positionsAt(inst, t, L) {
    const a = L.routers[inst.src];
    if (t < 1) {
      const e = ease(Math.max(0, t));
      return [[a.x + (L.cx - a.x) * e, a.y + (L.cy - a.y) * e]];
    }
    const e = ease(Math.min(1, t - 1));
    return inst.targets.map((slot) => {
      const r = L.routers[slot];
      return [L.cx + (r.x - L.cx) * e, L.cy + (r.y - L.cy) * e];
    });
  }

  const positions = (inst, L) => positionsAt(inst, inst.t, L);
  const zappable = (inst) => inst.state === 'inbound' && !inst.graded;

  // Advances one packet; returns 'held' | 'reached-lan' | 'arrived' | null.
  function advance(inst, dt, mode) {
    if (inst.held) return null;
    const prev = inst.t;
    inst.t = prev + dt / inst.dur;
    if (mode === 'practice' && !inst.graded && prev < HOLD_T && inst.t >= HOLD_T) {
      inst.t = HOLD_T;
      inst.held = true;
      return 'held';
    }
    if (prev < 1 && inst.t >= 1) {
      inst.state = 'outbound';
      return 'reached-lan';
    }
    if (inst.t >= 2) {
      inst.t = 2;
      inst.state = 'arrived';
      return 'arrived';
    }
    return null;
  }

  function release(inst) {
    inst.held = false;
    inst.graded = true;
  }

  PP.engine.motion = { HOLD_T, ease, positions, positionsAt, zappable, advance, release };
})(globalThis.PP);
