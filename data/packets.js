// Peering Patrol — packet catalog (v1 ground truth). DATA ONLY: no functions, no computed values.
// Schema: specs/001-peering-patrol-game/data-model.md → PacketType; contract: contracts/data-files.md.
// Every entry: verdict is re-derived from `fields` by engine/rules.js; a mismatch excludes the entry.
//
// Content review (constitution Content gate):
//   Phase 1 entries — PENDING owner review (tasks.md T027)
//   Phase 2–5 entries — PENDING owner review (tasks.md T052)
//
// "cited"           = listed in NIC.br's IX good-practices course material ("Boas Práticas IX", BCOP).
// "owner-confirmed" = confirmed by the project owner against IX.br policy; players see a note that
//                     the official citation is pending (spec FR-004).
PP.data.packets = [
  // ---------------------------------------------------------------- Phase 1: the shared segment
  {
    id: 'bgp',
    name: 'BGP',
    verdict: 'allowed',
    phase: 1,
    delivery: 'unicast',
    fields: { dst_mac: '{dst_mac}', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '{dst_ip4}', ip_proto: 6, dst_port: 179 },
    variants: [
      {},
      { fields: { ethertype: '0x86DD', src_ip: '{src_ip6}', dst_ip: '{dst_ip6}' } }
    ],
    deciding_field: 'dst_port',
    identifying: 'TCP port 179, unicast between ATM addresses',
    label: { short: 'TCP 179 → AS{dst_asn}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was BGP between AS{src_asn} and AS{dst_asn}. BGP sessions are exactly what the IX is for: dropping them breaks the peering, and the routes the two members exchange disappear.',
      delivered: 'BGP between AS{src_asn} and AS{dst_asn}: the peering session the IX exists for.'
    },
    wrong_zap_banner: 'AS{src_asn} ⇎ AS{dst_asn}',
    fix: 'Never filter BGP between members\' ATM addresses. It is the reason the peering LAN exists.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'unicast-v4',
    name: 'IPv4 unicast',
    verdict: 'allowed',
    phase: 1,
    delivery: 'unicast',
    fields: { dst_mac: '{dst_mac}', ethertype: '0x0800', dst_ip: '{remote_ip4}', ip_proto: 6, dst_port: 443 },
    deciding_field: 'dst_mac',
    identifying: 'unicast to a peer router\'s MAC',
    label: { short: 'unicast → AS{dst_asn}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was ordinary IPv4 traffic from AS{src_asn} to AS{dst_asn}, sent to the peer router\'s own MAC address. Exchanging this traffic is the whole point of peering; dropping it breaks real users\' connections.',
      delivered: 'Unicast IPv4 to AS{dst_asn}\'s router: the traffic the IX carries.'
    },
    fix: 'Never filter unicast traffic between members: exchanging it is the purpose of peering.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'unicast-v6',
    name: 'IPv6 unicast',
    verdict: 'allowed',
    phase: 1,
    delivery: 'unicast',
    fields: { dst_mac: '{dst_mac}', ethertype: '0x86DD', dst_ip: '{remote_ip6}', ip_proto: 6, dst_port: 443 },
    deciding_field: 'dst_mac',
    identifying: 'unicast to a peer router\'s MAC',
    label: { short: 'unicast → AS{dst_asn}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was ordinary IPv6 traffic from AS{src_asn} to AS{dst_asn}, sent to the peer router\'s own MAC address. Exchanging this traffic is the whole point of peering; dropping it breaks real users\' connections.',
      delivered: 'Unicast IPv6 to AS{dst_asn}\'s router: the traffic the IX carries.'
    },
    fix: 'Never filter unicast traffic between members: exchanging it is the purpose of peering.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'arp',
    name: 'ARP',
    verdict: 'allowed',
    phase: 1,
    delivery: 'flood',
    fields: { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0806', sender: '{src_ip4}', target: '{dst_ip4}' },
    deciding_field: 'target',
    identifying: 'EtherType 0x0806, target IP in 203.0.113.0/24',
    label: { short: 'who-has {dst_ip4}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was ARP from AS{src_asn} asking for {target}, an address inside the ATM subnet {atm4}. Members need ARP to find each other\'s MAC address; without it no BGP session can come up.',
      delivered: 'ARP for {target}, inside the ATM subnet: how peers find each other\'s MAC address.'
    },
    fix: 'Never filter ARP for ATM addresses: it is how members reach each other on the LAN.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'cdp',
    name: 'CDP',
    verdict: 'forbidden',
    phase: 1,
    delivery: 'flood',
    fields: { dst_mac: '01:00:0c:cc:cc:cc', ethertype: '802.3', llc: 'SNAP PID 0x2000' },
    deciding_field: 'dst_mac',
    identifying: 'dst MAC 01:00:0c:cc:cc:cc, SNAP PID 0x2000',
    label: { short: '01:00:0c:cc:cc:cc' },
    feedback: {
      zapped: 'Cisco Discovery Protocol (CDP) announces the router\'s name, model, software version, and interface to every device on the segment. On the peering LAN that means every member, and none of them need it.',
      leaked: 'A CDP frame from AS{src_asn} reached {n} members, telling all of them about its router.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable CDP on the IX-facing interface.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'mndp',
    name: 'MNDP',
    verdict: 'forbidden',
    phase: 1,
    delivery: 'flood',
    fields: { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '255.255.255.255', ip_proto: 17, dst_port: 5678 },
    deciding_field: 'dst_port',
    identifying: 'UDP port 5678, broadcast',
    label: { short: 'UDP 5678 broadcast' },
    feedback: {
      zapped: 'MikroTik Neighbor Discovery Protocol (MNDP) broadcasts the router\'s identity, version, and addresses to the whole segment. On the peering LAN every member receives it.',
      leaked: 'An MNDP broadcast from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable neighbor discovery (MNDP) on the IX-facing interface.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'stp',
    name: 'STP BPDU',
    verdict: 'forbidden',
    phase: 1,
    delivery: 'flood',
    fields: { dst_mac: '01:80:c2:00:00:00', ethertype: '802.3', llc: 'DSAP 0x42' },
    deciding_field: 'dst_mac',
    identifying: 'dst MAC 01:80:c2:00:00:00',
    label: { short: '01:80:c2:00:00:00' },
    feedback: {
      zapped: 'A Spanning Tree BPDU means the member\'s port is running spanning tree toward the IX. The IX fabric is not part of any member\'s switched network, and BPDUs can disturb it.',
      leaked: 'A BPDU from AS{src_asn} reached the IX fabric and {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable spanning tree on the IX-facing port: connect a router port, not a switch running STP.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  // ---------------------------------------------------------------- Phase 2: routing leaks
  {
    id: 'ospf',
    name: 'OSPF',
    verdict: 'forbidden',
    phase: 2,
    delivery: 'flood',
    fields: { dst_mac: '01:00:5e:00:00:05', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '224.0.0.5', ip_proto: 89 },
    variants: [
      {},
      { fields: { dst_mac: '01:00:5e:00:00:06', dst_ip: '224.0.0.6' }, label: { short: 'proto 89 → 224.0.0.6' } }
    ],
    deciding_field: 'ip_proto',
    identifying: 'IP protocol 89, dst 224.0.0.5 / 224.0.0.6',
    label: { short: 'proto 89 → 224.0.0.5' },
    feedback: {
      zapped: 'OSPF packets (IP protocol 89 to 224.0.0.5 or 224.0.0.6) mean an IGP is running on the IX-facing interface. If two members\' OSPF processes form an adjacency here, they exchange internal routes over the IX, outside their BGP policy.',
      leaked: 'OSPF from AS{src_asn} reached {n} members. Any member with OSPF on its IX interface could form an adjacency with it.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Remove the IX-facing interface from OSPF, or make it passive.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'ospfv3',
    name: 'OSPFv3',
    verdict: 'forbidden',
    phase: 2,
    delivery: 'flood',
    fields: { dst_mac: '33:33:00:00:00:05', ethertype: '0x86DD', src_ip: '{src_ll}', dst_ip: 'ff02::5', ip_proto: 89 },
    variants: [
      {},
      { fields: { dst_mac: '33:33:00:00:00:06', dst_ip: 'ff02::6' }, label: { short: 'next hdr 89 → ff02::6' } }
    ],
    deciding_field: 'ip_proto',
    identifying: 'next header 89, dst ff02::5 / ff02::6',
    label: { short: 'next hdr 89 → ff02::5' },
    feedback: {
      zapped: 'OSPFv3 packets (next header 89 to ff02::5 or ff02::6) mean an IPv6 IGP is running on the IX-facing interface. IGPs must never run on the peering LAN: peering happens over BGP only.',
      leaked: 'OSPFv3 from AS{src_asn} reached {n} members. Any member with OSPFv3 on its IX interface could form an adjacency with it.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Remove the IX-facing interface from OSPFv3, or make it passive.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'pim',
    name: 'PIM',
    verdict: 'forbidden',
    phase: 2,
    delivery: 'flood',
    fields: { dst_mac: '01:00:5e:00:00:0d', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '224.0.0.13', ip_proto: 103 },
    variants: [
      {},
      { fields: { dst_mac: '33:33:00:00:00:0d', ethertype: '0x86DD', src_ip: '{src_ll}', dst_ip: 'ff02::d' }, label: { short: 'next hdr 103 → ff02::d' } }
    ],
    deciding_field: 'ip_proto',
    identifying: 'IP protocol 103, dst 224.0.0.13 / ff02::d',
    label: { short: 'proto 103 → 224.0.0.13' },
    feedback: {
      zapped: 'PIM Hellos (protocol 103) mean multicast routing is enabled on the IX-facing interface. Multicast routing is not part of unicast peering on the ATM LAN.',
      leaked: 'PIM from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable PIM on the IX-facing interface.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  // ---------------------------------------------------------------- Phase 3: multicast chatter
  {
    id: 'igmp',
    name: 'IGMP',
    verdict: 'forbidden',
    phase: 3,
    delivery: 'flood',
    fields: { dst_mac: '01:00:5e:00:00:16', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '224.0.0.22', ip_proto: 2 },
    variants: [
      {},
      { fields: { dst_mac: '01:00:5e:00:00:01', dst_ip: '224.0.0.1' }, label: { short: 'proto 2 → 224.0.0.1' } }
    ],
    deciding_field: 'ip_proto',
    identifying: 'IP protocol 2',
    label: { short: 'proto 2 → 224.0.0.22' },
    feedback: {
      zapped: 'IGMP (protocol 2) manages IPv4 multicast group membership. The ATM LAN carries unicast peering traffic, so group management has no place here, and every member hears it.',
      leaked: 'IGMP from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable IGMP and IPv4 multicast on the IX-facing interface.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'mld',
    name: 'MLD',
    verdict: 'forbidden',
    phase: 3,
    delivery: 'flood',
    fields: { dst_mac: '33:33:00:00:00:16', ethertype: '0x86DD', src_ip: '{src_ll}', dst_ip: 'ff02::16', ext_hdr: 'hop-by-hop', ip_proto: 58, icmpv6_type: 143 },
    variants: [
      {},
      { fields: { dst_mac: '33:33:00:00:00:01', dst_ip: 'ff02::1', icmpv6_type: 130 }, label: { short: 'ICMPv6 130 → ff02::1' } },
      { fields: { dst_mac: '33:33:00:00:00:02', dst_ip: 'ff02::2', icmpv6_type: 132 }, label: { short: 'ICMPv6 132 → ff02::2' } }
    ],
    deciding_field: 'icmpv6_type',
    identifying: 'ICMPv6 type 130 / 131 / 132 / 143',
    label: { short: 'ICMPv6 143 → ff02::16' },
    feedback: {
      zapped: 'MLD (Multicast Listener Discovery, ICMPv6 type {icmpv6_type}) manages IPv6 multicast group membership. Like IGMP for IPv4, it has no place on a unicast peering LAN.',
      leaked: 'MLD from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable MLD (IPv6 multicast listener signalling) on the IX-facing interface.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'ntp-unicast',
    name: 'NTP',
    verdict: 'allowed',
    phase: 3,
    delivery: 'unicast',
    fields: { dst_mac: '{dst_mac}', ethertype: '0x0800', src_ip: '{src_ip4}', dst_ip: '{dst_ip4}', ip_proto: 17, dst_port: 123 },
    variants: [
      {},
      { fields: { ethertype: '0x86DD', src_ip: '{src_ip6}', dst_ip: '{dst_ip6}' } }
    ],
    deciding_field: 'dst_ip',
    identifying: 'UDP 123, unicast to a peer',
    label: { short: 'UDP 123 → {dst_ip}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was unicast NTP from AS{src_asn} to AS{dst_asn}: ordinary IP traffic between two members. UDP port 123 alone does not make traffic bad; only broadcast or multicast NTP floods the LAN.',
      delivered: 'Unicast NTP from AS{src_asn} to AS{dst_asn}: ordinary traffic between members.'
    },
    fix: 'Never filter unicast NTP between members. Only broadcast and multicast NTP are not allowed.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  // ---------------------------------------------------------------- Phase 4: neighbor discovery
  {
    id: 'ra',
    name: 'IPv6 RA',
    verdict: 'forbidden',
    phase: 4,
    delivery: 'flood',
    fields: { dst_mac: '33:33:00:00:00:01', ethertype: '0x86DD', src_ip: '{src_ll}', dst_ip: 'ff02::1', ip_proto: 58, icmpv6_type: 134 },
    deciding_field: 'icmpv6_type',
    identifying: 'ICMPv6 type 134, dst ff02::1',
    label: { short: 'ICMPv6 134 → ff02::1' },
    feedback: {
      zapped: 'A Router Advertisement (ICMPv6 type 134) tells every member "I am a router, use me". Members with autoconfiguration enabled could pick up addresses or a default route from it.',
      leaked: 'A Router Advertisement from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Suppress IPv6 router advertisements on the IX-facing interface.',
    source: 'NIC.br — Boas Práticas IX (BCOP course material): https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf',
    source_status: 'cited'
  },
  {
    id: 'rs',
    name: 'IPv6 RS',
    verdict: 'forbidden',
    phase: 4,
    delivery: 'flood',
    fields: { dst_mac: '33:33:00:00:00:02', ethertype: '0x86DD', src_ip: '{src_ll}', dst_ip: 'ff02::2', ip_proto: 58, icmpv6_type: 133 },
    deciding_field: 'icmpv6_type',
    identifying: 'ICMPv6 type 133, dst ff02::2',
    label: { short: 'ICMPv6 133 → ff02::2' },
    feedback: {
      zapped: 'A Router Solicitation (ICMPv6 type 133) asks every router on the segment to announce itself. It means the member\'s interface is trying to autoconfigure, and nothing should autoconfigure on the IX LAN.',
      leaked: 'A Router Solicitation from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable IPv6 autoconfiguration on the IX-facing interface and configure the assigned ATM address statically.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'ns',
    name: 'NS',
    verdict: 'allowed',
    phase: 4,
    delivery: 'flood',
    fields: { dst_mac: '{sn_mac_dst}', ethertype: '0x86DD', src_ip: '{src_ip6}', dst_ip: '{sn_ip_dst}', ip_proto: 58, icmpv6_type: 135, target: '{dst_ip6}' },
    deciding_field: 'target',
    identifying: 'ICMPv6 type 135, target in 2001:db8:12::/64',
    label: { short: 'ICMPv6 135 · target {dst_ip6}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was a Neighbor Solicitation (ICMPv6 type 135) from AS{src_asn} for {target}, inside the ATM prefix {atm6}. It is IPv6 address resolution, the IPv6 version of ARP. Without it IPv6 BGP sessions cannot come up.',
      delivered: 'Neighbor Solicitation for {target}, inside the ATM prefix: IPv6 address resolution.'
    },
    fix: 'Never filter Neighbor Discovery for ATM addresses: it is how members reach each other over IPv6.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'na',
    name: 'NA',
    verdict: 'allowed',
    phase: 4,
    delivery: 'unicast',
    fields: { dst_mac: '{dst_mac}', ethertype: '0x86DD', src_ip: '{src_ip6}', dst_ip: '{dst_ip6}', ip_proto: 58, icmpv6_type: 136, target: '{src_ip6}' },
    deciding_field: 'target',
    identifying: 'ICMPv6 type 136, target in 2001:db8:12::/64',
    label: { short: 'ICMPv6 136 · target {src_ip6}' },
    feedback: {
      zapped: null,
      leaked: null,
      wrong_zap: 'That was a Neighbor Advertisement (ICMPv6 type 136) from AS{src_asn} answering for {target}, inside the ATM prefix. It tells AS{dst_asn} which MAC address to use; dropping it breaks IPv6 between them.',
      delivered: 'Neighbor Advertisement for {target}: IPv6 address resolution between peers.'
    },
    fix: 'Never filter Neighbor Discovery for ATM addresses: it is how members reach each other over IPv6.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  // ---------------------------------------------------------------- Phase 5: read the details
  {
    id: 'arp-outside-atm',
    variant_of: 'arp',
    name: 'ARP',
    verdict: 'forbidden',
    phase: 5,
    delivery: 'flood',
    fields: { dst_mac: 'ff:ff:ff:ff:ff:ff', ethertype: '0x0806', sender: '{src_ip4}', target: '{out_ip4}' },
    variants: [
      {},
      { fields: { sender: '{out_ip4}', target: '{dst_ip4}' }, deciding_field: 'sender', label: { short: 'who-has {dst_ip4} tell {out_ip4}' } }
    ],
    deciding_field: 'target',
    identifying: 'EtherType 0x0806, an address not in 203.0.113.0/24',
    label: { short: 'who-has {out_ip4}' },
    feedback: {
      zapped: 'This ARP uses {out_ip4}, an address outside the ATM subnet {atm4}. It means a non-IX address is configured on the member\'s IX interface, and every member hears it.',
      leaked: 'ARP involving a non-ATM address ({out_ip4}) from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Configure only the ATM address assigned by the IX on the IX-facing interface; remove any other IPv4 addresses from it.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'ns-outside-atm',
    variant_of: 'ns',
    name: 'NS',
    verdict: 'forbidden',
    phase: 5,
    delivery: 'flood',
    fields: { dst_mac: '{sn_mac_out}', ethertype: '0x86DD', src_ip: '{src_ip6}', dst_ip: '{sn_ip_out}', ip_proto: 58, icmpv6_type: 135, target: '{out_ip6}' },
    deciding_field: 'target',
    identifying: 'ICMPv6 type 135, target not in 2001:db8:12::/64',
    label: { short: 'ICMPv6 135 · target {out_ip6}' },
    feedback: {
      zapped: 'This Neighbor Solicitation looks for {out_ip6}, outside the ATM prefix {atm6}. It means a non-IX IPv6 address or prefix is configured on the member\'s IX interface.',
      leaked: 'A Neighbor Solicitation for a non-ATM address from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Configure only the IPv6 address assigned by the IX on the IX-facing interface; remove other prefixes from it.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  },
  {
    id: 'ntp-broadcast',
    variant_of: 'ntp-unicast',
    name: 'NTP',
    verdict: 'forbidden',
    phase: 5,
    delivery: 'flood',
    fields: { ethertype: '0x0800', src_ip: '{src_ip4}', ip_proto: 17, dst_port: 123 },
    variants: [
      { fields: { dst_mac: 'ff:ff:ff:ff:ff:ff', dst_ip: '203.0.113.255' } },
      { fields: { dst_mac: '01:00:5e:00:01:01', dst_ip: '224.0.1.1' } },
      { fields: { dst_mac: '33:33:00:00:01:01', ethertype: '0x86DD', src_ip: '{src_ip6}', dst_ip: 'ff05::101' } },
      { fields: { dst_mac: '33:33:00:00:01:01', ethertype: '0x86DD', src_ip: '{src_ll}', dst_ip: 'ff02::101' } }
    ],
    deciding_field: 'dst_ip',
    identifying: 'UDP 123 to broadcast or 224.0.1.1 / ff0x::101',
    label: { short: 'UDP 123 → {dst_ip}' },
    feedback: {
      zapped: 'NTP sent to {dst_ip}, a broadcast or multicast address, floods every member. NTP between members is fine only as unicast.',
      leaked: 'Broadcast or multicast NTP from AS{src_asn} reached {n} members.',
      wrong_zap: null,
      delivered: null
    },
    fix: 'Disable NTP broadcast and multicast modes on the IX-facing interface; use unicast NTP only.',
    source: 'Confirmed by the project owner against IX.br policy on 2026-11-18; official citation pending.',
    source_status: 'owner-confirmed'
  }
];
