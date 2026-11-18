# Feature Specification: Peering Patrol — IXP Peering LAN Hygiene Game (v1)

**Feature Branch**: `001-peering-patrol-game` (no branch created; working on `main`)

**Created**: 2026-11-18

**Status**: Draft

**Updated**: 2026-11-18 (look-and-feel requirements FR-035–FR-045 added)

**Input**: User description: project-root `SPEC.md` ("Spec — Peering Patrol: an IXP peering LAN
hygiene game"), invoked via `/speckit-specify` with no inline arguments.

## Clarifications

### Session 2026-11-18

- Q: Must the v1 release wait for official citations for all owner-confirmed packet types? →
  A: No. They ship, but each one still lacking an official citation shows a visible
  transparency note to the player (FR-004).
- Q: In arcade mode, should play pause while an explanation card is on screen? → A: No card
  ever pauses arcade play; cards stack in a side panel and stay readable afterwards (FR-011a;
  placement later refined to bottom-left cards plus a shift log, see below).
- Q: How should the endless shift end, and what gets saved as the player's result? → A: It ends
  when integrity hits zero; best score and best number of correct zaps are saved, and accuracy
  is shown in the summary (FR-020a; with continuous shifts, "best score" is the best shift
  score and "correct zaps" counts those made in endless).
- Q: To clear a phase, should 10 correct zaps be enough, or must the player also show a minimum
  accuracy? → A: 10 correct zaps and at least 80% accuracy across all decisions in the phase
  (FR-017).
- Q: The root SPEC.md's new look-and-feel section puts feedback cards at the bottom left (max 3,
  fading), which conflicts with FR-011a's side panel. Which wins? → A: Both. Cards appear at the
  bottom left (max 3, fading) and are also kept in a collapsible shift log toggled with `F`
  (FR-011a, FR-043).
- Q: Is a "shift" one phase played on its own, or one continuous run through the phases with
  integrity and score carrying over? → A: A continuous shift with checkpoints. A shift starts at
  any unlocked phase; integrity, score, and combo carry over as phases are cleared (each still
  needs 10 correct zaps and ≥ 80% accuracy); integrity at zero ends the shift, which can be
  restarted from the phase reached (FR-017a, FR-018).

## User Scenarios & Testing *(mandatory)*

The player is a network operator at an IX member network (or one about to join). In the game
they act as the NOC operator of an IX.br-style exchange, keeping the shared ATM peering LAN clean:
zapping packets that must not be on the LAN and letting legitimate peering traffic through.

### User Story 1 - Play and clear the first shift (Priority: P1)

A new player opens the game, reads the Phase 1 briefing ("the shared segment"), and plays the
animated peering LAN: 8 member routers around the LAN, packets flying in. Broadcast/multicast
packets visibly split into copies that flood every other member. The player zaps CDP, MNDP, and
STP BPDU frames and lets BGP, IPv4/IPv6 unicast, and ARP for ATM-subnet targets through. Every
decision gets an explanation. After 10 correct zaps the phase is cleared and a summary appears.

**Why this priority**: This is the whole core loop — briefing → decide → validated feedback →
summary — with the single most important lesson (one broadcast reaches everyone). With only this
phase the game already teaches something real and is a viable MVP.

**Independent Test**: Open the game with only Phase 1 content and play to completion; verify each
of the 7 Phase 1 packet types produces the correct verdict, effects, and explanation, and that
the summary lists every misjudged packet type.

**Acceptance Scenarios**:

1. **Given** the Phase 1 briefing is shown, **When** the player starts the phase, **Then** the
   LAN, 8 members (each with ASN and ATM IPv4 address), and labeled packets in flight are shown.
2. **Given** a CDP frame is in flight, **When** the player zaps it, **Then** a hit effect plays,
   the correct-zap count and combo increase, and a card explains what CDP is, why it is not
   allowed on the peering LAN, and that the member should disable CDP on the IX-facing interface.
3. **Given** a BGP packet is in flight, **When** the player zaps it, **Then** it counts as a wrong
   zap: combo resets, LAN integrity drops by more than a leak would cost, and a card explains that
   the traffic is legitimate and which peering would break.
4. **Given** an MNDP broadcast reaches the LAN unzapped, **When** it floods, **Then** copies reach
   every other member, the receiving routers flash red, integrity drops, and a card explains what
   the packet was and what the member should disable.
5. **Given** a legitimate unicast packet is not zapped, **When** it reaches its destination,
   **Then** a small green confirmation shows at the destination router.
6. **Given** 10 correct zaps have been made with phase accuracy ≥ 80%, **When** the phase ends,
   **Then** a phase summary shows score so far, phase accuracy (against the 80% required),
   best combo, and the phase's "review these" list, the next phase is unlocked, and "Continue
   shift" starts its briefing with integrity, score, and combo carried over.
7. **Given** the 10th correct zap is made with phase accuracy below 80%, **When** the summary
   appears, **Then** the phase is marked not cleared, the shift ends, the next phase stays
   locked, and a restart from this phase is offered with full integrity and the same goal and
   threshold.
8. **Given** integrity reaches zero in any phase, **When** the shift ends, **Then** the shift
   summary is shown (including the phase reached) and the player can restart from that phase
   with full integrity (the bar is never lowered).

---

### User Story 2 - Learn at your own pace in practice mode (Priority: P2)

A player who finds real-time play too fast switches to practice mode. Every packet stops at the
LAN and waits; the player zaps it or explicitly lets it through. There is no timer, and every
phase can be completed this way.

**Why this priority**: The constitution requires that speed is never the only path to progress.
Without practice mode, slower readers and players using assistive input are locked out of the
learning content.

**Independent Test**: Complete Phase 1 in practice mode using only the keyboard, without any
packet reaching a member before a decision is made.

**Acceptance Scenarios**:

1. **Given** practice mode is selected, **When** a packet reaches the LAN, **Then** it stops and
   waits indefinitely for the player's decision.
2. **Given** a packet is waiting, **When** the player presses the "let through" control, **Then**
   it is delivered (or floods) and is graded exactly as in arcade mode.
3. **Given** practice mode, **When** the player clears a phase, **Then** progress counts the same
   as arcade mode for unlocking the next phase.

---

### User Story 3 - Progress through the full prerequisite chain (Priority: P3)

After Phase 1, the player advances through Phases 2–5, each introducing exactly one new idea with
its own briefing: routing leaks (OSPF, OSPFv3, PIM), multicast chatter (IGMP, MLD; NTP unicast is
allowed), neighbor discovery (RA/RS forbidden; NS/NA for ATM-prefix targets allowed), and "read
the details" (ARP/NS for addresses outside the ATM subnet/prefix and broadcast/multicast NTP are
forbidden). Packets from earlier phases keep appearing.

**Why this priority**: This delivers the full set of learning outcomes, especially the hard
"same protocol, different verdict" cases, but depends on the core loop from Story 1.

**Independent Test**: Play Phases 1–5 in order; verify each phase is locked until the previous
one is cleared, each briefing introduces exactly that phase's new packets, and Phase 5 packets
highlight the deciding field.

**Acceptance Scenarios**:

1. **Given** Phase N is not cleared, **When** the player opens the phase list, **Then** Phase N+1
   is locked.
2. **Given** Phase 3 is active, **When** an NTP unicast packet appears, **Then** letting it
   through is correct and zapping it is a wrong zap with an explanation that UDP 123 alone does
   not make traffic bad.
3. **Given** Phase 5 is active, **When** an ARP request appears, **Then** its label shows the
   protocol name and highlights the target address, and the verdict depends on whether the
   target is inside the ATM subnet.
4. **Given** Phase 4 is active, **When** an ICMPv6 packet appears, **Then** its label shows the
   ICMPv6 type and the verdict depends on that type (133/134 forbidden; 135/136 with ATM-prefix
   target allowed).

---

### User Story 4 - Endless shift recall test (Priority: P4)

After clearing Phase 5, the player unlocks the endless shift: all packet types, speed increasing
every 10 zaps, and labels showing only header fields (no protocol names). The player must
recognize packets as they would appear in a capture.

**Why this priority**: The recall test proves real learning and gives replay value, but is only
meaningful after all concepts are taught.

**Independent Test**: Unlock endless mode and verify no label contains a protocol name, all
catalog packet types can appear, and speed rises after every 10 zaps.

**Acceptance Scenarios**:

1. **Given** Phase 5 is not cleared, **When** the player views modes, **Then** endless is locked.
2. **Given** endless is active, **When** any packet is shown, **Then** its label contains only
   header fields (destination MAC, EtherType, IP protocol / next header, ICMPv6 type, UDP port,
   target address) and no protocol name.
3. **Given** endless is active, **When** the player reaches each multiple of 10 zaps, **Then**
   packet speed increases.
4. **Given** endless is active, **When** LAN integrity reaches zero, **Then** the shift ends and
   the summary shows shift score, phase reached, endless correct zaps, accuracy, best combo, and
   the "review these" list; a new best shift score or best endless correct-zap count is saved and
   marked as a new record.
5. **Given** Phase 5 is cleared during a shift, **When** the player continues, **Then** the shift
   goes on into endless with integrity, score, and combo carried over.

---

### User Story 5 - Hints that show where to look (Priority: P5)

After a leak or wrong zap, the next packet of the same type has its deciding field highlighted,
so the player learns where to look without being told the answer.

**Why this priority**: Improves learning efficiency but the game teaches without it.

**Independent Test**: Deliberately leak an OSPF packet; verify the next OSPF packet highlights its
deciding field and no label or effect reveals the verdict before the decision.

**Acceptance Scenarios**:

1. **Given** the player leaked or wrongly zapped a packet of type T, **When** the next packet of
   type T appears, **Then** its deciding field is highlighted.
2. **Given** a hint is shown, **When** the player inspects the packet, **Then** nothing indicates
   whether it is allowed or forbidden.

---

### Edge Cases

- A packet-content data file fails to load or is malformed: the game shows an explicit error
  state and does not start any phase (never plays with partial or guessed content).
- A packet type in the content has no source or an unresolved source conflict: it is excluded
  from play and never shown to the player.
- Two packets overlap on screen: the player can still target each one individually (keyboard
  target-lock cycles through packets in flight).
- The player zaps a packet that has already split into flood copies: zapping is only possible
  before the packet reaches the members; once copies are delivered the outcome is a leak.
- An incorrect decision drops integrity to 0 before the phase goal is reached: the shift ends at
  once (integrity out); the goal is not checked.
- Reduced-motion preference is on: shake, flashes, and slow-motion are reduced or removed, and
  every outcome is still communicated by text.
- Sound is muted or unavailable: no information is lost.
- Several outcomes happen within a second in arcade mode: each produces its own card in the side
  shift log in the order the outcomes occurred; none is dropped or merged, and play never pauses.
  Only the 3 newest are visible at the bottom left; older ones fade early but remain in the log.
- The player leaves mid-shift: the shift is not saved; unlocked phases, settings, and best
  scores are. The next shift can start from any unlocked phase.

## Requirements *(mandatory)*

### Functional Requirements

**Correctness & content**

- **FR-001**: The game MUST decide every packet's verdict (allowed/forbidden) deterministically
  from the packet catalog and the ATM LAN definition; no element other than the single
  verdict-deciding rules component may decide a verdict.
- **FR-002**: The packet catalog MUST contain exactly the v1 packet types listed in the
  **Packet Catalog** below, each with verdict, identifying fields, explanation (what it is, why
  allowed/forbidden, what the member should do), source, and source status.
- **FR-003**: The game MUST NOT show any packet type whose source status is missing or whose
  sources disagree.
- **FR-004**: Packet types with source status `owner-confirmed` MAY ship in v1 without an official
  IX.br/NIC.br citation. For every such type, the explanation card and the "review these" entry
  MUST show a short, visible transparency note (e.g. "Verified by the project owner against IX.br
  policy; official citation pending"). When an official citation is added, the type's status
  becomes `cited` and the note disappears. Types with status `cited` show no note.
- **FR-005**: All addresses and ASNs shown MUST use documentation ranges: ATM subnet
  `203.0.113.0/24`, ATM prefix `2001:db8:12::/64`, ASNs `AS64496`–`AS64503`. No real member names,
  real ASNs, or IX.br branding.
- **FR-006**: Phase definitions, packet mix, spawn rate, speed, and label detail MUST be editable
  content separate from game behavior, so a phase or packet type can be added without changing
  game behavior.

**Playfield & loop**

- **FR-007**: The playfield MUST show the peering LAN at the center and 8 member routers around
  it, each labeled with ASN and ATM IPv4 address, connected by visible links.
- **FR-008**: Unicast packets MUST travel from a source member via the LAN to one destination
  member; broadcast and multicast packets (any multicast destination) MUST visibly split at the LAN into copies
  that reach every other member.
- **FR-009**: Each packet MUST carry a label whose detail is set per phase: Phases 1–4 protocol
  name + one identifying field; Phase 5 protocol name + highlighted deciding field; endless
  header fields only.
- **FR-010**: Players MUST be able to zap a packet by pointer (click/tap) or by keyboard
  (target-lock to select, Space to zap) before it reaches any member.
- **FR-011a**: Explanation cards MUST NOT pause or slow arcade play, and no card may ever be lost.
  Each card MUST (1) appear as a short card at the bottom left of the playfield, where at most 3
  are visible at once and each fades after a few seconds, and (2) be added at the same moment to
  the top of a collapsible **shift log** that keeps every card of the **shift** readable (cleared when a new
  shift starts) (scrollable,
  keyboard reachable, toggled with `F`). The shift log is collapsed by default so the playfield
  keeps its full width. Practice mode uses the same two places.
- **FR-011**: A correct zap MUST trigger hit feedback (visual burst, score popup, combo increase,
  sound) and a short card explaining what the packet was and why it is not allowed.
- **FR-012**: A wrong zap MUST reset the combo, reduce LAN integrity, and show a card explaining
  why the traffic is legitimate (for BGP, which peering would break).
- **FR-013**: A leak MUST flash the receiving routers red, reduce LAN integrity, and show a card
  explaining what the packet was and what the member should disable or fix.
- **FR-014**: A wrong zap MUST cost more integrity than a leak.
- **FR-015**: A delivered legitimate packet MUST show a green confirmation at the destination.
- **FR-016**: Combo multipliers MUST increase only on consecutive correct decisions and MUST NOT
  depend on reaction speed.
- **FR-017**: A phase attempt MUST end at the 10th correct zap; only correct zaps count toward the
  goal. The phase is **cleared** only if accuracy for that attempt is at least 80%; otherwise it
  is **not cleared**, the next phase stays locked, and the player can retry with the same goal
  and threshold. Accuracy = correct decisions ÷ all decided packets in the attempt, where correct
  decisions are correct zaps plus legitimate packets delivered, and incorrect decisions are wrong
  zaps plus leaks. The 80% threshold applies equally in arcade and practice mode. Accuracy and
  the 10-zap goal are counted **per phase**, even inside a continuous shift. A not-cleared phase
  ends the shift.
- **FR-017a**: A **shift** is one continuous run. It starts at any unlocked phase (1–5 or endless)
  with full integrity and score 0. When a phase is cleared, the player sees the phase summary and
  continues into the next phase's briefing with integrity, score, and combo carried over; after
  Phase 5 the shift continues into endless. The shift ends when integrity reaches zero, when a
  phase is not cleared, or when the player quits to the menu. "Phase reached" is the highest
  phase entered during the shift.
- **FR-018**: When integrity reaches zero the shift MUST end; the player MUST be able to restart
  the shift from the phase reached (it stays unlocked), with full integrity and the same goal and
  difficulty. Phases already cleared stay unlocked and never need replaying.
- **FR-019**: After each cleared phase, a phase summary MUST show score so far, phase accuracy,
  best combo, and that phase's "review these" list. When the shift ends, a shift summary MUST
  show shift score, phase reached, packets zapped, best combo, accuracy, and a "review these"
  list of every packet type leaked or misjudged during the shift, each with its explanation.

**Phases & modes**

- **FR-020**: v1 MUST provide Phases 1–5 and an endless shift, introducing packet types in this
  order (each phase also keeps earlier types in the mix):
  1. *First shift — the shared segment*: zap CDP, MNDP, STP BPDU; let through BGP, IPv4 unicast,
     IPv6 unicast, ARP with ATM-subnet target.
  2. *Routing leaks*: zap OSPF, OSPFv3, PIM.
  3. *Multicast chatter*: zap IGMP, MLD; let through NTP unicast.
  4. *Neighbor discovery*: zap IPv6 RA, IPv6 RS; let through NS/NA with ATM-prefix target.
  5. *Read the details*: zap ARP/NS for addresses outside the ATM subnet/prefix, NTP
     broadcast/multicast.
  6. *Endless shift*: all types, speed increases every 10 zaps, header-fields-only labels.
- **FR-020a**: The endless phase MUST have no zap goal and MUST end (ending the shift) only when
  LAN integrity reaches zero or the player quits. The game MUST save the best shift score and the
  best count of correct zaps made in endless on the device, tracked separately for arcade and
  practice mode, and show both on the menu's endless entry and in the shift summary.
- **FR-021**: Each phase MUST be locked until the previous phase is cleared; endless MUST be
  locked until Phase 5 is cleared.
- **FR-022**: Each phase MUST open with a briefing that explains the concept and lists the new
  packets to zap and to let through, each with its identifying field.
- **FR-023**: Arcade mode (default) MUST be real-time with speed and volume rising per phase.
- **FR-024**: Practice mode MUST stop every packet at the LAN until the player zaps it or lets it
  through, with no timer; every phase MUST be completable in practice mode, and clearing a phase
  there MUST unlock the next phase.
- **FR-025**: After a leak or wrong zap of type T, the next packet of type T MUST have its
  deciding field highlighted; hints MUST NOT reveal the verdict.
- **FR-026**: Explanations MUST present zapping as a metaphor and state the real-world response
  (the IX filters, contacts the member, or quarantines the port).

**Accessibility & UX**

- **FR-027**: The game MUST run in a desktop browser by opening `index.html` locally
  (double-click or `file://`), with no install, server, login, or network connection required for gameplay or correctness.
- **FR-028**: All core interactions (target-lock, zap, let through, menus, briefings, summaries)
  MUST be operable by keyboard alone.
- **FR-029**: With reduced-motion preference on, screen shake, flashes, and slow-motion MUST be
  reduced or removed without hiding any information.
- **FR-030**: Sound MUST be on by default with a visible mute toggle; no information may be
  conveyed by sound alone. The mute choice MUST persist between sessions.
- **FR-031**: Every outcome card and the active packet's status MUST also be available as text
  readable by assistive technology.
- **FR-032**: Loading, error (content failed to load), and empty states MUST each have an explicit
  screen.
- **FR-033**: The game MUST persist settings and best scores between sessions on the same device;
  it MUST NOT require an account.
- **FR-034**: All copy MUST be in plain English, using jargon only when teaching it.

**Look & feel** (added 2026-11-18 from the root `SPEC.md` "Look and feel" section)

- **FR-035**: The game MUST look like a neon NOC wall display: dark navy background with a soft
  blue/purple glow in the center, a faint cyan grid that drifts slowly, and darkened screen edges.
  Links, the LAN, routers, and packets glow. Copy stays calm and precise; only effects are loud.
- **FR-036**: The LAN MUST be a glowing rounded panel in the center titled "IX PEERING LAN · ATM",
  with the ATM IPv4 subnet and IPv6 prefix always visible under the title, pulsing gently. The 8
  routers MUST sit on an ellipse around it as glowing round router icons with ASN and ATM IPv4
  address next to them, each linked to the LAN by a link with a dotted "traffic flowing"
  animation. A router MUST briefly grow when it sends a packet.
- **FR-037**: Packets MUST be glowing orbs with a white core, a short motion trail, and a subtle
  pulse, each with a small floating label above it. All packets MUST look identical whatever
  their verdict, so color never gives away the answer.
- **FR-038**: Over the playfield the system cursor MUST be replaced by a rotating reticle; over a
  packet (pointer hover or keyboard lock) the reticle and the packet with its label MUST turn
  magenta, and the reticle grows and spins faster.
- **FR-039**: A correct zap MUST play: short freeze-frame, then slow motion, a spark explosion, a
  shockwave ring, screen shake, a gold "+score" number that floats up and grows with the combo,
  and a laser-and-blast sound whose pitch rises with the combo. Every 4 consecutive correct
  decisions MUST show a large "COMBO xN!" banner with a short fanfare.
- **FR-040**: A wrong zap MUST play a red screen flash, strong shake, a red "LEGIT!" pop, and a
  low buzz; for BGP, both routers of the broken peering MUST flash red with an "ASx ⇎ ASy"
  banner. A leak MUST flash every receiving router red with a small burst and a dull thud.
- **FR-041**: Big moments MUST be marked: "PHASE n" when a phase starts; "LAN CLEAN!" with a green
  sweep across the screen when a phase is cleared; "SPEED UP" at each endless speed-up; at shift
  end the routers burst red one after another before the summary. Below 35% integrity the screen
  edges MUST pulse red.
- **FR-042**: The HUD MUST be a top bar showing phase number and title, a LAN integrity bar whose
  color shifts green/cyan → yellow/orange → red/magenta as it drops (with the percentage also in
  text), score, combo multiplier (pops when it increases), phase goal progress (correct zaps of
  10; in endless: correct zaps made in endless and the speed level instead), and the sound
  toggle.
- **FR-043**: Feedback cards MUST have a bold title ("ZAPPED CDP", "LEAK! OSPF", "THAT WAS LEGIT
  BGP"), the packet's identifying field, and the explanation, with a green edge for correct and a
  red edge for mistakes. They MUST never cover the center of the playfield. Placement and
  lifetime follow FR-011a (bottom-left cards plus the shift log).
- **FR-044**: Menus, briefings, and summaries MUST be centered cards over a blurred, darkened
  playfield, with one glowing primary button per card that is also activated by Enter or Space.
  The briefing MUST show "ZAP THESE" as red chips and "LET THESE THROUGH" as green chips, each
  with the protocol and its identifying field. The summary MUST show score, phase reached,
  packets zapped, best combo, and accuracy as stat tiles, followed by the "review these" list.
- **FR-045**: Every visual or audio cue in FR-039–FR-041 MUST have a text equivalent (card or
  live announcement) and MUST follow the reduced-motion rules in FR-029; verdict colors (red /
  green chips, card edges) MUST always be paired with a text label or symbol.

### Packet Catalog (v1 ground truth)

| Packet | Verdict | Identifying fields | Source status |
|---|---|---|---|
| BGP | allowed | TCP port 179, unicast between ATM addresses | cited |
| IPv4 / IPv6 unicast | allowed | unicast to a peer router's MAC | cited |
| ARP, target in ATM subnet | allowed | EtherType 0x0806, target IP in 203.0.113.0/24 | owner-confirmed |
| NS / NA, target in ATM prefix | allowed | ICMPv6 type 135 / 136, target in 2001:db8:12::/64 | owner-confirmed |
| NTP unicast | allowed | UDP 123, unicast to a peer | owner-confirmed |
| CDP | forbidden | dst MAC 01:00:0c:cc:cc:cc, SNAP PID 0x2000 | cited |
| MNDP | forbidden | UDP 5678, broadcast | cited |
| STP BPDU | forbidden | dst MAC 01:80:c2:00:00:00 | cited |
| OSPF | forbidden | IP protocol 89, dst 224.0.0.5 / 224.0.0.6 | cited |
| OSPFv3 | forbidden | next header 89, dst ff02::5 / ff02::6 | cited |
| IPv6 RA | forbidden | ICMPv6 type 134, dst ff02::1 | cited |
| PIM | forbidden | IP protocol 103, dst 224.0.0.13 / ff02::d | owner-confirmed |
| IGMP | forbidden | IP protocol 2 | owner-confirmed |
| MLD | forbidden | ICMPv6 type 130/131/132/143 | owner-confirmed |
| IPv6 RS | forbidden | ICMPv6 type 133, dst ff02::2 | owner-confirmed |
| ARP, address outside ATM subnet | forbidden | EtherType 0x0806, IP not in 203.0.113.0/24 | owner-confirmed |
| NS, target outside ATM prefix | forbidden | ICMPv6 type 135, target not in 2001:db8:12::/64 | owner-confirmed |
| NTP broadcast / multicast | forbidden | UDP 123 to broadcast or 224.0.1.1 / ff0x::101 | owner-confirmed |

"cited" = listed in NIC.br's IX good-practices course material ("Boas Práticas IX", NIC.br BCOP).
"owner-confirmed" = confirmed by the project owner against IX.br policy; may ship with a visible
transparency note to the player until an official citation is added (see FR-004).

### Key Entities

- **Packet type**: a kind of frame that can appear on the LAN. Attributes: name, verdict,
  identifying header fields, deciding field, delivery pattern (unicast or flood), explanation
  (what / why / member action), source, source status, phase introduced.
- **Packet instance**: one packet in flight. Attributes: type, source member, destination
  member(s), concrete header values, label detail level, hint state, outcome.
- **ATM LAN**: the peering segment. Attributes: IPv4 subnet, IPv6 prefix, member list.
- **Member router**: an IX participant. Attributes: ASN, ATM IPv4 and IPv6 addresses, position.
- **Phase**: a learning step. Attributes: order, title, concept, briefing copy, new packet types
  (zap / let through), packet mix, speed, spawn rate, label detail, goal (10 correct zaps), lock
  state.
- **Shift**: one continuous run from a starting phase. Attributes: mode, starting phase, current
  phase, phase reached, integrity, score, combo, best combo, per-phase decision counts, misjudged
  and leaked packet types.
- **Phase result / shift result**: outcome of a cleared phase (score so far, phase accuracy,
  review list) or of the whole shift (cleared through, not cleared, integrity out, or quit; shift
  score, phase reached, accuracy, best combo, review list, new records).
- **Player settings & records** (SavedProgress): mode, mute, best scores, unlocked phases.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of packet types in the catalog produce the verdict listed in the catalog in
  every phase they appear in (zero incorrect verdicts, verified for every type including each
  "same protocol, different verdict" pair).
- **SC-001b**: No phase can be unlocked by a phase whose accuracy is below 80%, whether the phase
  was started fresh or reached inside a continuous shift.
- **SC-001a**: 100% of `owner-confirmed` packet types show the transparency note on their
  explanation card and "review these" entry; 0% of `cited` types show it.
- **SC-002**: 100% of correct zaps, wrong zaps, and leaks show an explanation card naming the
  packet, why it is or is not allowed, and the member's corrective action.
- **SC-003**: A first-time player can start Phase 1 within 30 seconds of opening the game, with no
  install or account.
- **SC-004**: Every phase (1–5) can be cleared in practice mode using only the keyboard.
- **SC-005**: In playtests with IX-member operators, at least 80% of players who clear Phase 5
  correctly classify at least 90% of packets in the endless shift (header fields only) over their
  first 30 decisions.
- **SC-006**: In a short post-game check, at least 80% of players can name the action to fix at
  least 5 of the forbidden packet types on their own IX-facing interface.
- **SC-007**: Animation stays visually smooth (no visible stutter) with the maximum packet volume
  of the endless shift on a typical mid-range laptop.
- **SC-008**: With reduced motion on and sound muted, a player can still complete every phase and
  receives every piece of feedback.

## Assumptions

- Target players are network operators familiar with basic IP networking; the briefings teach
  everything IX-specific.
- Desktop browsers are the primary target; touch input is supported for zapping but mobile layout
  is not a v1 goal.
- Integrity starts at a fixed value at the start of each shift and carries across phases;
  exact amounts lost per leak and per wrong zap are content-defined, with wrong zap > leak.
  Clearing a phase does not restore integrity.
- Combo carries across phase boundaries within a shift (it counts consecutive correct decisions).
- An in-progress shift is not saved; unlocked phases, settings, and best scores are
  saved locally on the device.
- The game language is English.

## Out of Scope (v1)

- Simulating the real IX switching fabric, MAC learning, route servers, or BGP state machines.
- Teaching BGP policy, route-server filtering, RPKI, or traffic engineering.
- MAC-address-per-port rule, port security, or quarantine VLAN onboarding (v2 candidate).
- Connecting to external systems, login, or online leaderboards.
- Runtime AI-generated packets, verdicts, or explanations.
