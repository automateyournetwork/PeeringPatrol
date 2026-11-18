// Overlay cards (menus, briefings, summaries, loading, error, empty, pause) with a focus trap.
(function (PP) {
  'use strict';

  // Safe DOM builder: text is always set with textContent (no HTML injection from data).
  function h(tag, props, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children || [])) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  const root = () => document.getElementById('screens');
  let trapHandler = null;

  function clear() {
    root().replaceChildren();
    if (trapHandler) { document.removeEventListener('keydown', trapHandler, true); trapHandler = null; }
  }
  const isOpen = () => root().childElementCount > 0;

  // actions: [{ label, onClick, primary, disabled, hint }]
  function show(opts) {
    clear();
    const actions = (opts.actions || []).map((a) => h('button', {
      class: a.primary ? 'btn' : 'btn secondary', type: 'button', disabled: a.disabled ? true : null, onclick: a.onClick
    }, a.label));
    const hint = opts.keyhint ? h('span', { class: 'keyhint', text: opts.keyhint }) : null;
    const card = h('div', { class: 'card' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'screen-title' }, [
      opts.kicker ? h('div', { class: 'kick', text: opts.kicker }) : null,
      opts.h1 ? h('h1', { id: 'screen-title', text: opts.h1 }) : h('h2', { id: 'screen-title', class: opts.titleClass, text: opts.title }),
      ...(opts.body || []),
      actions.length || hint ? h('div', { class: 'actions' }, [...actions, hint]) : null
    ]);
    root().appendChild(card);
    trapHandler = (e) => {
      if (e.key !== 'Tab') return;
      const focusables = [...card.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusables.length) return;
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!card.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapHandler, true);
    const primary = actions.find((b, i) => opts.actions[i].primary && !opts.actions[i].disabled) || actions.find((b) => !b.disabled);
    setTimeout(() => { (opts.focus || primary || card).focus(); }, 30);
    return card;
  }

  const loading = () => show({ kicker: 'IX NOC', title: 'Loading the peering LAN…', body: [h('p', { text: 'Checking the packet catalog.' })] });

  function error(errors) {
    return show({
      kicker: 'CONTENT ERROR', title: 'Game content failed to load', titleClass: 'bad', wide: true,
      body: [
        h('p', { text: 'The game will not start with content it cannot verify. Fix these problems in the data files and reload:' }),
        h('ul', { class: 'errors' }, errors.slice(0, 40).map((m) => h('li', { text: m })))
      ],
      actions: [{ label: 'Reload', primary: true, onClick: () => globalThis.location.reload() }]
    });
  }

  function empty(phase, onBack) {
    return show({
      kicker: 'PHASE ' + phase.id, title: 'This phase\'s content is under review',
      body: [h('p', { text: 'Its packet types are held back until their sources are confirmed, so this phase cannot be played yet.' })],
      actions: [{ label: 'Back to menu', primary: true, onClick: onBack }]
    });
  }

  function pause(onResume, onQuit) {
    return show({
      kicker: 'PAUSED', title: 'Shift paused',
      body: [h('p', { text: 'Packets are frozen. Resume when you are ready, or end the shift to see your summary.' })],
      actions: [{ label: 'Resume (P)', primary: true, onClick: onResume }, { label: 'End shift (Q)', onClick: onQuit }]
    });
  }

  PP.views.h = h;
  PP.views.screens = { show, clear, isOpen, loading, error, empty, pause };
})(globalThis.PP);
