// Packet labels — formats structured header fields for each label detail level. Pure.
// Contract: specs/001-peering-patrol-game/contracts/rules-engine.md → PP.engine.labels
(function (PP) {
  'use strict';

  function formatField(key, f) {
    const v = f[key];
    switch (key) {
      case 'dst_mac': return 'dst ' + v;
      case 'ethertype': return v === '802.3' ? '802.3 frame' : 'type ' + v;
      case 'llc': return String(v);
      case 'src_ip': return 'src ' + v;
      case 'dst_ip': return '→ ' + v;
      case 'ip_proto':
        if (f.ext_hdr === 'hop-by-hop') return 'next hdr 0 (hop-by-hop) → ' + (v === 58 ? 'ICMPv6' : 'proto ' + v);
        return (f.ethertype === '0x86DD' ? 'next hdr ' : 'proto ') + v;
      case 'ext_hdr': return v + ' header';
      case 'dst_port': return (f.ip_proto === 6 ? 'TCP ' : f.ip_proto === 17 ? 'UDP ' : 'port ') + v;
      case 'icmpv6_type': return 'ICMPv6 type ' + v;
      case 'sender': return 'sender ' + v;
      case 'target': return 'target ' + v;
      default: return key + ' ' + v;
    }
  }

  // Header-field groups for the fields-only (recall) label: frame / network / transport.
  const GROUPS = [
    ['dst_mac', 'ethertype'],
    ['llc', 'ip_proto', 'dst_ip', 'sender'],
    ['dst_port', 'icmpv6_type', 'target']
  ];

  function fieldsOnly(instance) {
    const f = instance.fields;
    const deciding = instance.hinted ? instance.decidingField : null;
    const groups = GROUPS.map((g) => g.filter((k) => k in f && k !== deciding));
    const lines = groups.filter((g) => g.length).map((g) => ({ text: g.map((k) => formatField(k, f)).join(' · '), deciding: false }));
    while (lines.length > (deciding ? 2 : 3)) {
      const a = lines.shift(); const b = lines.shift();
      lines.unshift({ text: a.text + ' · ' + b.text, deciding: false });
    }
    if (deciding && deciding in f) lines.push({ text: formatField(deciding, f), deciding: true });
    return lines;
  }

  function build(instance, type) {
    const detail = instance.labelDetail;
    let title = type.name;
    let lines;
    if (detail === 'fields-only') {
      title = null;
      lines = fieldsOnly(instance);
    } else if (detail === 'name+deciding') {
      lines = [{ text: formatField(instance.decidingField, instance.fields), deciding: true }];
    } else {
      lines = [{ text: instance.labelShort, deciding: false }];
      if (instance.hinted) lines.push({ text: formatField(instance.decidingField, instance.fields), deciding: true });
    }
    const plain = [title].concat(lines.map((l) => l.text)).filter(Boolean).join(', ');
    return { title, lines, plain };
  }

  const FIELD_NAMES = {
    dst_mac: 'destination MAC', ethertype: 'EtherType', llc: 'LLC header', src_ip: 'source address',
    dst_ip: 'destination address', ip_proto: 'IP protocol', dst_port: 'port', icmpv6_type: 'ICMPv6 type',
    sender: 'sender address', target: 'target address'
  };
  const fieldName = (key) => FIELD_NAMES[key] || key;

  PP.engine.labels = { formatField, build, fieldName };
})(globalThis.PP);
