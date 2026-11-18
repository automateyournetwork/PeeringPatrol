'use strict';
// T009 — data schemas (data-model.md) and validation rules 1–7 (engine/validate.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAll, byId } = require('./helpers');

const PP = loadAll();
const R = PP.engine.rules;
const V = PP.engine.validate;
const { lan, packets, phases } = PP.data;
const clone = (o) => JSON.parse(JSON.stringify(o));
const uniq = (arr) => new Set(arr).size === arr.length;

test('LAN schema', () => {
  assert.equal(lan.ipv4_subnet, '203.0.113.0/24');
  assert.equal(lan.ipv6_prefix, '2001:db8:12::/64');
  assert.equal(lan.members.length, 8);
  for (const k of ['asn', 'ipv4', 'ipv6', 'll', 'mac', 'slot']) assert.ok(uniq(lan.members.map((m) => m[k])), `unique ${k}`);
  for (const m of lan.members) {
    assert.ok(m.asn >= 64496 && m.asn <= 64503, `asn ${m.asn}`);
    assert.ok(R.inSubnet(m.ipv4, lan.ipv4_subnet), m.ipv4);
    assert.ok(R.inPrefix(m.ipv6, lan.ipv6_prefix), m.ipv6);
    assert.ok(R.inPrefix(m.ll, 'fe80::/10'), m.ll);
    assert.equal(R.isGroupMac(m.mac), false, m.mac);
    assert.ok(Number.isInteger(m.slot) && m.slot >= 0 && m.slot <= 7);
  }
  for (const key of ['remote_examples', 'outside_examples']) {
    assert.ok(lan[key].ipv4.length > 0 && lan[key].ipv6.length > 0, key);
    for (const a of lan[key].ipv4) assert.equal(R.inSubnet(a, lan.ipv4_subnet), false, `${key} ${a}`);
    for (const a of lan[key].ipv6) assert.equal(R.inPrefix(a, lan.ipv6_prefix), false, `${key} ${a}`);
  }
});

test('packet schema', () => {
  assert.ok(uniq(packets.map((p) => p.id)), 'unique ids');
  const ids = byId(PP);
  for (const p of packets) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(typeof p.name === 'string' && p.name.length > 0, `${p.id} name`);
    assert.ok(['allowed', 'forbidden'].includes(p.verdict), `${p.id} verdict`);
    assert.ok(Number.isInteger(p.phase) && p.phase >= 1 && p.phase <= 5, `${p.id} phase`);
    assert.ok(['unicast', 'flood'].includes(p.delivery), `${p.id} delivery`);
    assert.equal(typeof p.fields, 'object');
    const forms = p.variants && p.variants.length ? p.variants : [{}];
    for (const v of forms) {
      const merged = Object.assign({}, p.fields, v.fields || {});
      const deciding = v.deciding_field || p.deciding_field;
      assert.ok(deciding in merged, `${p.id} deciding_field ${deciding}`);
    }
    if (p.variant_of !== undefined) {
      assert.ok(ids[p.variant_of], `${p.id} variant_of exists`);
      assert.ok(ids[p.variant_of].phase < p.phase, `${p.id} variant_of has a lower phase`);
    }
    assert.ok(typeof p.identifying === 'string' && p.identifying.length > 0, `${p.id} identifying`);
    assert.ok(p.label && typeof p.label.short === 'string' && p.label.short.length > 0, `${p.id} label`);
    const fb = p.feedback;
    if (p.verdict === 'forbidden') {
      assert.ok(fb.zapped && fb.leaked, `${p.id} zapped/leaked copy`);
      assert.equal(fb.wrong_zap, null); assert.equal(fb.delivered, null);
    } else {
      assert.ok(fb.wrong_zap && fb.delivered, `${p.id} wrong_zap/delivered copy`);
      assert.equal(fb.zapped, null); assert.equal(fb.leaked, null);
    }
    assert.ok(typeof p.fix === 'string' && p.fix.length > 0, `${p.id} fix`);
    assert.ok(typeof p.source === 'string' && p.source.length > 0, `${p.id} source`);
    assert.ok(['cited', 'owner-confirmed'].includes(p.source_status), `${p.id} source_status`);
  }
});

test('phase schema', () => {
  const ids = byId(PP);
  phases.forEach((ph, i) => {
    assert.equal(ph.id, i + 1, 'consecutive ids');
    for (const k of ['title', 'concept', 'briefing']) assert.ok(typeof ph[k] === 'string' && ph[k].length > 0, `${ph.id} ${k}`);
    const endless = ph.goal_zaps === null;
    for (const id of ph.introduces.zap) { assert.ok(ids[id], id); assert.equal(ids[id].verdict, 'forbidden', id); assert.equal(ids[id].phase, ph.id, id); }
    for (const id of ph.introduces.let_through) { assert.ok(ids[id], id); assert.equal(ids[id].verdict, 'allowed', id); assert.equal(ids[id].phase, ph.id, id); }
    const declared = [...ph.introduces.zap, ...ph.introduces.let_through].sort();
    assert.deepEqual(declared, packets.filter((p) => p.phase === ph.id).map((p) => p.id).sort(), `phase ${ph.id} introduces every type of that phase`);
    assert.ok(ph.mix.forbidden_ratio >= 0 && ph.mix.forbidden_ratio <= 1);
    assert.ok(ph.mix.new_type_bias >= 0 && ph.mix.new_type_bias <= 1);
    assert.ok(['name+field', 'name+deciding', 'fields-only'].includes(ph.label_detail));
    assert.ok(ph.leak_cost > 0 && ph.wrong_zap_cost > ph.leak_cost, `phase ${ph.id} wrong_zap_cost > leak_cost`);
    assert.ok(ph.spawn_interval_s > 0 && ph.travel_time_s > 0 && ph.max_packets > 0);
    if (endless) {
      assert.equal(i, phases.length - 1, 'endless is last');
      assert.equal(ph.clear_accuracy, null);
      assert.deepEqual(ph.introduces, { zap: [], let_through: [] });
      assert.ok(ph.speedup_every_zaps > 0 && ph.speedup_factor > 0 && ph.speedup_factor < 1);
      assert.ok(ph.min_spawn_interval_s > 0 && ph.min_travel_time_s > 0);
    } else {
      assert.equal(ph.goal_zaps, 10);
      assert.equal(ph.clear_accuracy, 0.8);
    }
  });
});

test('shipped data validates with nothing excluded', () => {
  const r = V.validateAll(PP.data, PP.engine);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.deepEqual(r.excludedTypes, []);
  assert.deepEqual(r.emptyPhases, []);
});

// ---------- Negative fixtures for validation rules 1–7 ----------
const SRC = 'Fixture source';
function fixture() {
  return {
    lan: clone(lan),
    packets: [
      { id: 'fx-cdp', name: 'CDP', verdict: 'forbidden', phase: 1, delivery: 'flood',
        fields: { dst_mac: '01:00:0c:cc:cc:cc', ethertype: '802.3', llc: 'SNAP PID 0x2000' },
        deciding_field: 'dst_mac', identifying: 'dst MAC 01:00:0c:cc:cc:cc', label: { short: '01:00:0c:cc:cc:cc' },
        feedback: { zapped: 'z', leaked: 'l', wrong_zap: null, delivered: null }, fix: 'f', source: SRC, source_status: 'cited' },
      { id: 'fx-bgp', name: 'BGP', verdict: 'allowed', phase: 1, delivery: 'unicast',
        fields: { dst_mac: '{dst_mac}', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '{dst_ip4}', ip_proto: 6, dst_port: 179 },
        deciding_field: 'dst_port', identifying: 'TCP 179', label: { short: 'TCP 179 → AS{dst_asn}' },
        feedback: { zapped: null, leaked: null, wrong_zap: 'w', delivered: 'd' }, fix: 'f', source: SRC, source_status: 'owner-confirmed' }
    ],
    phases: [
      { id: 1, title: 't', concept: 'c', briefing: 'b', introduces: { zap: ['fx-cdp'], let_through: ['fx-bgp'] },
        mix: { forbidden_ratio: 0.5, new_type_bias: 0 }, goal_zaps: 10, clear_accuracy: 0.8,
        spawn_interval_s: 1, travel_time_s: 2, max_packets: 6, label_detail: 'name+field', leak_cost: 10, wrong_zap_cost: 20 },
      { id: 2, title: 't', concept: 'c', briefing: 'b', introduces: { zap: [], let_through: [] },
        mix: { forbidden_ratio: 0.5, new_type_bias: 0 }, goal_zaps: null, clear_accuracy: null,
        spawn_interval_s: 1, travel_time_s: 2, max_packets: 16, label_detail: 'fields-only', leak_cost: 10, wrong_zap_cost: 20,
        speedup_every_zaps: 10, speedup_factor: 0.9, min_spawn_interval_s: 0.3, min_travel_time_s: 1 }
    ]
  };
}
const validate = (d) => V.validateAll(d, PP.engine);
const excludedIds = (r) => r.excludedTypes.map((e) => e.id);

test('fixture is valid (endless with empty introduces is not an empty phase)', () => {
  const r = validate(fixture());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.deepEqual(r.emptyPhases, []);
});

test('rule 1: missing data globals or bad LAN → error', () => {
  const d = fixture(); delete d.packets;
  assert.equal(validate(d).ok, false);
  const d2 = fixture(); d2.lan.ipv4_subnet = '10.0.0.0/24';
  assert.equal(validate(d2).ok, false);
  const d3 = fixture(); d3.lan.members.pop();
  assert.equal(validate(d3).ok, false);
  const d4 = fixture(); d4.packets[0].verdict = 'maybe';
  assert.equal(validate(d4).ok, false);
});

test('rule 2: unknown or misplaced ids in phases → error', () => {
  const d = fixture(); d.phases[0].introduces.zap.push('nope');
  assert.equal(validate(d).ok, false);
  const d2 = fixture(); d2.phases[0].introduces = { zap: ['fx-bgp'], let_through: ['fx-cdp'] };
  assert.equal(validate(d2).ok, false);
  const d3 = fixture(); d3.phases[1].id = 5;
  assert.equal(validate(d3).ok, false);
});

test('rule 2: costs must make a wrong zap cost more than a leak', () => {
  const d = fixture(); d.phases[0].wrong_zap_cost = 10;
  assert.equal(validate(d).ok, false);
});

test('rule 3: variant_of must point to an existing lower phase', () => {
  const d = fixture(); d.packets[0].variant_of = 'fx-bgp';
  assert.equal(validate(d).ok, false);
  const d2 = fixture(); d2.packets[0].variant_of = 'ghost';
  assert.equal(validate(d2).ok, false);
});

test('rule 4: missing or invalid source → excluded', () => {
  const d = fixture(); d.packets[0].source = '';
  assert.deepEqual(excludedIds(validate(d)), ['fx-cdp']);
  const d2 = fixture(); d2.packets[1].source_status = 'trust-me';
  assert.deepEqual(excludedIds(validate(d2)), ['fx-bgp']);
});

test('rule 5: conflict, verdict mismatch, delivery mismatch, unfilled template → excluded', () => {
  const d = fixture(); d.packets[0].conflict = true;
  assert.deepEqual(excludedIds(validate(d)), ['fx-cdp']);
  const d2 = fixture(); d2.packets[0].verdict = 'allowed';
  d2.packets[0].feedback = { zapped: null, leaked: null, wrong_zap: 'w', delivered: 'd' };
  d2.phases[0].introduces = { zap: [], let_through: ['fx-cdp', 'fx-bgp'] };
  assert.deepEqual(excludedIds(validate(d2)), ['fx-cdp']);
  const d3 = fixture(); d3.packets[1].delivery = 'flood';
  assert.deepEqual(excludedIds(validate(d3)), ['fx-bgp']);
  const d4 = fixture(); d4.packets[1].label.short = 'TCP 179 → {nope}';
  assert.deepEqual(excludedIds(validate(d4)), ['fx-bgp']);
});

test('rule 6: a teaching phase whose types are all excluded is reported empty', () => {
  const d = fixture(); d.packets[0].source = ''; d.packets[1].source = '';
  const r = validate(d);
  assert.deepEqual(r.emptyPhases.sort(), [1, 2]);
  const d2 = fixture(); d2.packets[0].source = '';
  assert.deepEqual(validate(d2).emptyPhases, []);
});

test('rule 7: non-documentation addresses or ASNs → error', () => {
  const d = fixture(); d.packets[1].fields.dst_ip = '10.0.0.1';
  assert.equal(validate(d).ok, false);
  const d2 = fixture(); d2.lan.outside_examples.ipv4.push('8.8.8.8');
  assert.equal(validate(d2).ok, false);
  const d3 = fixture(); d3.packets[1].fields.src_ip = '2600::1';
  assert.equal(validate(d3).ok, false);
});

// ---------- T024: Phase 1 content ----------
test('Phase 1 content: the seven first-shift types', () => {
  const ids = byId(PP);
  const p1 = ['cdp', 'mndp', 'stp', 'bgp', 'unicast-v4', 'unicast-v6', 'arp'];
  for (const id of p1) {
    assert.ok(ids[id], `${id} exists`);
    assert.equal(ids[id].phase, 1, `${id} is phase 1`);
  }
  const phase1 = phases.find((p) => p.id === 1);
  assert.deepEqual([...phase1.introduces.zap].sort(), ['cdp', 'mndp', 'stp']);
  assert.deepEqual([...phase1.introduces.let_through].sort(), ['arp', 'bgp', 'unicast-v4', 'unicast-v6']);
  assert.equal(ids.arp.source_status, 'owner-confirmed');
  for (const id of ['cdp', 'mndp', 'stp']) assert.match(ids[id].fix, /IX-facing/, `${id} fix names the IX-facing interface/port`);
  assert.match(ids.bgp.feedback.wrong_zap, /peering/);
});

// ---------- T048: the full v1 catalog and prerequisite chain ----------
test('all 20 v1 packet ids exist with the spec phases', () => {
  const ids = byId(PP);
  const expected = {
    1: ['bgp', 'unicast-v4', 'unicast-v6', 'arp', 'cdp', 'mndp', 'stp'],
    2: ['ospf', 'ospfv3', 'pim'],
    3: ['igmp', 'mld', 'ntp-unicast'],
    4: ['ra', 'rs', 'ns', 'na'],
    5: ['arp-outside-atm', 'ns-outside-atm', 'ntp-broadcast']
  };
  const all = Object.values(expected).flat();
  assert.equal(packets.length, 20);
  assert.deepEqual(packets.map((p) => p.id).sort(), [...all].sort());
  for (const [phase, list] of Object.entries(expected)) for (const id of list) assert.equal(ids[id].phase, Number(phase), id);
  assert.equal(ids['arp-outside-atm'].variant_of, 'arp');
  assert.equal(ids['ns-outside-atm'].variant_of, 'ns');
  assert.equal(ids['ntp-broadcast'].variant_of, 'ntp-unicast');
  const statuses = Object.fromEntries(packets.map((p) => [p.id, p.source_status]));
  for (const id of ['bgp', 'unicast-v4', 'unicast-v6', 'cdp', 'mndp', 'stp', 'ospf', 'ospfv3', 'ra']) assert.equal(statuses[id], 'cited', id);
});

test('label detail per phase and difficulty never gets easier', () => {
  assert.equal(phases.length, 6);
  for (const ph of phases.slice(0, 4)) assert.equal(ph.label_detail, 'name+field', `phase ${ph.id}`);
  assert.equal(phases[4].label_detail, 'name+deciding');
  assert.equal(phases[5].label_detail, 'fields-only');
  for (let i = 1; i < 5; i++) {
    assert.ok(phases[i].spawn_interval_s <= phases[i - 1].spawn_interval_s, `spawn interval phase ${i + 1}`);
    assert.ok(phases[i].travel_time_s <= phases[i - 1].travel_time_s, `travel time phase ${i + 1}`);
  }
});

test('MLD labels show the hop-by-hop header, never "next hdr 58"', () => {
  const L = PP.engine.labels;
  const mld = byId(PP).mld;
  const inst = PP.engine.spawner.instantiate(mld, lan, PP.engine.rng.createRng(3), { id: 6, label_detail: 'fields-only', travel_time_s: 2 }, {});
  const text = L.build(inst, mld).plain;
  assert.match(text, /hop-by-hop/);
  assert.doesNotMatch(text, /next hdr 58/);
});
