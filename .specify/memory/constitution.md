<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR. A Development Workflow rule was replaced with materially different
  guidance (spec documents must be self-contained). No principle was removed or redefined.

Modified sections:
  - Development Workflow & Quality Gates: removed the bullet naming the visual prototype as a
    look-and-feel reference; added the "Self-contained specs" rule in its place.

Added sections: none
Removed sections: none

Follow-up TODOs:
  - specs/001-peering-patrol-game/spec.md (Assumptions), plan.md (Project Structure) and
    tasks.md (T001) still mention the prototype; they must be updated to comply.
  - Carried over from 1.0.0: the root CONSTITUTION.md still lists only "NTP broadcast"
    (tasks.md T067 aligns it).
-->

# Peering Patrol Constitution

Peering Patrol is a web-based, highly animated educational arcade game that teaches network
operators of IX member networks which traffic is and is not allowed on an Internet Exchange
peering LAN — specifically the IX.br ATM (Acordo de Troca de Tráfego Multilateral) LAN. The player
is an IX NOC operator who zaps packets that do not belong on the shared Layer 2 segment (CDP,
MNDP, STP BPDUs, OSPF, OSPFv3, PIM, IGMP, MLD, IPv6 RA/RS, ARP/NS for addresses outside the ATM
subnet, broadcast/multicast NTP) and lets legitimate peering traffic through (BGP, IPv4/IPv6
unicast, ARP/NS inside the ATM subnet, unicast NTP).

## Core Principles

### I. Correctness Is Non-Negotiable

- The game MUST NEVER present incorrect information — not under time pressure, not to be "more
  fun".
- Every packet shown MUST be deterministically *allowed* or *forbidden* on the ATM peering LAN,
  decided by data and pure logic. No fuzzy grading, no partial credit. When in doubt, the game
  waits; it does not guess.
- Source of truth is IX.br / NIC.br official guidance for IX participants. A packet type whose
  verdict is not backed by a cited source, or explicitly confirmed by the project owner and marked
  as such in the data, MUST NOT ship.
- If sources disagree, the item MUST be held back until a human resolves the conflict.

Rationale: the game functions as a teacher for real operators; one wrong verdict teaches a habit
that can break peering or pollute a production IX LAN.

### II. Data-Driven, Auditable Ground Truth

- All packet types, verdicts, explanations, and phase definitions MUST live in separate, editable
  data files. Game logic MUST NOT hardcode packet facts.
- Every packet type MUST carry a `source` field (IX.br/NIC.br document, RFC, or vendor doc) and a
  `source_status` of `cited` or `owner-confirmed`, even when not shown to the player.
- Difficulty (spawn rate, speed, label detail, packet mix per phase) MUST be data-driven. Adding a
  phase or packet type MUST require editing data only, not code.
- The verdict MUST be decided only by the rules engine. Renderer, effects, and UI MUST NOT decide
  whether a packet is allowed.
- Correctness MUST NOT depend on external quiz APIs, AI-generated answers, or runtime-fetched
  content. Ground truth is local, static, and human-audited before it ships.

Rationale: separating facts from code makes every verdict reviewable by a domain expert without
reading game logic, and keeps the single point of judgment testable.

### III. The Game Teaches (Learning Design)

- **Correctness over completion**: phase goals count only correct zaps; leaks and wrong zaps cost
  LAN integrity, and integrity at zero ends the shift.
- **Immediate, specific feedback**: every zap, wrong zap, and leak MUST show what the packet is,
  why it is or is not allowed on the peering LAN, and what the member should disable or fix.
- **Layered complexity**: concepts MUST be introduced in dependency order. "Same protocol,
  different verdict" cases (ARP/NS outside the ATM subnet, NTP broadcast/multicast vs unicast)
  MUST NOT appear before the basic verdict for that protocol is taught; IPv6 ND distinctions
  (RA/RS vs NS/NA) MUST NOT appear before the player has learned that multicast and discovery
  chatter floods every member. The spec's phase order encodes this chain.
- **Recall over recognition**: later content MUST remove the protocol name and show only
  identifying header fields (destination MAC, EtherType, IP protocol / next header, ICMPv6 type,
  UDP port, target address), as a real capture would.
- **Real-world grounding**: every packet MUST map to a real frame seen on an IX port, and every
  explanation MUST end in a concrete action (e.g. "disable CDP on the IX-facing interface"). The
  zapping metaphor MUST be presented as a metaphor: in reality the IX filters, contacts the
  member, or quarantines the port.

Rationale: the audience must leave knowing *why* each packet is a problem and *what to change on
their own router*, not just a memorized list.

### IV. Progress Is Earned, Mistakes Are Explained

- Progress MUST be earned; the game MUST NOT lower the bar on retry.
- Feedback tone MUST be calm and explanatory, never scolding — effects may be loud, copy may not.
- The default arcade mode is real-time, but speed MUST NOT be the only path to progress: a
  practice mode MUST stop every packet at the LAN until the player decides, and every phase MUST
  be completable there.
- Combo multipliers MUST reward consecutive *correct* decisions, never speed alone.
- A wrong zap on legitimate traffic (especially BGP) MUST cost more than a missed leak, so the
  game never rewards clicking without understanding.
- Every phase MUST be completable with zero prior knowledge by reading the briefing and feedback.

Rationale: the game rewards understanding, not reflexes, while keeping the NOC's real sense of
urgency.

### V. Accessible, Zero-Install Experience

- The game MUST run in desktop browsers without install, by opening `index.html` directly.
- All core interactions (target lock, zap, let through, menus, briefings) MUST be keyboard
  navigable.
- `prefers-reduced-motion` MUST be respected: screen shake, flashes, and slow-motion are reduced
  or removed without hiding any information.
- Sound is on by default with a visible mute toggle; no information MUST be conveyed by sound
  alone.
- Copy MUST be plain English, using jargon (EtherType, ICMPv6 type, solicited-node multicast) only
  when teaching that jargon is the point.
- Loading, error (e.g. a data file failed to load), and empty states MUST each have an explicit
  design.

Rationale: operators should be able to play anywhere in seconds, and the teaching must reach
players regardless of motion sensitivity, audio, or input device.

## Scope & Non-Goals

Peering Patrol is NOT:

- A trivia app that happens to have IXP questions.
- A flashcard deck with a progress bar.
- A reflex game that rewards clicking without understanding.
- A full IX simulator — no real switching fabric, route servers, or BGP state machine.

Features that push the project toward any of the above MUST be rejected or re-scoped. The target
experience is the best professor you ever had — patient, precise, and genuinely delighted when you
get it right — who also happens to run the most fun NOC shift on the planet.

## Development Workflow & Quality Gates

- **Content gate**: any new or changed packet type, verdict, or explanation MUST include its
  `source` and `source_status` and MUST be reviewed by the project owner before merge.
- **Engine gate**: the rules engine MUST be a pure, UI-free module with automated tests covering
  every packet type in the catalog, including each "same protocol, different verdict" case.
  Tests MUST pass before a change ships.
- **Separation gate**: reviews MUST reject any verdict logic or packet fact found outside the
  rules engine and data files.
- **Accessibility gate**: changes to interaction or effects MUST be checked with keyboard-only
  play and with `prefers-reduced-motion` enabled.
- **Self-contained specs**: the constitution, spec, plan, tasks, and every other spec-driven
  document MUST stand on their own as the source of truth. They MUST describe look and feel in
  words and MUST NOT reference or link exploratory or throwaway code (such as prototypes) as a
  reference for content, design, or architecture.

## Governance

- This constitution supersedes all other project practices. SPEC.md, PLAN.md, and every
  `/speckit-*` artifact MUST comply with it; conflicts are resolved in favor of this document.
- Amendments MUST be made through `/speckit-constitution`, documented in the Sync Impact Report,
  and approved by the project owner. Amendments affecting Principle I or II MUST also state how
  existing data and phases are re-audited.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
  adding a principle/section or materially expanding guidance, PATCH for clarifications and
  wording.
- Every plan (`/speckit-plan`) MUST include a Constitution Check against these principles, and
  every review MUST verify compliance. Any deviation MUST be justified in writing in the plan's
  complexity tracking.

**Version**: 1.1.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
