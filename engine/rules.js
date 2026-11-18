// Rules engine — the ONLY code that decides whether a packet is allowed on the ATM peering LAN.
// Pure: no DOM, no clock, no randomness. Contract: specs/001-peering-patrol-game/contracts/rules-engine.md
// recomputeVerdict() re-derives each verdict from header fields so a catalog typo fails the tests
// (research.md R3) instead of teaching something wrong.
(function (PP) {
  'use strict';

  // ---------- Address helpers ----------
  function parseIPv4(addr) {
    if (typeof addr !== 'string') return null;
    const parts = addr.split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return null;
      const v = Number(p);
      if (v > 255) return null;
      n = n * 256 + v;
    }
    return n;
  }

  function expandIPv6(addr) {
    if (typeof addr !== 'string' || addr.indexOf(':') === -1) return null;
    const a = addr.split('%')[0].split('/')[0].toLowerCase();
    const halves = a.split('::');
    if (halves.length > 2) return null;
    const parse = (s) => (s === '' ? [] : s.split(':'));
    const head = parse(halves[0]);
    const tail = halves.length === 2 ? parse(halves[1]) : [];
    const groups = halves.length === 2
      ? head.concat(new Array(8 - head.length - tail.length).fill('0'), tail)
      : head;
    if (groups.length !== 8) return null;
    const out = [];
    for (const g of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  }

  function inSubnet(ipv4, cidr) {
    const [base, lenStr] = String(cidr).split('/');
    const ip = parseIPv4(ipv4);
    const net = parseIPv4(base);
    const len = Number(lenStr);
    if (ip === null || net === null || !(len >= 0 && len <= 32)) return false;
    const size = Math.pow(2, 32 - len);
    return Math.floor(ip / size) === Math.floor(net / size);
  }

  function inPrefix(ipv6, prefix) {
    const [base, lenStr] = String(prefix).split('/');
    const ip = expandIPv6(ipv6);
    const net = expandIPv6(base);
    const len = Number(lenStr);
    if (!ip || !net || !(len >= 0 && len <= 128)) return false;
    let bits = len;
    for (let i = 0; i < 8 && bits > 0; i++) {
      const take = Math.min(16, bits);
      const mask = (0xffff << (16 - take)) & 0xffff;
      if ((ip[i] & mask) !== (net[i] & mask)) return false;
      bits -= take;
    }
    return true;
  }

  const MAC_RE = /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i;
  function isGroupMac(mac) {
    if (typeof mac !== 'string' || !MAC_RE.test(mac)) return false;
    return (parseInt(mac.slice(0, 2), 16) & 1) === 1;
  }

  function subnetBroadcast(cidr) {
    const [base, lenStr] = String(cidr).split('/');
    const net = parseIPv4(base);
    const len = Number(lenStr);
    if (net === null) return null;
    const size = Math.pow(2, 32 - len);
    return Math.floor(net / size) * size + size - 1;
  }

  function isBroadcastOrMulticast(addr, lan) {
    if (typeof addr !== 'string') return false;
    if (MAC_RE.test(addr)) return isGroupMac(addr);
    const v4 = parseIPv4(addr);
    if (v4 !== null) {
      if (v4 === 0xffffffff) return true;
      const first = Math.floor(v4 / 16777216);
      if (first >= 224 && first <= 239) return true;
      return !!(lan && lan.ipv4_subnet && v4 === subnetBroadcast(lan.ipv4_subnet));
    }
    const v6 = expandIPv6(addr);
    if (v6) return (v6[0] & 0xff00) === 0xff00;
    return false;
  }

  // ---------- Verdict recomputation (predicates in order; research.md R3) ----------
  const MLD_TYPES = [130, 131, 132, 143];
  const ROUTER_DISCOVERY_TYPES = [133, 134];

  function recomputeVerdict(f, lan) {
    if (!f || typeof f !== 'object') return 'unknown';
    const mac = String(f.dst_mac || '').toLowerCase();
    const inAtm4 = (a) => inSubnet(a, lan.ipv4_subnet);
    const inAtm6 = (a) => inPrefix(a, lan.ipv6_prefix);

    // 1. Cisco discovery multicast (CDP and friends).
    if (mac === '01:00:0c:cc:cc:cc') return 'forbidden';
    // 2. IEEE 802.1 reserved group addresses (STP BPDUs, LLDP, ...).
    if (/^01:80:c2:00:00:0[0-9a-f]$/.test(mac)) return 'forbidden';
    // 3. ARP: allowed only when both sender and target are ATM addresses.
    if (f.ethertype === '0x0806') {
      if (!f.sender || !f.target) return 'unknown';
      return inAtm4(f.sender) && inAtm4(f.target) ? 'allowed' : 'forbidden';
    }
    if (f.ethertype !== '0x0800' && f.ethertype !== '0x86DD') return 'unknown';
    const proto = f.ip_proto;
    // 4. IGPs, multicast routing, multicast group management (IPv4).
    if (proto === 89 || proto === 103 || proto === 2) return 'forbidden';
    // 5. ICMPv6: read the type.
    if (proto === 58) {
      const t = f.icmpv6_type;
      if (MLD_TYPES.includes(t) || ROUTER_DISCOVERY_TYPES.includes(t)) return 'forbidden';
      if (t === 135 || t === 136) {
        if (!f.target) return 'unknown';
        return inAtm6(f.target) ? 'allowed' : 'forbidden';
      }
      return 'unknown';
    }
    const group = isGroupMac(mac) || isBroadcastOrMulticast(f.dst_ip, lan);
    // 6. MikroTik neighbor discovery.
    if (proto === 17 && f.dst_port === 5678) return 'forbidden';
    // 7. NTP: unicast is ordinary traffic; broadcast/multicast floods every member.
    if (proto === 17 && f.dst_port === 123) return group ? 'forbidden' : 'allowed';
    // 8. Any other broadcast/multicast is not something v1 teaches.
    if (group) return 'unknown';
    // 9. BGP between ATM addresses, and plain unicast to a peer router MAC.
    if (proto === 6 && f.dst_port === 179) {
      const v4 = inAtm4(f.src_ip) && inAtm4(f.dst_ip);
      const v6 = inAtm6(f.src_ip) && inAtm6(f.dst_ip);
      return v4 || v6 ? 'allowed' : 'unknown';
    }
    if (MAC_RE.test(mac) && !isGroupMac(mac)) return 'allowed';
    return 'unknown';
  }

  // ---------- Evaluation ----------
  const indexCache = new WeakMap();
  function lookup(catalog, typeId) {
    let idx = indexCache.get(catalog);
    if (!idx) {
      idx = new Map();
      for (const t of catalog) idx.set(t.id, t);
      indexCache.set(catalog, idx);
    }
    const t = idx.get(typeId);
    if (!t) throw new Error('Unknown packet type: ' + typeId);
    return t;
  }

  function evaluatePacket(instance, catalog, lan) {
    const type = lookup(catalog, instance.typeId);
    const recomputed = recomputeVerdict(instance.fields, lan);
    return { verdict: type.verdict, typeId: type.id, consistent: recomputed === type.verdict };
  }

  function evaluateAction(instance, action, catalog, lan) {
    const type = lookup(catalog, instance.typeId);
    const forbidden = type.verdict === 'forbidden';
    let outcome;
    if (action === 'zap') outcome = forbidden ? 'zap-correct' : 'zap-wrong';
    else if (action === 'let-through' || action === 'arrived') outcome = forbidden ? 'leak' : 'delivered';
    else throw new Error('Unknown action: ' + action);
    const correct = outcome === 'zap-correct' || outcome === 'delivered';
    return { correct, outcome, typeId: type.id };
  }

  PP.engine.rules = {
    parseIPv4, expandIPv6, inSubnet, inPrefix, isGroupMac, isBroadcastOrMulticast,
    recomputeVerdict, evaluatePacket, evaluateAction
  };
})(globalThis.PP);
