'use strict';
// T007 — rules engine: address helpers, verdict recomputation, outcome table, catalog loop.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAll } = require('./helpers');

const PP = loadAll();
const R = PP.engine.rules;
const lan = PP.data.lan;

test('expandIPv6 handles :: compression and rejects garbage', () => {
  assert.deepEqual(R.expandIPv6('2001:db8:12::10'), [0x2001, 0xdb8, 0x12, 0, 0, 0, 0, 0x10]);
  assert.deepEqual(R.expandIPv6('::1'), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(R.expandIPv6('ff02::1:ff00:20'), [0xff02, 0, 0, 0, 0, 1, 0xff00, 0x20]);
  assert.equal(R.expandIPv6('zz::1'), null);
  assert.equal(R.expandIPv6('203.0.113.10'), null);
});

test('inSubnet / inPrefix', () => {
  assert.equal(R.inSubnet('203.0.113.10', '203.0.113.0/24'), true);
  assert.equal(R.inSubnet('203.0.113.255', '203.0.113.0/24'), true);
  assert.equal(R.inSubnet('198.51.100.1', '203.0.113.0/24'), false);
  assert.equal(R.inSubnet('not-an-ip', '203.0.113.0/24'), false);
  assert.equal(R.inPrefix('2001:db8:12::10', '2001:db8:12::/64'), true);
  assert.equal(R.inPrefix('2001:db8:12:1::1', '2001:db8:12::/64'), false);
  assert.equal(R.inPrefix('2001:db8:99::1', '2001:db8:12::/64'), false);
  assert.equal(R.inPrefix('fe80::10', 'fe80::/10'), true);
});

test('isGroupMac and isBroadcastOrMulticast', () => {
  for (const m of ['ff:ff:ff:ff:ff:ff', '01:00:5e:00:00:05', '33:33:00:00:00:01', '01:80:c2:00:00:00']) {
    assert.equal(R.isGroupMac(m), true, m);
  }
  assert.equal(R.isGroupMac('02:00:00:00:00:10'), false);
  for (const a of ['255.255.255.255', '203.0.113.255', '224.0.1.1', '224.0.0.5', 'ff05::101', 'ff02::1', 'ff:ff:ff:ff:ff:ff']) {
    assert.equal(R.isBroadcastOrMulticast(a, lan), true, a);
  }
  for (const a of ['203.0.113.10', '2001:db8:12::10', '198.51.100.20', '02:00:00:00:00:10']) {
    assert.equal(R.isBroadcastOrMulticast(a, lan), false, a);
  }
});

const UMAC = '02:00:00:00:00:20';
const cases = [
  ['CDP (Cisco discovery MAC)', { dst_mac: '01:00:0c:cc:cc:cc', ethertype: '802.3', llc: 'SNAP PID 0x2000' }, 'forbidden'],
  ['STP BPDU (IEEE 802.1 reserved MAC)', { dst_mac: '01:80:c2:00:00:00', ethertype: '802.3', llc: 'DSAP 0x42' }, 'forbidden'],
  ['ARP inside ATM', { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0806', sender: '203.0.113.10', target: '203.0.113.20' }, 'allowed'],
  ['ARP target outside ATM', { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0806', sender: '203.0.113.10', target: '198.51.100.1' }, 'forbidden'],
  ['ARP sender outside ATM', { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0806', sender: '192.0.2.1', target: '203.0.113.20' }, 'forbidden'],
  ['ARP without addresses', { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0806' }, 'unknown'],
  ['OSPF', { dst_mac: '01:00:5e:00:00:05', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '224.0.0.5', ip_proto: 89 }, 'forbidden'],
  ['OSPFv3', { dst_mac: '33:33:00:00:00:05', ethertype: '0x86DD', src_ip: 'fe80::10', dst_ip: 'ff02::5', ip_proto: 89 }, 'forbidden'],
  ['PIM', { dst_mac: '01:00:5e:00:00:0d', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '224.0.0.13', ip_proto: 103 }, 'forbidden'],
  ['IGMP', { dst_mac: '01:00:5e:00:00:16', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '224.0.0.22', ip_proto: 2 }, 'forbidden'],
  ['MNDP', { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '255.255.255.255', ip_proto: 17, dst_port: 5678 }, 'forbidden'],
  ['NTP unicast', { dst_mac: UMAC, ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '203.0.113.20', ip_proto: 17, dst_port: 123 }, 'allowed'],
  ['NTP subnet broadcast', { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '203.0.113.255', ip_proto: 17, dst_port: 123 }, 'forbidden'],
  ['NTP 224.0.1.1', { dst_mac: '01:00:5e:00:01:01', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '224.0.1.1', ip_proto: 17, dst_port: 123 }, 'forbidden'],
  ['NTP ff05::101', { dst_mac: '33:33:00:00:01:01', ethertype: '0x86DD', src_ip: 'fe80::10', dst_ip: 'ff05::101', ip_proto: 17, dst_port: 123 }, 'forbidden'],
  ['NTP ff02::101', { dst_mac: '33:33:00:00:01:01', ethertype: '0x86DD', src_ip: 'fe80::10', dst_ip: 'ff02::101', ip_proto: 17, dst_port: 123 }, 'forbidden'],
  ['BGP between ATM addresses', { dst_mac: UMAC, ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '203.0.113.20', ip_proto: 6, dst_port: 179 }, 'allowed'],
  ['BGP over IPv6 between ATM addresses', { dst_mac: UMAC, ethertype: '0x86DD', src_ip: '2001:db8:12::10', dst_ip: '2001:db8:12::20', ip_proto: 6, dst_port: 179 }, 'allowed'],
  ['unicast IPv4 to a peer MAC', { dst_mac: UMAC, ethertype: '0x0800', src_ip: '192.0.2.80', dst_ip: '198.51.100.20', ip_proto: 6, dst_port: 443 }, 'allowed'],
  ['unicast IPv6 to a peer MAC', { dst_mac: UMAC, ethertype: '0x86DD', src_ip: '2001:db8:bb::80', dst_ip: '2001:db8:aa::20', ip_proto: 6, dst_port: 443 }, 'allowed'],
  ['unknown multicast UDP', { dst_mac: '01:00:5e:00:00:fb', ethertype: '0x0800', src_ip: '203.0.113.10', dst_ip: '224.0.0.251', ip_proto: 17, dst_port: 5353 }, 'unknown'],
  ['unknown EtherType', { dst_mac: UMAC, ethertype: '0x88cc' }, 'unknown']
];
for (const [t, mld] of [[130, 'MLD query'], [131, 'MLDv1 report'], [132, 'MLD done'], [143, 'MLDv2 report'], [133, 'Router Solicitation'], [134, 'Router Advertisement']]) {
  cases.push([`ICMPv6 ${t} (${mld})`, { dst_mac: '33:33:00:00:00:01', ethertype: '0x86DD', src_ip: 'fe80::10', dst_ip: 'ff02::1', ip_proto: 58, icmpv6_type: t }, 'forbidden']);
}
cases.push(
  ['NS target inside ATM prefix', { dst_mac: '33:33:ff:00:00:20', ethertype: '0x86DD', src_ip: '2001:db8:12::10', dst_ip: 'ff02::1:ff00:20', ip_proto: 58, icmpv6_type: 135, target: '2001:db8:12::20' }, 'allowed'],
  ['NS target outside ATM prefix', { dst_mac: '33:33:ff:00:00:01', ethertype: '0x86DD', src_ip: '2001:db8:12::10', dst_ip: 'ff02::1:ff00:1', ip_proto: 58, icmpv6_type: 135, target: '2001:db8:99::1' }, 'forbidden'],
  ['NA target inside ATM prefix', { dst_mac: UMAC, ethertype: '0x86DD', src_ip: '2001:db8:12::10', dst_ip: '2001:db8:12::20', ip_proto: 58, icmpv6_type: 136, target: '2001:db8:12::10' }, 'allowed'],
  ['NA target outside ATM prefix', { dst_mac: UMAC, ethertype: '0x86DD', src_ip: '2001:db8:12::10', dst_ip: '2001:db8:12::20', ip_proto: 58, icmpv6_type: 136, target: '2001:db8:12:1::1' }, 'forbidden'],
  ['ICMPv6 echo (not in catalog)', { dst_mac: UMAC, ethertype: '0x86DD', src_ip: '2001:db8:12::10', dst_ip: '2001:db8:12::20', ip_proto: 58, icmpv6_type: 128 }, 'unknown']
);

for (const [name, fields, expected] of cases) {
  test(`recomputeVerdict: ${name} → ${expected}`, () => {
    assert.equal(R.recomputeVerdict(fields, lan), expected);
  });
}

test('evaluateAction follows the outcome table', () => {
  const catalog = [{ id: 'f', verdict: 'forbidden' }, { id: 'a', verdict: 'allowed' }];
  const f = { typeId: 'f' }; const a = { typeId: 'a' };
  assert.deepEqual(R.evaluateAction(f, 'zap', catalog, lan), { correct: true, outcome: 'zap-correct', typeId: 'f' });
  assert.deepEqual(R.evaluateAction(f, 'let-through', catalog, lan), { correct: false, outcome: 'leak', typeId: 'f' });
  assert.deepEqual(R.evaluateAction(f, 'arrived', catalog, lan), { correct: false, outcome: 'leak', typeId: 'f' });
  assert.deepEqual(R.evaluateAction(a, 'zap', catalog, lan), { correct: false, outcome: 'zap-wrong', typeId: 'a' });
  assert.deepEqual(R.evaluateAction(a, 'arrived', catalog, lan), { correct: true, outcome: 'delivered', typeId: 'a' });
  assert.throws(() => R.evaluateAction({ typeId: 'nope' }, 'zap', catalog, lan));
  assert.throws(() => R.evaluateAction(f, 'shrug', catalog, lan));
});

test('evaluatePacket reports catalog verdict and consistency', () => {
  const catalog = [{ id: 'cdp', verdict: 'forbidden' }];
  const inst = { typeId: 'cdp', fields: cases[0][1] };
  assert.deepEqual(R.evaluatePacket(inst, catalog, lan), { verdict: 'forbidden', typeId: 'cdp', consistent: true });
  const lying = [{ id: 'cdp', verdict: 'allowed' }];
  assert.equal(R.evaluatePacket(inst, lying, lan).consistent, false);
});

test('every catalog entry recomputes to its verdict and delivery over 1,000 seeded instances', () => {
  const S = PP.engine.spawner;
  const phase = { id: 5, label_detail: 'name+field', travel_time_s: 2 };
  for (const type of PP.data.packets) {
    const rng = PP.engine.rng.createRng(1234);
    for (let i = 0; i < 1000; i++) {
      const inst = S.instantiate(type, lan, rng, phase, {});
      assert.equal(R.recomputeVerdict(inst.fields, lan), type.verdict, `${type.id} #${i} ${JSON.stringify(inst.fields)}`);
      assert.equal(type.delivery === 'flood', R.isGroupMac(inst.fields.dst_mac), `${type.id} delivery vs dst_mac ${inst.fields.dst_mac}`);
    }
  }
});

// ---------- T047: catalog variant pairs ("same protocol, different verdict") ----------
test('catalog variant pairs grade in both directions', () => {
  const S = PP.engine.spawner;
  const ids = Object.fromEntries(PP.data.packets.map((t) => [t.id, t]));
  const phase = { id: 5, label_detail: 'name+deciding', travel_time_s: 2 };
  const all = (id, fn) => {
    const t = ids[id]; const forms = t.variants && t.variants.length ? t.variants.length : 1;
    for (let vi = 0; vi < forms; vi++) for (let src = 0; src < 8; src++) for (let peer = 0; peer < 8; peer++) {
      if (src !== peer) fn(S.instantiate(t, lan, PP.engine.rng.createRng(src * 8 + peer + vi), phase, { src, peer, variantIndex: vi }), vi);
    }
  };
  all('arp', (i) => { assert.ok(R.inSubnet(i.fields.target, lan.ipv4_subnet)); assert.equal(R.recomputeVerdict(i.fields, lan), 'allowed'); });
  all('arp-outside-atm', (i, vi) => {
    const out = vi === 0 ? i.fields.target : i.fields.sender;
    assert.equal(R.inSubnet(out, lan.ipv4_subnet), false, 'variant ' + vi);
    assert.equal(R.recomputeVerdict(i.fields, lan), 'forbidden');
  });
  all('ns', (i) => { assert.ok(R.inPrefix(i.fields.target, lan.ipv6_prefix)); assert.equal(R.recomputeVerdict(i.fields, lan), 'allowed'); });
  all('ns-outside-atm', (i) => { assert.equal(R.inPrefix(i.fields.target, lan.ipv6_prefix), false); assert.equal(R.recomputeVerdict(i.fields, lan), 'forbidden'); });
  all('ntp-unicast', (i) => { assert.equal(R.isBroadcastOrMulticast(i.fields.dst_ip, lan), false); assert.equal(R.recomputeVerdict(i.fields, lan), 'allowed'); });
  const dsts = new Set();
  all('ntp-broadcast', (i) => { dsts.add(i.fields.dst_ip); assert.equal(R.recomputeVerdict(i.fields, lan), 'forbidden'); });
  assert.deepEqual([...dsts].sort(), ['203.0.113.255', '224.0.1.1', 'ff02::101', 'ff05::101']);
  for (const id of ['ra', 'rs', 'mld']) all(id, (i) => assert.equal(R.recomputeVerdict(i.fields, lan), 'forbidden', id));
  for (const id of ['ns', 'na']) all(id, (i) => assert.equal(R.recomputeVerdict(i.fields, lan), 'allowed', id));
  const mldTypes = new Set(); all('mld', (i) => mldTypes.add(i.fields.icmpv6_type));
  assert.deepEqual([...mldTypes].sort(), [130, 132, 143]);
});
