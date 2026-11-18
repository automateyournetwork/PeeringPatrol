# Project constitution — Peering Patrol, an IXP peering LAN hygiene educational game

## Purpose
Build a web-based educational game that teaches **which traffic is and is not allowed on an
Internet Exchange peering LAN — specifically the IX.br ATM (Acordo de Troca de Tráfego
Multilateral) LAN** — through fast, highly animated arcade gameplay. The player is an IX NOC
operator who must zap packets that don't belong on the shared Layer 2 segment (CDP, MNDP, STP
BPDUs, OSPF, OSPFv3, PIM, IGMP, MLD, IPv6 RA/RS, ARP/NS for addresses outside the ATM subnet, NTP
broadcast/multicast) while letting legitimate peering traffic through (BGP, IPv4/IPv6 unicast, ARP/NS inside
the ATM subnet, unicast NTP).

The audience is network operators whose networks are (or will become) IX members. After playing,
they must know *why* each forbidden packet is a problem and *what to disable on their own
IX-facing interface*. The game must be both accurate and engaging. It functions as a teacher: it
never guesses, never invents answers, and never allows a player to progress on incorrect
knowledge.

## The non-negotiable rule
**The game must never present incorrect information, even under time pressure or to be "more
fun."** Every packet the game shows is deterministically *allowed* or *forbidden* on the ATM
peering LAN, decided by data and pure logic — no fuzzy grading, no partial credit. When in doubt,
the game waits, not guesses.

**Source of truth:** IX.br / NIC.br official guidance for IX participants. Any packet type whose
verdict is not backed by a cited source, or explicitly confirmed by the project owner and marked
as such in the data, does not ship. If sources disagree, the item is held back until a human
resolves it.

## Learning design principles
1. **Correctness over completion** — a player who hasn't learned the concept cannot advance. Phase
   goals count only correct zaps; leaks and wrong zaps cost LAN integrity, and integrity at zero
   ends the shift. This is a feature, not a bug.
2. **Immediate, specific feedback** — every zap, every wrong zap, and every leak shows *why*: what
   the packet is, why it is or isn't allowed on the peering LAN, and what the member should
   disable or fix.
3. **Layered complexity** — concepts build on each other. A player cannot meet "same protocol,
   different verdict" cases (ARP/NS outside the ATM subnet, NTP broadcast vs unicast) before
   they have learned the basic verdict for each of those protocols, and cannot meet IPv6 Neighbor
   Discovery distinctions (RA/RS vs NS/NA) before they know that multicast and discovery chatter
   floods every member. The phase order in the spec *is* this dependency chain.
4. **Recall over recognition where possible** — later content removes the protocol name from the
   packet label and shows only identifying header fields (destination MAC, EtherType, IP
   protocol / next header, ICMPv6 type, UDP port, target address). The player must recognize the
   packet from what a capture would actually show.
5. **Real-world grounding** — every packet maps to a real frame a network engineer would see in a
   capture on the IX port, and every explanation ends in a real action (e.g. "disable CDP on the
   IX-facing interface", "make the IGP passive / remove it from the IX interface"). The NOC framing
   (zapping) is a metaphor and is presented as one: in real life the IX filters, contacts the
   member, or quarantines the port.

## Gameplay principles
- Progress is earned, not gifted. No "try again and we'll lower the bar."
- Mistakes are learning moments, not punishments. Tone is calm and explanatory, never scolding —
  the effects can be loud, the copy cannot.
- Speed matters in the real world (a NOC reacts to leaks as they happen), so the default arcade
  mode is real-time. But speed is never the only way to progress: a **practice mode** stops every
  packet at the LAN until the player decides, and every phase is completable there.
- Speed bonuses (combo multipliers) reward *consecutive correct* decisions, never speed alone.
- Every phase is completable with zero prior knowledge if the player reads the briefing and the
  feedback. The game teaches; it does not assume.

## Code quality standards
- All packet types, verdicts, explanations, and phase definitions live in separate, editable data
  files. No hardcoded packet facts inside game logic.
- Every packet type in the data has a `source` field (IX.br/NIC.br document, RFC, or vendor doc)
  and a `source_status` (`cited` or `owner-confirmed`), even if not shown to the player. This
  makes the data auditable.
- Difficulty is data-driven (spawn rate, speed, label detail, packet mix per phase). Adding a new
  phase or packet type means editing data, not code.
- The verdict is decided only by the rules engine. The renderer, effects, and UI never decide
  whether a packet is allowed.
- No external quiz APIs, AI-generated answers, or runtime-fetched content for correctness — the
  ground truth is local, static, and audited by a human before it ships.

## UX standards
- Works on desktop browsers without install, by opening `index.html`.
- Keyboard navigable for all core interactions (target lock, zap, let through, menus, briefings).
- Respects `prefers-reduced-motion`: screen shake, flashes, and slow-motion are reduced or
  removed, without hiding any information.
- Sound is on by default with a visible mute toggle; no information is conveyed by sound alone.
- Feedback copy is written in plain English, not jargon — unless teaching the jargon (EtherType,
  ICMPv6 type, solicited-node multicast) is the point.
- Loading states, error states (e.g. data file failed to load), and empty states all have explicit
  designs.

## What this game is not
- Not a trivia app that happens to have IXP questions.
- Not a flashcard deck with a progress bar.
- Not a reflex game that rewards clicking without understanding: a wrong zap on legitimate
  traffic costs more than a missed leak.
- Not a full IX simulator (no real switching fabric, route servers, or BGP state machine).

The game should feel like the best professor you ever had — patient, precise, and genuinely
delighted when you get it right — who also happens to run the most fun NOC shift on the planet.
