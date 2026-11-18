// Feedback cards: bottom-left stack (max 3, fading after 6.5 s) + the collapsible shift log
// that keeps every card of the shift (spec FR-011a, FR-043). Also the ordered live announcer.
(function (PP) {
  'use strict';
  const h = PP.views.h;
  const MAX_VISIBLE = 3;
  const LIFETIME_MS = 6500;
  const $ = (id) => document.getElementById(id);

  function cardEl(card) {
    return h('li', { class: 'fcard ' + card.kind }, [
      h('div', {}, [h('span', { class: 'ttl', text: card.tag + ' ' + card.name }), h('span', { class: 'field', text: card.field })]),
      h('p', { class: 'body', text: card.body }),
      h('p', { class: 'fix' }, [h('b', { text: card.fixLabel + ' ' }), card.fix]),
      h('p', { class: 'real', text: card.realWorld }),
      card.note ? h('p', { class: 'note', text: card.note }) : null
    ]);
  }

  function removeLater(el, delay) {
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 650); }, delay);
  }

  function add(card) {
    const stack = $('cards');
    const el = cardEl(card);
    stack.prepend(el);
    const live = [...stack.children].filter((c) => !c.classList.contains('out'));
    live.slice(MAX_VISIBLE).forEach((old) => removeLater(old, 0));
    removeLater(el, LIFETIME_MS);
    $('log-list').prepend(cardEl(card));
    announce(card.tag + ' ' + card.name + '. ' + PP.engine.feedback.firstSentence(card.body));
  }

  function clear() {
    $('cards').replaceChildren();
    $('log-list').replaceChildren();
  }

  function setLog(open) {
    const log = $('log');
    log.classList.toggle('collapsed', !open);
    log.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) { log.removeAttribute('inert'); $('log-list').focus(); }
    else { log.setAttribute('inert', ''); const c = document.getElementById('playfield'); if (c) c.focus(); }
  }
  const isLogOpen = () => !$('log').classList.contains('collapsed');
  const toggleLog = () => setLog(!isLogOpen());

  function announce(text) {
    const live = $('live');
    live.appendChild(h('p', { text }));
    while (live.childElementCount > 6) live.firstChild.remove();
  }

  function init() { $('log').setAttribute('inert', ''); }

  PP.views.cards = { init, add, clear, setLog, toggleLog, isLogOpen, announce, cardEl };
})(globalThis.PP);
