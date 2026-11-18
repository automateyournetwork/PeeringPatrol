// Peering Patrol — the ATM peering LAN. DATA ONLY (no functions, no computed values).
// Documentation ranges only (RFC 5737 / RFC 3849 / RFC 5398): no real member, address, or ASN.
// Schema: specs/001-peering-patrol-game/data-model.md → LAN, Member.
PP.data.lan = {
  ipv4_subnet: '203.0.113.0/24',
  ipv6_prefix: '2001:db8:12::/64',
  members: [
    { slot: 0, asn: 64496, ipv4: '203.0.113.10', ipv6: '2001:db8:12::10', ll: 'fe80::10', mac: '02:00:5e:10:00:0a' },
    { slot: 1, asn: 64497, ipv4: '203.0.113.20', ipv6: '2001:db8:12::20', ll: 'fe80::20', mac: '02:00:5e:10:00:14' },
    { slot: 2, asn: 64498, ipv4: '203.0.113.30', ipv6: '2001:db8:12::30', ll: 'fe80::30', mac: '02:00:5e:10:00:1e' },
    { slot: 3, asn: 64499, ipv4: '203.0.113.40', ipv6: '2001:db8:12::40', ll: 'fe80::40', mac: '02:00:5e:10:00:28' },
    { slot: 4, asn: 64500, ipv4: '203.0.113.50', ipv6: '2001:db8:12::50', ll: 'fe80::50', mac: '02:00:5e:10:00:32' },
    { slot: 5, asn: 64501, ipv4: '203.0.113.60', ipv6: '2001:db8:12::60', ll: 'fe80::60', mac: '02:00:5e:10:00:3c' },
    { slot: 6, asn: 64502, ipv4: '203.0.113.70', ipv6: '2001:db8:12::70', ll: 'fe80::70', mac: '02:00:5e:10:00:46' },
    { slot: 7, asn: 64503, ipv4: '203.0.113.80', ipv6: '2001:db8:12::80', ll: 'fe80::80', mac: '02:00:5e:10:00:50' }
  ],
  // Destinations behind a peer (ordinary traffic exchanged over the IX). Outside the ATM range.
  remote_examples: {
    ipv4: ['198.51.100.20', '198.51.100.77', '192.0.2.80'],
    ipv6: ['2001:db8:aa::20', '2001:db8:bb::80']
  },
  // Non-IX addresses a misconfigured member might use on its IX interface. Outside the ATM range.
  outside_examples: {
    ipv4: ['198.51.100.1', '192.0.2.1', '192.0.2.254'],
    ipv6: ['2001:db8:99::1', '2001:db8:12:1::1']
  }
};
