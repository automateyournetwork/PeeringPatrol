# Peering Patrol

An arcade game that teaches network operators which traffic belongs on an Internet Exchange
peering LAN (the IX.br ATM LAN), and which traffic must never reach it. You are the NOC operator:
zap CDP, OSPF, IPv6 RAs, broadcast NTP and the rest before they flood every member, and let BGP,
unicast traffic, and ARP/ND for ATM addresses through. Every decision is explained.

## Play

Open `index.html` in a desktop browser (Chrome, Firefox, Safari, Edge). No install, server,
account, or network connection is needed.

- **Click** a packet to zap it, or **Tab** to lock the next packet and **Space** to zap it.
- **Practice mode** (menu): every packet waits at the LAN; press **Space** to zap or **L** to let
  it through.
- **F** opens the shift log with every explanation; **P** pauses; **M** toggles sound.
- Clear a phase with 10 correct zaps **and** at least 80% accuracy. Integrity, score, and combo
  carry over through the whole shift. After Phase 5 the shift continues into the endless recall
  test, where labels show only header fields.
- Append `?seed=42` to the URL for a reproducible packet sequence.

Settings, unlocked phases, and best scores are saved in the browser's local storage.

## Test

```bash
node --test
```

Requires Node.js 20 or later, with no dependencies. The suite checks, among other things, that
every packet in the catalog gets the same verdict from its header fields as the catalog states,
over 1,000 generated instances each.

## Change the content (data only)

All packet facts live in `data/`; game code never contains them.

- `data/lan.js`: the ATM subnet and prefix, the 8 members, and example addresses (documentation
  ranges only).
- `data/packets.js`: the packet catalog. Each entry has structured header `fields`, a `verdict`,
  explanations, a `fix`, a `source`, and a `source_status`.
- `data/phases.js`: phase order, briefings, packet mix, speed, and label detail.

To add a packet type, add an entry to `data/packets.js` and list its id in the `introduces` of its
phase in `data/phases.js`, then run `node --test`. At load time the game checks every entry. A
type whose verdict does not match what the rules engine derives from its header fields, or that
has no source, is held back and never shown. Schema: `specs/001-peering-patrol-game/data-model.md`.

## Sources

The source of truth is IX.br / NIC.br guidance for IX participants.

- `cited`: listed in NIC.br's IX good-practices course material ("Boas Práticas IX", BCOP).
- `owner-confirmed`: confirmed by the project owner against IX.br policy. Players see a note on
  these explanations that the official citation is pending. When a citation is added, change
  the entry to `cited` and the note disappears.

Every content change must be reviewed by the project owner before it is merged (see
`.specify/memory/constitution.md`).

## Project documents

Spec-driven docs live in `specs/001-peering-patrol-game/` (spec, plan, data model, contracts,
quickstart, tasks).
