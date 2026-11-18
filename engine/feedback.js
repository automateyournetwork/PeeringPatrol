// Feedback — builds card text from catalog copy and the packet instance. Pure.
// Spec: FR-004 (transparency note), FR-011–FR-013, FR-026 (real-world response), FR-043.
(function (PP) {
  'use strict';
  const fill = (s, ctx) => PP.engine.spawner.fill(s, ctx);

  const NOTE = 'Verified by the project owner against IX.br policy; official citation pending.';
  const REAL_FORBIDDEN = 'In real life the IX does not zap packets: it filters this traffic at the port, contacts the member, or moves the port to quarantine until it is fixed.';
  const REAL_ALLOWED = 'In real life an IX never filters this traffic: dropping it would break the members\' peering.';
  const TAGS = { 'zap-correct': 'ZAPPED', leak: 'LEAK!', 'zap-wrong': 'THAT WAS LEGIT', delivered: 'DELIVERED' };
  const BODY = { 'zap-correct': 'zapped', leak: 'leaked', 'zap-wrong': 'wrong_zap', delivered: 'delivered' };

  function buildCard(outcome, type, instance) {
    const ctx = instance.ctx;
    const good = outcome === 'zap-correct' || outcome === 'delivered';
    const forbidden = type.verdict === 'forbidden';
    return {
      kind: good ? 'good' : 'bad',
      outcome,
      tag: TAGS[outcome],
      name: type.name,
      field: PP.engine.labels.formatField(instance.decidingField, instance.fields),
      body: fill(type.feedback[BODY[outcome]], ctx),
      fixLabel: forbidden ? 'Fix:' : 'Why it must pass:',
      fix: fill(type.fix, ctx),
      realWorld: forbidden ? REAL_FORBIDDEN : REAL_ALLOWED,
      note: type.source_status === 'owner-confirmed' ? NOTE : null
    };
  }

  // A summary entry for a type the player leaked or misjudged ("review these").
  function reviewEntry(type, instance) {
    const outcome = type.verdict === 'forbidden' ? 'leak' : 'zap-wrong';
    const card = buildCard(outcome, type, instance);
    card.body = fill(type.verdict === 'forbidden' ? type.feedback.zapped : type.feedback.wrong_zap, instance.ctx);
    card.tag = type.verdict === 'forbidden' ? 'ZAP THIS' : 'LET THIS THROUGH';
    return card;
  }

  function firstSentence(text) {
    const m = /^(.+?[.!?])(\s|$)/.exec(text);
    return m ? m[1] : text;
  }

  PP.engine.feedback = { NOTE, REAL_FORBIDDEN, REAL_ALLOWED, buildCard, reviewEntry, firstSentence };
})(globalThis.PP);
