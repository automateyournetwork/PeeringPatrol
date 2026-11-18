// Pre-phase briefing: the concept, then "ZAP THESE" and "LET THESE THROUGH" chips.
(function (PP) {
  'use strict';
  const h = PP.views.h;

  function chips(types, cls) {
    return h('ul', { class: 'chips' }, types.map((t) => h('li', { class: 'chip ' + cls }, [t.name, h('small', { text: t.identifying })])));
  }

  // o: { phase, catalog, excluded:Set, teachingCount, carry:{integrity,score}|null, onStart }
  function render(o) {
    const { phase } = o;
    const endless = phase.goal_zaps === null;
    const byId = new Map(o.catalog.map((t) => [t.id, t]));
    const pick = (ids) => ids.filter((id) => !o.excluded.has(id)).map((id) => byId.get(id));
    const zap = pick(phase.introduces.zap);
    const ok = pick(phase.introduces.let_through);
    const body = [
      h('p', { text: phase.concept }),
      h('p', { text: phase.briefing })
    ];
    if (o.carry) body.push(h('p', { class: 'keyhint', text: 'Shift continues: integrity ' + o.carry.integrity + '%, score ' + o.carry.score.toLocaleString('en-US') + '.' }));
    if (zap.length) body.push(h('h3', { text: 'Zap these' }), chips(zap, 'bad'));
    if (ok.length) body.push(h('h3', { text: 'Let these through' }), chips(ok, 'ok'));
    return PP.views.screens.show({
      kicker: endless ? 'ENDLESS SHIFT' : 'PHASE ' + phase.id + ' OF ' + o.teachingCount,
      title: phase.title,
      body,
      actions: [{ label: endless ? 'Start endless shift' : 'Start phase ' + phase.id, primary: true, onClick: o.onStart }],
      keyhint: 'Enter / Space'
    });
  }

  PP.views.briefing = { render };
})(globalThis.PP);
