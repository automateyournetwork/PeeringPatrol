// Phase summary (continue the shift) and shift summary (restart from the phase reached).
(function (PP) {
  'use strict';
  const h = PP.views.h;
  const pct = (x) => Math.round(x * 100) + '%';

  const stat = (label, value, record) => h('div', { class: 'stat' }, [
    h('div', { class: 'lbl', text: label }), h('div', { class: 'val', text: String(value) }),
    record ? h('div', { class: 'rec', text: '★ new record' }) : null
  ]);

  function review(cards) {
    if (!cards.length) return [h('p', { text: 'Nothing to review: every decision was correct.' })];
    return [h('h3', { text: 'Review these' }), h('ul', { class: 'review' }, cards.map((c) => PP.views.cards.cardEl(c)))];
  }

  // o: { result (PhaseResult), phase, next, reviewCards, onContinue, onMenu }
  function phase(o) {
    const r = o.result;
    return PP.views.screens.show({
      kicker: 'PHASE ' + r.phaseId + ' CLEARED', title: 'LAN CLEAN!', titleClass: 'good', wide: true,
      body: [
        h('p', { text: o.phase.title + ' is cleared. ' + (o.next ? 'The shift continues with your integrity, score, and combo.' : 'More phases are coming.') }),
        h('div', { class: 'stats' }, [
          stat('Score', r.score.toLocaleString('en-US')),
          stat('Phase accuracy', pct(r.phaseAccuracy) + ' (80% needed)'),
          stat('Best combo', r.bestCombo),
          stat('Integrity', r.integrity + '%')
        ]),
        ...review(o.reviewCards)
      ],
      actions: [
        { label: o.next ? 'Continue shift' : 'More phases coming', primary: true, disabled: !o.next, onClick: o.onContinue },
        { label: 'Menu', onClick: o.onMenu }
      ],
      keyhint: 'Enter / Space'
    });
  }

  const HEAD = {
    'not-cleared': (r) => ({ title: 'Phase not cleared', cls: 'bad', text: 'You reached 10 correct zaps, but accuracy was ' + pct(r.phaseAccuracy) + ' of the 80% needed. The bar stays the same: read the review below and try again.' }),
    'integrity-out': () => ({ title: 'LAN integrity lost', cls: 'bad', text: 'Too many leaks and wrong zaps. The review below explains each one.' }),
    quit: () => ({ title: 'Shift ended', cls: '', text: 'You ended the shift. Unlocked phases stay unlocked.' })
  };

  // o: { result (ShiftResult), restartPhase, reviewCards, onRestart, onMenu }
  function shift(o) {
    const r = o.result;
    const head = (HEAD[r.status] || HEAD.quit)(r);
    const rec = new Set(r.newRecords);
    const tiles = [
      stat('Score', r.score.toLocaleString('en-US'), rec.has('shiftScore')),
      stat('Phase reached', r.phaseReached >= 6 ? 'Endless' : r.phaseReached),
      stat('Packets zapped', r.zapped),
      stat('Best combo', r.bestCombo),
      stat('Accuracy', pct(r.accuracy))
    ];
    if (r.endlessCorrectZaps > 0 || rec.has('endlessCorrectZaps')) tiles.push(stat('Endless zaps', r.endlessCorrectZaps, rec.has('endlessCorrectZaps')));
    const restartLabel = r.restartPhaseId >= 6 || (o.restartPhase && o.restartPhase.goal_zaps === null) ? 'Restart endless (R)' : 'Restart from phase ' + r.restartPhaseId + ' (R)';
    return PP.views.screens.show({
      kicker: 'SHIFT OVER', title: head.title, titleClass: head.cls, wide: true,
      body: [h('p', { text: head.text }), h('div', { class: 'stats' }, tiles), ...review(o.reviewCards)],
      actions: [{ label: restartLabel, primary: true, onClick: o.onRestart }, { label: 'Menu', onClick: o.onMenu }],
      keyhint: 'Enter / Space'
    });
  }

  PP.views.summary = { phase, shift };
})(globalThis.PP);
