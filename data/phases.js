// Peering Patrol — phases (the prerequisite chain). DATA ONLY: no functions, no computed values.
// Schema: specs/001-peering-patrol-game/data-model.md → Phase; contract: contracts/data-files.md.
//
// Content review (constitution Content gate):
//   Phase 1 briefing — PENDING owner review (tasks.md T027)
//   Phase 2–5 briefings — PENDING owner review (tasks.md T052)
//   Endless briefing — PENDING owner review (tasks.md T057a)
PP.data.phases = [
  {
    id: 1,
    title: 'First shift — the shared segment',
    concept: 'One broadcast reaches everyone. Discovery protocols must be disabled on the IX-facing interface.',
    briefing: 'The IX peering LAN is one shared Layer 2 segment. Every broadcast or multicast frame a member sends lands on every other member\'s router. Only traffic meant for peering belongs here: BGP sessions, unicast traffic to a peer, and ARP for ATM addresses. Discovery protocols shout to everyone. Zap them before they flood the LAN.',
    introduces: { zap: ['cdp', 'mndp', 'stp'], let_through: ['bgp', 'unicast-v4', 'unicast-v6', 'arp'] },
    mix: { forbidden_ratio: 0.5, new_type_bias: 0 },
    goal_zaps: 10,
    clear_accuracy: 0.8,
    spawn_interval_s: 1.5,
    travel_time_s: 2.6,
    max_packets: 6,
    label_detail: 'name+field',
    leak_cost: 10,
    wrong_zap_cost: 20
  },
  {
    id: 2,
    title: 'Routing leaks',
    concept: 'No IGP or multicast routing on the IX: peering happens over BGP only.',
    briefing: 'Some members forgot that their IGP is enabled on the IX-facing interface. OSPF and OSPFv3 packets, and PIM for multicast routing, must never reach the peering LAN: two members whose IGPs meet here could exchange internal routes outside their BGP policy. Peering happens over BGP only.',
    introduces: { zap: ['ospf', 'ospfv3', 'pim'], let_through: [] },
    mix: { forbidden_ratio: 0.55, new_type_bias: 0.5 },
    goal_zaps: 10,
    clear_accuracy: 0.8,
    spawn_interval_s: 1.35,
    travel_time_s: 2.45,
    max_packets: 7,
    label_detail: 'name+field',
    leak_cost: 10,
    wrong_zap_cost: 20
  },
  {
    id: 3,
    title: 'Multicast chatter',
    concept: 'Multicast group management has no place on a unicast peering LAN, and a well-known port alone does not make traffic bad.',
    briefing: 'IGMP and MLD manage multicast group membership. The ATM LAN carries unicast peering traffic, so this chatter only floods every member. Watch out: NTP sent unicast to a specific peer is ordinary traffic and must pass.',
    introduces: { zap: ['igmp', 'mld'], let_through: ['ntp-unicast'] },
    mix: { forbidden_ratio: 0.55, new_type_bias: 0.45 },
    goal_zaps: 10,
    clear_accuracy: 0.8,
    spawn_interval_s: 1.25,
    travel_time_s: 2.3,
    max_packets: 8,
    label_detail: 'name+field',
    leak_cost: 10,
    wrong_zap_cost: 20
  },
  {
    id: 4,
    title: 'Neighbor discovery',
    concept: 'Everything is ICMPv6: read the type.',
    briefing: 'IPv6 Neighbor Discovery is all ICMPv6, so the type decides. Neighbor Solicitation (135) and Neighbor Advertisement (136) for ATM addresses are address resolution, the IPv6 version of ARP, and must pass. Router Advertisement (134) and Router Solicitation (133) are about autoconfiguration, which has no place on the IX LAN.',
    introduces: { zap: ['ra', 'rs'], let_through: ['ns', 'na'] },
    mix: { forbidden_ratio: 0.55, new_type_bias: 0.45 },
    goal_zaps: 10,
    clear_accuracy: 0.8,
    spawn_interval_s: 1.15,
    travel_time_s: 2.15,
    max_packets: 9,
    label_detail: 'name+field',
    leak_cost: 10,
    wrong_zap_cost: 20
  },
  {
    id: 5,
    title: 'Read the details',
    concept: 'Same protocol, different verdict.',
    briefing: 'ARP and Neighbor Solicitation are allowed only for addresses inside the ATM subnet and prefix. NTP is allowed only as unicast. Each label now highlights the field that decides: read it before you fire.',
    introduces: { zap: ['arp-outside-atm', 'ns-outside-atm', 'ntp-broadcast'], let_through: [] },
    mix: { forbidden_ratio: 0.55, new_type_bias: 0.6 },
    goal_zaps: 10,
    clear_accuracy: 0.8,
    spawn_interval_s: 1.05,
    travel_time_s: 2.05,
    max_packets: 10,
    label_detail: 'name+deciding',
    leak_cost: 10,
    wrong_zap_cost: 20
  },
  {
    id: 6,
    title: 'Endless shift',
    concept: 'The recall test: labels show only header fields.',
    briefing: 'Every packet type is back, and labels no longer show protocol names, only what a capture would show: destination MAC, EtherType, protocol, addresses, ports, and ICMPv6 types. Speed rises every 10 correct zaps. The shift ends when LAN integrity runs out.',
    introduces: { zap: [], let_through: [] },
    mix: { forbidden_ratio: 0.55, new_type_bias: 0 },
    goal_zaps: null,
    clear_accuracy: null,
    spawn_interval_s: 0.95,
    travel_time_s: 1.9,
    max_packets: 16,
    label_detail: 'fields-only',
    leak_cost: 10,
    wrong_zap_cost: 20,
    speedup_every_zaps: 10,
    speedup_factor: 0.92,
    min_spawn_interval_s: 0.35,
    min_travel_time_s: 1.0
  }
];
