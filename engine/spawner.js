// Spawner — fills packet templates from the LAN and draws packets from a phase's mix.
// Pure given an rng. Model: data-model.md → PacketInstance; template keys: data-model.md → PacketType.
(function (PP) {
  'use strict';
  const R = PP.engine.rules;

  const hex2 = (n) => n.toString(16).padStart(2, '0');

  function solicitedNode(ipv6) {
    const g = R.expandIPv6(ipv6);
    if (!g) throw new Error('Not an IPv6 address: ' + ipv6);
    const b1 = g[6] & 0xff;
    const lo = g[7];
    return {
      ip: 'ff02::1:ff' + hex2(b1) + ':' + lo.toString(16),
      mac: '33:33:ff:' + hex2(b1) + ':' + hex2(lo >> 8) + ':' + hex2(lo & 0xff)
    };
  }

  function buildContext(src, peer, lan, rng) {
    const s = lan.members[src];
    const d = lan.members[peer];
    const outIp6 = rng.pick(lan.outside_examples.ipv6);
    const snDst = solicitedNode(d.ipv6);
    const snOut = solicitedNode(outIp6);
    return {
      src_ip4: s.ipv4, dst_ip4: d.ipv4, src_ip6: s.ipv6, dst_ip6: d.ipv6,
      src_ll: s.ll, dst_ll: d.ll, src_mac: s.mac, dst_mac: d.mac,
      src_asn: s.asn, dst_asn: d.asn,
      remote_ip4: rng.pick(lan.remote_examples.ipv4), remote_ip6: rng.pick(lan.remote_examples.ipv6),
      out_ip4: rng.pick(lan.outside_examples.ipv4), out_ip6: outIp6,
      sn_ip_dst: snDst.ip, sn_mac_dst: snDst.mac, sn_ip_out: snOut.ip, sn_mac_out: snOut.mac,
      atm4: lan.ipv4_subnet, atm6: lan.ipv6_prefix
    };
  }

  function fill(value, ctx) {
    if (typeof value !== 'string') return value;
    return value.replace(/\{(\w+)\}/g, (m, key) => {
      if (!(key in ctx) || ctx[key] === undefined || ctx[key] === null) {
        throw new Error('Unfilled template {' + key + '}');
      }
      return String(ctx[key]);
    });
  }

  function form(type, index) {
    const v = type.variants && type.variants.length ? type.variants[index] : null;
    return {
      fields: Object.assign({}, type.fields, v && v.fields ? v.fields : {}),
      decidingField: (v && v.deciding_field) || type.deciding_field,
      label: (v && v.label) || type.label
    };
  }

  function instantiate(type, lan, rng, phase, opts) {
    opts = opts || {};
    const n = lan.members.length;
    const src = opts.src !== undefined ? opts.src : rng.int(n);
    let peer = opts.peer;
    if (peer === undefined) {
      peer = rng.int(n - 1);
      if (peer >= src) peer += 1;
    }
    const variantCount = type.variants && type.variants.length ? type.variants.length : 1;
    const vi = opts.variantIndex !== undefined ? opts.variantIndex : (variantCount > 1 ? rng.int(variantCount) : 0);
    const f = form(type, vi);
    const base = buildContext(src, peer, lan, rng);
    const fields = {};
    for (const k of Object.keys(f.fields)) fields[k] = fill(f.fields[k], base);
    const targets = type.delivery === 'flood'
      ? lan.members.map((m) => m.slot).filter((slot) => slot !== src)
      : [peer];
    const ctx = Object.assign({}, base, fields, { n: targets.length });
    return {
      uid: opts.uid !== undefined ? opts.uid : null,
      typeId: type.id,
      src, peer, targets,
      variantIndex: vi,
      fields,
      decidingField: f.decidingField,
      labelShort: fill(f.label.short, ctx),
      labelDetail: phase.label_detail,
      hinted: !!opts.hinted,
      ctx,
      t: 0,
      dur: opts.dur !== undefined ? opts.dur : phase.travel_time_s,
      held: false,
      state: 'inbound'
    };
  }

  const isEndless = (phase) => phase.goal_zaps === null;

  function createSpawner(phase, catalog, lan, rng, opts) {
    const excluded = new Set((opts && opts.excluded) || []);
    const pool = catalog.filter((t) => !excluded.has(t.id) && (isEndless(phase) || t.phase <= phase.id));
    const forbidden = pool.filter((t) => t.verdict === 'forbidden');
    const allowed = pool.filter((t) => t.verdict === 'allowed');
    const mix = phase.mix || { forbidden_ratio: 0.5, new_type_bias: 0 };
    let uid = 0;
    return {
      pool,
      next(o) {
        o = o || {};
        if (!pool.length) return null;
        let list;
        if (forbidden.length && allowed.length) list = rng.next() < mix.forbidden_ratio ? forbidden : allowed;
        else list = forbidden.length ? forbidden : allowed;
        const fresh = list.filter((t) => t.phase === phase.id);
        const type = fresh.length && rng.next() < mix.new_type_bias ? rng.pick(fresh) : rng.pick(list);
        const hinted = (o.hintTypes || []).includes(type.id);
        return instantiate(type, lan, rng, phase, { uid: uid++, hinted, dur: o.dur });
      }
    };
  }

  PP.engine.spawner = { solicitedNode, buildContext, fill, form, instantiate, createSpawner };
})(globalThis.PP);
