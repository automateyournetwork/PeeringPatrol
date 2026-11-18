// Input: pointer hit-testing and the key map (contracts/ui-controls.md → Input map).
// Emits abstract actions; the challenge decides what they mean in the current context.
(function (PP) {
  'use strict';
  const KEYS = {
    Tab: 'lockNext', ArrowRight: 'lockNext', ArrowDown: 'lockNext',
    ArrowLeft: 'lockPrev', ArrowUp: 'lockPrev',
    ' ': 'zap', l: 'letThrough', f: 'toggleLog', Escape: 'escape', p: 'pause', q: 'quit', m: 'mute', r: 'restart'
  };

  function createInput(canvas, handlers) {
    canvas.addEventListener('pointermove', (e) => handlers.pointer(e.clientX, e.clientY, true));
    canvas.addEventListener('pointerleave', () => handlers.pointer(-100, -100, false));
    canvas.addEventListener('pointerdown', (e) => { handlers.pointer(e.clientX, e.clientY, true); handlers.pointerZap(e.clientX, e.clientY); });

    globalThis.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let action = KEYS[key];
      if (!action) return;
      if (key === 'Tab' && e.shiftKey) action = 'lockPrev';
      const active = document.activeElement;
      const ctx = {
        onCanvas: active === canvas || active === document.body || active === null,
        inLog: !!(active && active.closest && active.closest('#log')),
        inScreens: !!(active && active.closest && active.closest('#screens')),
        onButton: !!(active && (active.tagName === 'BUTTON' || active.tagName === 'A'))
      };
      if (handlers.action(action, ctx, e)) e.preventDefault();
    });
  }

  PP.engine.input = { createInput, KEYS };
})(globalThis.PP);
