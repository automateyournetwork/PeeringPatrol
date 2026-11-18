# Contract — Data Files

The data files are the editable, human-audited ground truth (Constitution II). They load as
classic scripts **before** any engine file, contain **only data** (no functions, no computed
values), and are validated by `engine/validate.js` at load and by `tests/data.test.js`. Field
meanings and rules: [data-model.md](../data-model.md).

## `data/lan.js`
```js
PP.data.lan = {
  ipv4_subnet: "203.0.113.0/24",
  ipv6_prefix: "2001:db8:12::/64",
  members: [
    { slot: 0, asn: 64496, ipv4: "203.0.113.10", ipv6: "2001:db8:12::10", ll: "fe80::10", mac: "02:00:00:00:00:10" },
    // … 8 in total, AS64496–AS64503
  ],
  remote_examples:  { ipv4: ["198.51.100.20", "192.0.2.80"], ipv6: ["2001:db8:aa::20", "2001:db8:bb::80"] },
  outside_examples: { ipv4: ["198.51.100.1", "192.0.2.1"],   ipv6: ["2001:db8:99::1", "2001:db8:12:1::1"] }
};
```

## `data/packets.js` — 20 entries (the 18 spec catalog rows; two rows split)
```js
PP.data.packets = [
  {
    id: "ra", name: "IPv6 RA", verdict: "forbidden", phase: 4, delivery: "flood",
    fields: { dst_mac: "33:33:00:00:00:01", ethertype: "0x86DD", src_ip: "{src_ll}",
              dst_ip: "ff02::1", ip_proto: 58, icmpv6_type: 134 },
    deciding_field: "icmpv6_type",
    identifying: "ICMPv6 type 134, dst ff02::1",
    label: { short: "ICMPv6 134 → ff02::1" },
    feedback: {
      zapped: "A Router Advertisement tells every member \"I am a router\"…",
      leaked: "An RA from AS{src_asn} reached {n} members…",
      wrong_zap: null, delivered: null
    },
    fix: "Suppress IPv6 router advertisements on the IX-facing interface.",
    source: "NIC.br — Boas Práticas IX (BCOP course material)",
    source_status: "cited"
  },
  {
    id: "ntp-broadcast", variant_of: "ntp-unicast", name: "NTP", verdict: "forbidden", phase: 5,
    delivery: "flood",
    fields: { ethertype: "0x0800", src_ip: "{src_ip4}", ip_proto: 17, dst_port: 123 },
    variants: [
      { fields: { dst_mac: "ff:ff:ff:ff:ff:ff", dst_ip: "203.0.113.255" } },
      { fields: { dst_mac: "01:00:5e:00:01:01", dst_ip: "224.0.1.1" } },
      { fields: { dst_mac: "33:33:00:00:01:01", ethertype: "0x86DD", src_ip: "{src_ll}", dst_ip: "ff05::101" } }
    ],
    deciding_field: "dst_ip"
    // …
  }
  // …
];
```
- Required ids (v1): `bgp`, `unicast-v4`, `unicast-v6`, `arp`, `cdp`, `mndp`, `stp` (Phase 1);
  `ospf`, `ospfv3`, `pim` (2); `igmp`, `mld`, `ntp-unicast` (3); `ra`, `rs`, `ns`, `na` (4);
  `arp-outside-atm`, `ns-outside-atm`, `ntp-broadcast` (5). The spec rows "IPv4 / IPv6 unicast"
  and "NS / NA" are split so that labels and verdict checks stay exact.
- The transparency-note text (FR-004) is one constant in `engine/feedback.js`, shown when
  `source_status === "owner-confirmed"`; it is not repeated in the data.

## `data/phases.js`
```js
PP.data.phases = [
  { id: 1, title: "First shift — the shared segment", concept: "…", briefing: "…",
    introduces: { zap: ["cdp", "mndp", "stp"], let_through: ["bgp", "unicast-v4", "unicast-v6", "arp"] },
    mix: { forbidden_ratio: 0.5, new_type_bias: 0 },
    goal_zaps: 10, clear_accuracy: 0.8,
    spawn_interval_s: 1.5, travel_time_s: 2.6, max_packets: 6,
    label_detail: "name+field", leak_cost: 10, wrong_zap_cost: 20 },
  // 2–5 …
  { id: 6, title: "Endless shift", concept: "…", briefing: "…",
    introduces: { zap: [], let_through: [] },
    mix: { forbidden_ratio: 0.55, new_type_bias: 0 },
    goal_zaps: null, clear_accuracy: null, label_detail: "fields-only",
    spawn_interval_s: 0.95, travel_time_s: 1.9, max_packets: 16,
    speedup_every_zaps: 10, speedup_factor: 0.92, min_spawn_interval_s: 0.35, min_travel_time_s: 1.0,
    leak_cost: 10, wrong_zap_cost: 20 }
];
```

## Load-order contract (`index.html`)
`engine/namespace.js` → `data/lan.js` → `data/packets.js` → `data/phases.js` →
`engine/rng.js` → `engine/rules.js` → `engine/scoring.js` → `engine/spawner.js` →
`engine/labels.js` → `engine/feedback.js` → `engine/validate.js` → `engine/motion.js` →
`engine/effects.js` → `engine/audio.js` → `engine/renderer.js` → `engine/input.js` →
`engine/storage.js` → `views/screens.js` → `views/cards.js` → `views/hud.js` →
`views/menu.js` → `views/briefing.js` → `views/summary.js` → `views/challenge.js` → `main.js`.

## Change policy
A change to `packets.js` or `phases.js` is a **content change**: it needs `source` /
`source_status`, owner review before merge (constitution Content gate), and a passing
`node --test`. Reviewer and date are recorded in each data file's header comment.
