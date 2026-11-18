// Load-time validation of the data files (data-model.md → Validation rules 1–7; research.md R11).
// Errors block play (error screen). Exclusions remove one packet type and never show it.
(function (PP) {
  'use strict';

  const DOC_V4 = ['192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4'];
  const DOC_V6 = ['2001:db8::/32', 'fe80::/10', 'ff00::/8'];
  const VERDICTS = ['allowed', 'forbidden'];
  const DELIVERIES = ['unicast', 'flood'];
  const STATUSES = ['cited', 'owner-confirmed'];
  const DETAILS = ['name+field', 'name+deciding', 'fields-only'];
  const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

  function validateAll(data, engine) {
    const R = engine.rules;
    const S = engine.spawner;
    const errors = [];
    const excluded = [];
    const err = (m) => errors.push(m);

    // ---------- Rule 1: presence ----------
    if (!data || !data.lan || typeof data.lan !== 'object') err('data/lan.js is missing or empty (PP.data.lan).');
    if (!data || !Array.isArray(data.packets)) err('data/packets.js is missing (PP.data.packets must be an array).');
    if (!data || !Array.isArray(data.phases)) err('data/phases.js is missing (PP.data.phases must be an array).');
    if (errors.length) return { ok: false, errors, excludedTypes: [], emptyPhases: [] };
    const { lan, packets, phases } = data;

    // ---------- Rule 7 helper: documentation ranges ----------
    function checkAddress(where, value) {
      if (typeof value !== 'string' || value.indexOf('{') !== -1) return;
      if (R.parseIPv4(value) !== null) {
        if (value !== '255.255.255.255' && !DOC_V4.some((c) => R.inSubnet(value, c))) {
          err(`${where}: ${value} is not a documentation, multicast, or broadcast IPv4 address.`);
        }
      } else if (R.expandIPv6(value)) {
        if (!DOC_V6.some((p) => R.inPrefix(value, p))) err(`${where}: ${value} is not a documentation, link-local, or multicast IPv6 address.`);
      }
    }

    // ---------- LAN ----------
    if (lan.ipv4_subnet !== '203.0.113.0/24') err('lan.ipv4_subnet must be 203.0.113.0/24.');
    if (lan.ipv6_prefix !== '2001:db8:12::/64') err('lan.ipv6_prefix must be 2001:db8:12::/64.');
    const members = Array.isArray(lan.members) ? lan.members : [];
    if (members.length !== 8) err('lan.members must list exactly 8 members.');
    for (const k of ['asn', 'ipv4', 'ipv6', 'll', 'mac', 'slot']) {
      if (new Set(members.map((m) => m[k])).size !== members.length) err(`lan.members: ${k} values must be unique.`);
    }
    members.forEach((m, i) => {
      const w = `lan.members[${i}]`;
      if (!(Number.isInteger(m.asn) && m.asn >= 64496 && m.asn <= 64503)) err(`${w}: ASN must be in AS64496–AS64503.`);
      if (!R.inSubnet(m.ipv4, lan.ipv4_subnet)) err(`${w}: ipv4 must be inside the ATM subnet.`);
      if (!R.inPrefix(m.ipv6, lan.ipv6_prefix)) err(`${w}: ipv6 must be inside the ATM prefix.`);
      if (!R.inPrefix(m.ll, 'fe80::/10')) err(`${w}: ll must be a link-local address.`);
      if (!/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(m.mac) || R.isGroupMac(m.mac)) err(`${w}: mac must be a unicast MAC.`);
      if (m.slot !== i) err(`${w}: slot must be ${i}.`);
    });
    for (const key of ['remote_examples', 'outside_examples']) {
      const ex = lan[key];
      if (!ex || !Array.isArray(ex.ipv4) || !Array.isArray(ex.ipv6) || !ex.ipv4.length || !ex.ipv6.length) {
        err(`lan.${key} must list IPv4 and IPv6 examples.`);
        continue;
      }
      for (const a of ex.ipv4) { checkAddress(`lan.${key}`, a); if (R.inSubnet(a, lan.ipv4_subnet)) err(`lan.${key}: ${a} must be outside the ATM subnet.`); }
      for (const a of ex.ipv6) { checkAddress(`lan.${key}`, a); if (R.inPrefix(a, lan.ipv6_prefix)) err(`lan.${key}: ${a} must be outside the ATM prefix.`); }
    }
    if (errors.length) return { ok: false, errors, excludedTypes: [], emptyPhases: [] };

    // ---------- Packet schema ----------
    const byId = new Map();
    for (const p of packets) {
      const w = `packet ${p && p.id ? p.id : '(no id)'}`;
      if (!p || !/^[a-z0-9-]+$/.test(p.id || '')) { err(`${w}: id must be a lowercase slug.`); continue; }
      if (byId.has(p.id)) err(`${w}: duplicate id.`);
      byId.set(p.id, p);
      if (!nonEmpty(p.name)) err(`${w}: name is required.`);
      if (!VERDICTS.includes(p.verdict)) err(`${w}: verdict must be allowed or forbidden.`);
      if (!(Number.isInteger(p.phase) && p.phase >= 1 && p.phase <= 5)) err(`${w}: phase must be 1–5.`);
      if (!DELIVERIES.includes(p.delivery)) err(`${w}: delivery must be unicast or flood.`);
      if (!p.fields || typeof p.fields !== 'object') { err(`${w}: fields object is required.`); continue; }
      if (p.variants !== undefined && !Array.isArray(p.variants)) err(`${w}: variants must be an array.`);
      const forms = p.variants && p.variants.length ? p.variants : [null];
      forms.forEach((v, i) => {
        const f = S.form(p, i);
        if (!(f.decidingField in f.fields)) err(`${w}: deciding_field "${f.decidingField}" is not in fields (form ${i}).`);
        for (const [k, val] of Object.entries(f.fields)) if (['src_ip', 'dst_ip', 'sender', 'target'].includes(k)) checkAddress(`${w}.fields.${k}`, val);
      });
      if (!nonEmpty(p.identifying)) err(`${w}: identifying is required.`);
      if (!p.label || !nonEmpty(p.label.short)) err(`${w}: label.short is required.`);
      const fb = p.feedback || {};
      if (p.verdict === 'forbidden' && !(nonEmpty(fb.zapped) && nonEmpty(fb.leaked) && fb.wrong_zap === null && fb.delivered === null)) {
        err(`${w}: forbidden types need feedback.zapped and feedback.leaked (wrong_zap and delivered null).`);
      }
      if (p.verdict === 'allowed' && !(nonEmpty(fb.wrong_zap) && nonEmpty(fb.delivered) && fb.zapped === null && fb.leaked === null)) {
        err(`${w}: allowed types need feedback.wrong_zap and feedback.delivered (zapped and leaked null).`);
      }
      if (!nonEmpty(p.fix)) err(`${w}: fix is required.`);
    }
    // Rule 3: variant chain.
    for (const p of packets) {
      if (!p || p.variant_of === undefined) continue;
      const base = byId.get(p.variant_of);
      if (!base) err(`packet ${p.id}: variant_of "${p.variant_of}" does not exist.`);
      else if (!(base.phase < p.phase)) err(`packet ${p.id}: variant_of "${p.variant_of}" must be introduced in an earlier phase.`);
    }

    // ---------- Rule 2: phases ----------
    phases.forEach((ph, i) => {
      const w = `phase ${ph && ph.id}`;
      if (!ph || ph.id !== i + 1) { err(`phases must be numbered consecutively from 1 (position ${i + 1}).`); return; }
      const endless = ph.goal_zaps === null;
      for (const k of ['title', 'concept', 'briefing']) if (!nonEmpty(ph[k])) err(`${w}: ${k} is required.`);
      const intro = ph.introduces || {};
      if (!Array.isArray(intro.zap) || !Array.isArray(intro.let_through)) { err(`${w}: introduces.zap and introduces.let_through are required.`); return; }
      for (const id of intro.zap) {
        const t = byId.get(id);
        if (!t) err(`${w}: introduces unknown packet "${id}".`);
        else { if (t.verdict !== 'forbidden') err(`${w}: "${id}" is listed under zap but is allowed.`); if (t.phase !== ph.id) err(`${w}: "${id}" belongs to phase ${t.phase}.`); }
      }
      for (const id of intro.let_through) {
        const t = byId.get(id);
        if (!t) err(`${w}: introduces unknown packet "${id}".`);
        else { if (t.verdict !== 'allowed') err(`${w}: "${id}" is listed under let_through but is forbidden.`); if (t.phase !== ph.id) err(`${w}: "${id}" belongs to phase ${t.phase}.`); }
      }
      const declared = new Set(intro.zap.concat(intro.let_through));
      for (const p of packets) if (p && p.phase === ph.id && !declared.has(p.id)) err(`${w}: packet "${p.id}" has phase ${ph.id} but is not listed in introduces.`);
      if (!endless && declared.size === 0) err(`${w}: a teaching phase must introduce at least one packet type.`);
      if (endless && declared.size) err(`${w}: the endless phase introduces no new types.`);
      if (endless && i !== phases.length - 1) err(`${w}: the endless phase must be last.`);
      const mix = ph.mix || {};
      if (!(isNum(mix.forbidden_ratio) && mix.forbidden_ratio >= 0 && mix.forbidden_ratio <= 1)) err(`${w}: mix.forbidden_ratio must be 0–1.`);
      if (!(isNum(mix.new_type_bias) && mix.new_type_bias >= 0 && mix.new_type_bias <= 1)) err(`${w}: mix.new_type_bias must be 0–1.`);
      if (!endless && (ph.goal_zaps !== 10 || ph.clear_accuracy !== 0.8)) err(`${w}: teaching phases need goal_zaps 10 and clear_accuracy 0.8.`);
      if (endless && ph.clear_accuracy !== null) err(`${w}: the endless phase has clear_accuracy null.`);
      if (!DETAILS.includes(ph.label_detail)) err(`${w}: label_detail is invalid.`);
      for (const k of ['spawn_interval_s', 'travel_time_s', 'max_packets', 'leak_cost', 'wrong_zap_cost']) if (!(isNum(ph[k]) && ph[k] > 0)) err(`${w}: ${k} must be > 0.`);
      if (!(ph.wrong_zap_cost > ph.leak_cost)) err(`${w}: wrong_zap_cost must be greater than leak_cost.`);
      if (endless) {
        if (!(Number.isInteger(ph.speedup_every_zaps) && ph.speedup_every_zaps > 0)) err(`${w}: speedup_every_zaps must be a positive integer.`);
        if (!(isNum(ph.speedup_factor) && ph.speedup_factor > 0 && ph.speedup_factor < 1)) err(`${w}: speedup_factor must be between 0 and 1.`);
        for (const k of ['min_spawn_interval_s', 'min_travel_time_s']) if (!(isNum(ph[k]) && ph[k] > 0)) err(`${w}: ${k} must be > 0.`);
      }
    });
    if (errors.length) return { ok: false, errors, excludedTypes: [], emptyPhases: [] };

    // ---------- Rules 4–5: per-type exclusions ----------
    const rng = engine.rng.createRng(20261118);
    const stubPhase = { id: 1, label_detail: 'name+field', travel_time_s: 1 };
    for (const p of packets) {
      const why = exclusionReason(p);
      if (why) excluded.push({ id: p.id, reason: why });
    }
    function exclusionReason(p) {
      if (!nonEmpty(p.source)) return 'missing source';
      if (!STATUSES.includes(p.source_status)) return 'invalid source_status';
      if (p.conflict === true) return 'sources conflict';
      const forms = p.variants && p.variants.length ? p.variants.length : 1;
      for (let vi = 0; vi < forms; vi++) {
        for (let src = 0; src < members.length; src++) {
          for (let peer = 0; peer < members.length; peer++) {
            if (peer === src) continue;
            let inst;
            try {
              inst = S.instantiate(p, lan, rng, stubPhase, { src, peer, variantIndex: vi });
              for (const k of ['zapped', 'leaked', 'wrong_zap', 'delivered']) if (p.feedback[k]) S.fill(p.feedback[k], inst.ctx);
              S.fill(p.fix, inst.ctx);
              if (p.wrong_zap_banner !== undefined) S.fill(p.wrong_zap_banner, inst.ctx);
            } catch (e) {
              return 'unfilled template: ' + e.message;
            }
            const v = R.recomputeVerdict(inst.fields, lan);
            if (v === 'unknown') return 'verdict could not be recomputed from the header fields';
            if (v !== p.verdict) return `catalog says ${p.verdict} but the header fields say ${v}`;
            if ((p.delivery === 'flood') !== R.isGroupMac(inst.fields.dst_mac)) return 'delivery does not match the destination MAC';
          }
        }
      }
      return null;
    }

    // ---------- Rule 6: empty phases ----------
    const ex = new Set(excluded.map((e) => e.id));
    const playable = packets.filter((p) => !ex.has(p.id));
    const emptyPhases = [];
    for (const ph of phases) {
      if (ph.goal_zaps === null) {
        if (!playable.length) emptyPhases.push(ph.id);
      } else {
        const ids = ph.introduces.zap.concat(ph.introduces.let_through);
        if (ids.every((id) => ex.has(id))) emptyPhases.push(ph.id);
      }
    }
    return { ok: true, errors: [], excludedTypes: excluded, emptyPhases };
  }

  PP.engine.validate = { validateAll };
})(globalThis.PP);
