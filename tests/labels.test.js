'use strict';
// T011 — header-field labels per detail level (contracts/rules-engine.md → PP.engine.labels).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAll } = require('./helpers');

const PP = loadAll();
const L = PP.engine.labels;

test('formatField renders each header field', () => {
  const v4 = { ethertype: '0x0800', ip_proto: 17, dst_port: 123 };
  const v6 = { ethertype: '0x86DD', ip_proto: 89 };
  assert.equal(L.formatField('dst_mac', { dst_mac: '01:00:0c:cc:cc:cc' }), 'dst 01:00:0c:cc:cc:cc');
  assert.equal(L.formatField('ethertype', { ethertype: '0x0806' }), 'type 0x0806');
  assert.equal(L.formatField('ethertype', { ethertype: '802.3' }), '802.3 frame');
  assert.equal(L.formatField('llc', { llc: 'SNAP PID 0x2000' }), 'SNAP PID 0x2000');
  assert.equal(L.formatField('src_ip', { src_ip: 'fe80::10' }), 'src fe80::10');
  assert.equal(L.formatField('dst_ip', { dst_ip: 'ff02::5' }), '→ ff02::5');
  assert.equal(L.formatField('ip_proto', v4), 'proto 17');
  assert.equal(L.formatField('ip_proto', v6), 'next hdr 89');
  assert.equal(L.formatField('dst_port', v4), 'UDP 123');
  assert.equal(L.formatField('dst_port', { ip_proto: 6, dst_port: 179 }), 'TCP 179');
  assert.equal(L.formatField('icmpv6_type', { icmpv6_type: 134 }), 'ICMPv6 type 134');
  assert.equal(L.formatField('sender', { sender: '203.0.113.10' }), 'sender 203.0.113.10');
  assert.equal(L.formatField('target', { target: '2001:db8:12::20' }), 'target 2001:db8:12::20');
});

const type = { id: 'cdp', name: 'CDP' };
const inst = (detail, hinted) => ({
  typeId: 'cdp', labelDetail: detail, hinted: !!hinted, decidingField: 'dst_mac', labelShort: '01:00:0c:cc:cc:cc',
  fields: { dst_mac: '01:00:0c:cc:cc:cc', ethertype: '802.3', llc: 'SNAP PID 0x2000' }
});

test('name+field: protocol name and the short label; hint adds the deciding field', () => {
  const b = L.build(inst('name+field'), type);
  assert.equal(b.title, 'CDP');
  assert.deepEqual(b.lines, [{ text: '01:00:0c:cc:cc:cc', deciding: false }]);
  const h = L.build(inst('name+field', true), type);
  assert.ok(h.lines.some((l) => l.deciding && l.text === 'dst 01:00:0c:cc:cc:cc'));
  assert.match(h.plain, /CDP/);
});

test('name+deciding: protocol name and the marked deciding field', () => {
  const b = L.build(inst('name+deciding'), type);
  assert.equal(b.title, 'CDP');
  assert.deepEqual(b.lines, [{ text: 'dst 01:00:0c:cc:cc:cc', deciding: true }]);
});

test('fields-only: no title, up to 3 lines, deciding field marked only when hinted', () => {
  const b = L.build(inst('fields-only'), type);
  assert.equal(b.title, null);
  assert.ok(b.lines.length >= 1 && b.lines.length <= 3);
  assert.ok(b.lines.every((l) => !l.deciding));
  assert.doesNotMatch(b.plain, /\bCDP\b/);
  const h = L.build(inst('fields-only', true), type);
  assert.ok(h.lines.some((l) => l.deciding));
});

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
test('fields-only never shows a protocol name for any catalog entry', () => {
  const S = PP.engine.spawner;
  const phase = { id: 6, label_detail: 'fields-only', travel_time_s: 2 };
  for (const t of PP.data.packets) {
    const rng = PP.engine.rng.createRng(7);
    for (let i = 0; i < 50; i++) {
      for (const hinted of [false, true]) {
        const b = L.build(Object.assign(S.instantiate(t, PP.data.lan, rng, phase, {}), { hinted }), t);
        assert.equal(b.title, null);
        assert.doesNotMatch(b.plain, new RegExp(`\\b${esc(t.name)}\\b`), `${t.id}: ${b.plain}`);
      }
    }
  }
});
