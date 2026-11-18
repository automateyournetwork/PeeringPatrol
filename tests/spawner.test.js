'use strict';
// T012 — template filling, instances, phase mixes.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAll } = require('./helpers');

const PP = loadAll();
const S = PP.engine.spawner;
const lan = PP.data.lan;
const rngOf = (seed) => PP.engine.rng.createRng(seed);

test('rng is deterministic per seed', () => {
  const a = rngOf(42); const b = rngOf(42);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
  const r = rngOf(1);
  for (let i = 0; i < 200; i++) { const x = r.int(7); assert.ok(x >= 0 && x < 7); }
});

test('solicitedNode computes the multicast address and MAC', () => {
  assert.deepEqual(S.solicitedNode('2001:db8:12::20'), { ip: 'ff02::1:ff00:20', mac: '33:33:ff:00:00:20' });
  assert.deepEqual(S.solicitedNode('2001:db8:99::1'), { ip: 'ff02::1:ff00:1', mac: '33:33:ff:00:00:01' });
  assert.deepEqual(S.solicitedNode('2001:db8:12:1::abcd:1234'), { ip: 'ff02::1:ffcd:1234', mac: '33:33:ff:cd:12:34' });
});

test('buildContext fills addresses from the LAN', () => {
  const m = lan.members;
  const ctx = S.buildContext(0, 3, lan, rngOf(3));
  assert.equal(ctx.src_ip4, m[0].ipv4);
  assert.equal(ctx.dst_ip4, m[3].ipv4);
  assert.equal(ctx.src_ip6, m[0].ipv6);
  assert.equal(ctx.dst_ip6, m[3].ipv6);
  assert.equal(ctx.src_ll, m[0].ll);
  assert.equal(ctx.dst_mac, m[3].mac);
  assert.equal(ctx.src_asn, m[0].asn);
  assert.equal(ctx.dst_asn, m[3].asn);
  assert.ok(lan.outside_examples.ipv4.includes(ctx.out_ip4));
  assert.ok(lan.outside_examples.ipv6.includes(ctx.out_ip6));
  assert.ok(lan.remote_examples.ipv4.includes(ctx.remote_ip4));
  assert.ok(lan.remote_examples.ipv6.includes(ctx.remote_ip6));
  assert.equal(ctx.sn_ip_dst, S.solicitedNode(m[3].ipv6).ip);
  assert.equal(ctx.sn_mac_out, S.solicitedNode(ctx.out_ip6).mac);
  assert.equal(ctx.atm4, lan.ipv4_subnet);
  assert.equal(ctx.atm6, lan.ipv6_prefix);
});

const uni = { id: 'u', name: 'U', verdict: 'allowed', phase: 1, delivery: 'unicast',
  fields: { dst_mac: '{dst_mac}', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '{dst_ip4}', ip_proto: 6, dst_port: 179 },
  deciding_field: 'dst_port', label: { short: 'TCP 179 → AS{dst_asn}' } };
const flood = { id: 'f', name: 'F', verdict: 'forbidden', phase: 2, delivery: 'flood',
  fields: { ethertype: '0x0800', src_ip: '{src_ip4}', ip_proto: 17, dst_port: 123 },
  variants: [
    { fields: { dst_mac: 'ff:ff:ff:ff:ff:ff', dst_ip: '203.0.113.255' } },
    { fields: { dst_mac: '01:00:5e:00:01:01', dst_ip: '224.0.1.1' }, deciding_field: 'dst_ip', label: { short: 'UDP 123 → 224.0.1.1' } }
  ],
  deciding_field: 'dst_mac', label: { short: 'UDP 123 broadcast' } };
const phase = (id, extra) => Object.assign({ id, label_detail: 'name+field', travel_time_s: 2, mix: { forbidden_ratio: 0.5, new_type_bias: 0 } }, extra || {});

test('instantiate fills every template and targets correctly', () => {
  const rng = rngOf(9);
  for (let i = 0; i < 300; i++) {
    const u = S.instantiate(uni, lan, rng, phase(1), {});
    assert.doesNotMatch(Object.values(u.fields).join(" ") + u.labelShort, /[{}]/);
    assert.notEqual(u.src, u.peer);
    assert.deepEqual(u.targets, [u.peer]);
    assert.equal(u.fields.dst_mac, lan.members[u.peer].mac);
    assert.equal(u.labelDetail, 'name+field');
    assert.equal(u.dur, 2);
    const f = S.instantiate(flood, lan, rng, phase(2), {});
    assert.equal(f.targets.length, 7);
    assert.ok(!f.targets.includes(f.src));
    assert.ok(['203.0.113.255', '224.0.1.1'].includes(f.fields.dst_ip));
    if (f.fields.dst_ip === '224.0.1.1') {
      assert.equal(f.decidingField, 'dst_ip');
      assert.equal(f.labelShort, 'UDP 123 → 224.0.1.1');
    } else {
      assert.equal(f.decidingField, 'dst_mac');
      assert.equal(f.labelShort, 'UDP 123 broadcast');
    }
  }
});

test('instantiate fails loudly on an unknown template', () => {
  const bad = JSON.parse(JSON.stringify(uni)); bad.label.short = '{nope}';
  assert.throws(() => S.instantiate(bad, lan, rngOf(1), phase(1), {}), /nope/);
});

test('createSpawner draws only introduced, non-excluded types', () => {
  const catalog = [uni, flood, Object.assign({}, uni, { id: 'u2', phase: 1 })];
  const sp = S.createSpawner(phase(1), catalog, lan, rngOf(5), { excluded: ['u2'] });
  for (let i = 0; i < 300; i++) {
    const inst = sp.next({});
    assert.equal(inst.typeId, 'u');
  }
  const sp2 = S.createSpawner(phase(2, { mix: { forbidden_ratio: 0.5, new_type_bias: 1 } }), catalog, lan, rngOf(5), {});
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(sp2.next({}).typeId);
  assert.deepEqual([...seen].sort(), ['f', 'u', 'u2']);
  const empty = S.createSpawner(phase(1), [flood], lan, rngOf(5), {});
  assert.equal(empty.next({}), null);
});

test('endless (goal null) draws every type', () => {
  const catalog = [uni, flood];
  const sp = S.createSpawner(phase(6, { goal_zaps: null }), catalog, lan, rngOf(2), {});
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(sp.next({}).typeId);
  assert.deepEqual([...seen].sort(), ['f', 'u']);
});

test('forbidden_ratio steers the mix', () => {
  const sp = S.createSpawner(phase(2, { mix: { forbidden_ratio: 0.8, new_type_bias: 0 } }), [uni, flood], lan, rngOf(11), {});
  let forb = 0; const n = 2000;
  for (let i = 0; i < n; i++) if (sp.next({}).typeId === 'f') forb++;
  assert.ok(forb / n > 0.75 && forb / n < 0.85, `ratio ${forb / n}`);
});

// ---------- T056: endless draws every shipped type ----------
test('endless draws every non-excluded shipped type', () => {
  const endless = PP.data.phases.find((p) => p.goal_zaps === null);
  const sp = S.createSpawner(endless, PP.data.packets, lan, rngOf(99), {});
  const seen = new Set();
  for (let i = 0; i < 4000; i++) seen.add(sp.next({}).typeId);
  assert.equal(seen.size, PP.data.packets.length);
  const sp2 = S.createSpawner(endless, PP.data.packets, lan, rngOf(99), { excluded: ['pim'] });
  for (let i = 0; i < 2000; i++) assert.notEqual(sp2.next({}).typeId, 'pim');
});

// ---------- T063: hints ----------
test('hinted instances follow the shift hint list', () => {
  const p1 = PP.data.phases[0];
  const sp = S.createSpawner(p1, PP.data.packets, lan, rngOf(4), {});
  let hinted = 0;
  for (let i = 0; i < 500; i++) {
    const inst = sp.next({ hintTypes: ['cdp'] });
    if (inst.typeId === 'cdp') { assert.equal(inst.hinted, true); hinted++; } else assert.equal(inst.hinted, false);
  }
  assert.ok(hinted > 0);
  const sc = PP.engine.scoring;
  let shift = sc.apply(sc.newShift(p1, 'arcade'), 'leak', 'cdp', p1);
  assert.deepEqual(shift.hintTypes, ['cdp']);
  shift = sc.consumeHint(shift, 'cdp');
  assert.deepEqual(shift.hintTypes, []);
  const L = PP.engine.labels;
  const inst = S.instantiate(PP.data.packets.find((t) => t.id === 'cdp'), lan, rngOf(1), p1, { hinted: true });
  const b = L.build(inst, { name: 'CDP' });
  assert.ok(b.lines.some((l) => l.deciding));
  assert.doesNotMatch(b.plain, /forbidden|allowed|zap/i, 'hint never reveals the verdict');
});
