# Data Model — Peering Patrol v1 (revised 2026-11-18)

File-level schemas and examples: [contracts/data-files.md](./contracts/data-files.md). This
document defines entities, constraints, relationships, validation rules, and state transitions.

## Entities

### LAN (`data/lan.js`, one object)
| Field | Type | Rule |
|---|---|---|
| `ipv4_subnet` | CIDR string | MUST be `203.0.113.0/24` |
| `ipv6_prefix` | prefix string | MUST be `2001:db8:12::/64` |
| `members` | Member[] | exactly 8; ASN, IPv4, IPv6, link-local, MAC, and slot all unique |
| `remote_examples` | `{ ipv4: string[], ipv6: string[] }` | non-empty; documentation ranges; **outside** the ATM subnet/prefix (destinations behind a peer) |
| `outside_examples` | `{ ipv4: string[], ipv6: string[] }` | non-empty; documentation ranges; **outside** the ATM subnet/prefix (misconfigured non-IX addresses) |

### Member
| Field | Type | Rule |
|---|---|---|
| `asn` | int | 64496–64503 |
| `ipv4` | string | inside `ipv4_subnet` |
| `ipv6` | string | inside `ipv6_prefix` |
| `ll` | string | IPv6 link-local, inside `fe80::/10` |
| `mac` | string | unicast MAC (group bit clear) |
| `slot` | int 0–7 | position on the ellipse; the renderer computes pixels |

### PacketType (`data/packets.js`, 20 entries for the 18 spec catalog rows)
| Field | Type | Rule |
|---|---|---|
| `id` | slug | unique; required ids listed in contracts/data-files.md |
| `name` | string | protocol name shown in labels (not in endless) and on cards |
| `verdict` | `allowed` \| `forbidden` | MUST equal `rules.recomputeVerdict` for every instance |
| `phase` | int 1–5 | the phase that introduces the type |
| `delivery` | `unicast` \| `flood` | `flood` ⇔ dst MAC is a group (broadcast or multicast) address, for every variant |
| `fields` | object | structured header values (keys below); string values may contain `{templates}` |
| `variants` | object[], optional | each `{ fields?, deciding_field?, label? }` overrides the base for one concrete form; one is picked uniformly per instance |
| `variant_of` | id, optional | the base type of a "same protocol, different verdict" pair; MUST have a lower `phase` |
| `deciding_field` | key of `fields` | the field that decides the verdict; highlighted by hints and in Phase 5 |
| `identifying` | string | the spec catalog's "Identifying fields" text, shown on briefing chips |
| `label` | `{ short }` | the one-field label for phases 1–4 (templates allowed) |
| `feedback` | `{ zapped, leaked, wrong_zap, delivered }` | forbidden: `zapped` + `leaked` non-empty, others null; allowed: `wrong_zap` + `delivered` non-empty, others null |
| `fix` | string | the member's corrective action (forbidden) or why it must never be filtered (allowed) |
| `source` | string | non-empty citation or owner-confirmation note |
| `source_status` | `cited` \| `owner-confirmed` | `owner-confirmed` ⇒ cards show the transparency note |
| `conflict` | bool, optional | `true` ⇒ excluded from play |

`fields` keys: `dst_mac`, `ethertype` (`0x0800` \| `0x86DD` \| `0x0806` \| `802.3`), `llc`,
`src_ip`, `dst_ip`, `ext_hdr` (optional, `hop-by-hop`: IPv6 next header is 0 before ICMPv6, as in
MLD), `ip_proto` (int), `dst_port` (int), `icmpv6_type` (int), `sender`, `target`.

Optional `wrong_zap_banner` (string, templates allowed): banner shown on a wrong zap of this type
(BGP: `AS{src_asn} ⇎ AS{dst_asn}`), so no packet fact is hardcoded in the views (FR-040).

Template keys filled per instance: `{src_ip4}`, `{dst_ip4}`, `{src_ip6}`, `{dst_ip6}`,
`{src_ll}`, `{dst_mac}`, `{remote_ip4}`, `{remote_ip6}`, `{out_ip4}`, `{out_ip6}`,
`{sn_ip_dst}`, `{sn_mac_dst}`, `{sn_ip_out}`, `{sn_mac_out}` (solicited-node address and MAC for
the peer's / the outside IPv6 address), and in copy also `{src_asn}`, `{dst_asn}`, `{n}`,
`{atm4}`, `{atm6}`, plus any filled field key (e.g. `{target}`, `{dst_ip}`, `{icmpv6_type}`).

### Phase (`data/phases.js`, 6 entries)
| Field | Type | Rule |
|---|---|---|
| `id` | int 1–6 | consecutive from 1; 6 = endless |
| `title`, `concept`, `briefing` | string | non-empty |
| `introduces` | `{ zap: id[], let_through: id[] }` | `zap` ids are forbidden, `let_through` ids allowed, all with `phase === id`; together they list **every** type of that phase; endless: both empty |
| `mix` | `{ forbidden_ratio, new_type_bias }` | numbers in 0–1 |
| `goal_zaps` | int \| null | 10 for 1–5; `null` for endless |
| `clear_accuracy` | number \| null | 0.80 for 1–5; `null` for endless |
| `spawn_interval_s`, `travel_time_s` | number | > 0 |
| `max_packets` | int | > 0; 16 for endless |
| `label_detail` | `name+field` \| `name+deciding` \| `fields-only` | 1–4 / 5 / endless |
| `leak_cost`, `wrong_zap_cost` | int | > 0 and `wrong_zap_cost > leak_cost` |
| `speedup_every_zaps`, `speedup_factor` | int, number | endless only: 10 and 0 < factor < 1 |
| `min_spawn_interval_s`, `min_travel_time_s` | number | endless only: floors for speed-ups |

### PacketInstance (runtime)
`{ uid, typeId, src (slot), peer (slot), targets (slot[]: one peer, or all 7 others for flood),
fields (filled), decidingField, labelShort, labelDetail, hinted, ctx (template values), t
(0–2 travel progress), dur, held, state }`

### ShiftState (runtime, owned by `engine/scoring.js`)
| Field | Meaning |
|---|---|
| `mode` | `arcade` \| `practice` |
| `startPhaseId`, `phaseId`, `phaseReached` | where the shift began, current phase, highest phase entered |
| `integrity` | 0–100; starts at 100; carries across phases |
| `score`, `combo`, `bestCombo` | carry across phases |
| `phaseCounts` | `{ zapCorrect, zapWrong, leak, delivered }` for the current phase (reset on entering a phase) |
| `shiftCounts` | the same four counts for the whole shift |
| `endlessCorrectZaps` | correct zaps made in endless during this shift |
| `speedLevel` | endless speed step = floor(endless correct zaps / `speedup_every_zaps`) |
| `phaseMissed`, `shiftMissed` | ordered unique type ids leaked or misjudged (phase / shift) |
| `hintTypes` | type ids whose next instance is hinted |
| `status` | `running` \| `phase-cleared` \| `not-cleared` \| `integrity-out` \| `quit` |

### PhaseResult (derived when `status === "phase-cleared"`)
`{ phaseId, score, phaseAccuracy, bestCombo, integrity, reviewTypes, unlocks: [phaseId + 1] }`

### ShiftResult (derived when the shift ends)
| Field | Meaning |
|---|---|
| `status` | `not-cleared` \| `integrity-out` \| `quit` |
| `mode`, `startPhaseId`, `phaseReached` | as in ShiftState |
| `score`, `zapped` (shift correct zaps), `accuracy` (shift), `bestCombo` | stat tiles |
| `endlessCorrectZaps` | for records |
| `reviewTypes` | `shiftMissed` |
| `restartPhaseId` | the phase reached (it is unlocked) |
| `newRecords` | subset of `["shiftScore", "endlessCorrectZaps"]` |

### SavedProgress (`localStorage["peeringPatrol.v1"]`)
| Field | Rule |
|---|---|
| `settings` | `{ mode: "arcade" \| "practice", muted: bool }` |
| `unlocked` | sorted unique ints 1–6; always contains 1 |
| `best` | `{ arcade: { shiftScore, endlessCorrectZaps }, practice: { shiftScore, endlessCorrectZaps } }`, non-negative ints |

## Relationships
- Phase k —introduces→ the PacketTypes with `phase === k`. Phase k's mix = all non-excluded
  types with `phase ≤ k` (endless: all non-excluded types).
- PacketType —`variant_of`→ PacketType (the base of a variant pair).
- PacketInstance —is of→ PacketType; —from→ Member; —to→ one Member or all 7 others.
- ShiftState —yields→ PhaseResult (per cleared phase) and one ShiftResult → updates SavedProgress.

## Validation rules (`engine/validate.js`, `tests/data.test.js`)
1. `PP.data.lan`, `PP.data.packets` (array), and `PP.data.phases` (array) exist and match the
   schemas above → otherwise the **error screen**.
2. Phase ids are consecutive from 1; every id in `introduces` exists; each phase introduces
   exactly the types with that `phase`; `zap` lists only forbidden, `let_through` only allowed.
3. Variant chain: `variant_of` exists and has a lower `phase`, covering `arp-outside-atm` →
   `arp`, `ns-outside-atm` → `ns`, `ntp-broadcast` → `ntp-unicast`.
4. Empty `source` or invalid `source_status` → type **excluded**.
5. `conflict: true`, a recomputed verdict that differs from `verdict` or is `unknown`, a delivery
   that does not match the dst MAC, or an unfilled template → type **excluded**.
6. A teaching phase (1–5) whose introduced types are all excluded, or endless if no playable
   types remain at all → **empty-state** screen for that phase.
7. Every literal IPv4 is in `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`,
   or is `255.255.255.255`; every literal IPv6 is in `2001:db8::/32`, `fe80::/10`, or `ff00::/8`;
   ASNs are 64496–64503 → otherwise the **error screen**.

## State transitions

### Screens (`main.js`)
```
loading ──ok──▶ menu ──start shift at unlocked phase──▶ briefing ──start──▶ play
   │              ▲                                         ▲                │
   └─invalid─▶ error                                        │      phase-cleared ─▶ phase summary ──continue──┘
                  │                                                          │
                  ├─ phase empty after exclusions ─▶ empty-state             └─ not-cleared / integrity-out / quit
                  └──────────── menu / restart from phase reached ◀── shift summary ◀┘
```

### Packet instance
```
spawned ─▶ inbound (zappable) ──(practice: reaches hold point)──▶ held ──zap──▶ zapped
              │                                                     └─let-through─▶ outbound
              ├─zap──▶ zapped
              └─reaches LAN─▶ outbound (unicast to one peer, or split into 7 copies) ─▶ arrived
outcome: zapped ∧ forbidden = zap-correct   zapped ∧ allowed = zap-wrong
         arrived ∧ forbidden = leak         arrived ∧ allowed = delivered
```
Once outbound, a packet can no longer be zapped.

### Shift
```
running ──incorrect decision, integrity ≤ 0──▶ integrity-out (shift ends)
running ──10th correct zap in phase 1–5──▶ phase accuracy ≥ 0.80 ? phase-cleared : not-cleared (shift ends)
phase-cleared ──enterPhase(next)──▶ running   (integrity, score, combo, shift counts carry; phase counts reset)
running ──player quits──▶ quit (shift ends)
endless (6): running until integrity-out or quit
```
The integrity check runs before the goal check. A `phase-cleared` result unlocks `phaseId + 1`
(Phase 5 cleared unlocks endless).
