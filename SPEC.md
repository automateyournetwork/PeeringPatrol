# Spec — Peering Patrol: an IXP peering LAN hygiene game

## What I want to build
A web-based, highly animated arcade game where the player is a **NOC operator at an Internet
Exchange (IX.br style)** keeping the shared ATM peering LAN clean. The screen shows the peering
LAN in the center with 8 member routers (ASNs) around it, connected by glowing links. Packets
fly from members to the LAN: unicast packets go straight to one peer; broadcast and multicast
packets reach the LAN and **visibly split into copies that flood every other member**.
The player must **zap** every packet that is not allowed on the peering LAN before it reaches
the members, and **let legitimate traffic through**, based on knowing which protocols belong on
an IX LAN and reading the packet's identifying fields. A zap on a forbidden packet triggers a big,
satisfying hit (explosion, shockwave, screen shake, combo counter, sound). A leak makes the
receiving routers flash red and costs LAN integrity. Zapping legitimate traffic (especially BGP)
is the worst mistake. Every outcome explains exactly why. Success means finishing all phases with
LAN integrity intact *and* understanding what each forbidden packet is and what a member should
disable on their own IX-facing interface.

## Why this exists
IX participants keep leaking traffic onto the peering LAN — usually not out of malice but because
a router's defaults (CDP, MNDP, an IGP, IPv6 RA) were left enabled on the IX-facing interface.
Reading a "do not send" list is easy to forget. Watching a single CDP frame you "sent" explode
into seven copies hitting every other member makes it obvious why a shared Layer 2 segment is
different from a point-to-point link. Making the player *decide*, packet by packet, builds the
reflex of "what is my router saying on this interface?" — and the hard cases (ARP for a non-ATM
address, NTP broadcast vs unicast, RA vs NS) train the habit of reading the actual header instead
of judging by protocol name.

## Core learning outcomes
By completing the game, a player should be able to:
- Explain why broadcast and multicast traffic on an IX peering LAN affects every
  member, and why only peering traffic belongs there.
- Given a packet's identifying fields (destination MAC, EtherType, IP protocol / next header,
  ICMPv6 type, UDP port, target address), classify it as allowed or forbidden on the ATM LAN.
- Name the discovery and control-plane protocols that must not reach the IX (CDP, MNDP, STP BPDU,
  OSPF, OSPFv3, PIM, IGMP, MLD, IPv6 RA and RS) and the action to fix each on the member router.
- Distinguish allowed from forbidden variants of the same protocol: ARP/NS for addresses inside vs
  outside the ATM subnet, unicast NTP vs broadcast/multicast NTP, Neighbor Solicitation /
  Advertisement vs Router Advertisement / Solicitation.
- Identify which traffic must never be filtered on the IX (BGP sessions, unicast IPv4/IPv6
  traffic between members, ARP/ND for ATM addresses) and why dropping it breaks peering.

## Gameplay loop
1. Player is shown a **briefing** for the phase: the concept, the new packets to zap and the new
   packets to let through, each with its identifying field — explained before the test.
2. Player is shown the **challenge state**: the animated peering LAN with 8 member routers
   (ASN + ATM IPv4 address on each), and packets in flight. Each packet carries a label with its
   identifying fields (detail level depends on the phase). Hovering or target-locking a packet
   highlights it.
3. Player makes a **decision**: click/tap (or target-lock + Space) to zap a packet; do nothing (or
   press the "let through" key in practice mode) to let it pass.
4. Game **validates** the decision with the rules engine against the packet catalog data.
5. **Correct zap** → hit effects (particles, shockwave, short slow-motion, screen shake, floating
   score, combo multiplier, sound) + a short card: what the packet was and why it's not allowed.
   **Legit packet delivered** → small green confirmation at the destination router(s).
6. **Incorrect** → *wrong zap*: red flash, combo reset, integrity loss, and a card explaining why
   that traffic is legitimate (for BGP: which peering would break). *Leak*: the routers that
   received the copies flash red, integrity drops, and a card explains what the packet was and
   what the member should disable. The player continues; at zero integrity the shift ends and can
   be restarted from the phase reached. A shift is one continuous run: integrity, score, and
   combo carry over from phase to phase.
7. After the phase (or when the shift ends): a **summary** with score, accuracy, best combo, and a
   "review these" list of every packet type the player missed or misjudged, each with its
   explanation.

## Look and feel
The game should look like a neon NOC wall display and feel like an arcade shooter: loud, bright,
and satisfying, while the text stays calm and precise.

- **Art direction:** dark navy background with a soft blue/purple glow in the center, a faint cyan
  grid that drifts slowly, and darkened screen edges. Everything that matters glows: links, the
  LAN, routers, packets.
- **The playfield:** the IX peering LAN is a glowing rounded panel in the center labeled
  "IX PEERING LAN · ATM", with the ATM IPv4 subnet and IPv6 prefix always visible under the
  title. It pulses gently. The 8 member routers sit on an ellipse around it: glowing round router
  icons with the ASN and the router's ATM IPv4 address next to them. Each router is connected to
  the LAN by a link with a dotted "traffic flowing" animation. A router briefly grows when it
  sends a packet.
- **Packets:** glowing orbs with a white core, a short motion trail, and a subtle pulse. Every
  packet has a small floating label above it with the protocol name and its identifying field
  (detail set by the phase). All packets look the same whatever their verdict; the player has to
  read, not guess by color.
- **Aiming:** the system cursor is replaced by a rotating reticle. Over a packet it turns
  magenta, grows, and spins faster ("locked"), and the packet and its label turn magenta too.
- **Hitting a forbidden packet** has to feel great: a short freeze-frame, then slow motion, an
  explosion of sparks, a shockwave ring, screen shake, a gold "+score" number that floats up and
  grows with the combo, and a laser-and-blast sound whose pitch rises with the combo. Every 4
  consecutive correct zaps, a huge "COMBO xN!" banner and a little fanfare.
- **Mistakes** look and sound different from success: a wrong zap gives a red screen flash,
  strong shake, a red "LEGIT!" pop and a low buzz; a broken BGP peering also shows an
  "ASx ⇎ ASy" banner and both routers flash red. A leak makes every router that received a copy
  flash red with a small burst and a dull thud.
- **Big moments:** "PHASE n" when a phase starts, "LAN CLEAN!" with a green sweep across the
  screen when a phase is cleared, "SPEED UP" in endless mode. When the shift ends, the routers
  burst in red one after another before the summary appears. Below 35 % integrity, the screen
  edges pulse red.
- **HUD (top bar):** current phase and title, a LAN integrity bar that shifts from green/cyan to
  yellow/orange to red/magenta as it drops, score, combo multiplier (pops when it increases),
  phase goal progress (correct zaps out of 10), and the sound toggle.
- **Feedback cards:** short cards slide in at the bottom left (at most 3 at a time, fading after a
  few seconds) with a bold title ("ZAPPED CDP", "LEAK! OSPF", "THAT WAS LEGIT BGP"), the
  packet's identifying field, and the explanation. Green edge for correct, red for mistakes.
  They never cover the center of the playfield. Every card is also kept in a collapsible shift
  log (toggled with F) for the whole shift, so no explanation is ever lost.
- **Menus, briefings, and summaries:** centered cards over a blurred, darkened playfield. The
  briefing lists "ZAP THESE" as red chips and "LET THESE THROUGH" as green chips, each chip
  showing the protocol and its identifying field. The summary shows score, phase reached,
  packets zapped, best combo, and accuracy as stat tiles, then the "review these" list. One
  glowing primary button per card, also reachable with Enter or Space.

## Modes
- **Arcade (default)** — real-time, speed and packet volume increase per phase.
- **Practice** — every packet stops at the LAN and waits for the player's decision. No timer.
  Every phase can be completed in practice mode.

## Content scope (version 1)
5 phases plus an endless mode, each introducing exactly one new idea. This list *is* the
prerequisite chain. A phase is cleared after 10 correct zaps with at least 80% accuracy; below
that, the shift ends and the phase can be retried with the same bar.

1. **First shift — the shared segment.** Zap: CDP, MNDP, STP BPDU. Let through: BGP, IPv4
   unicast, IPv6 unicast, ARP (target inside ATM subnet). Idea: one broadcast reaches everyone;
   discovery protocols must be disabled on the IX interface.
2. **Routing leaks.** Zap: OSPF, OSPFv3, PIM. Idea: no IGP or multicast routing on the IX —
   peering happens over BGP only.
3. **Multicast chatter.** Zap: IGMP, MLD. Let through: NTP unicast. Idea: multicast group
   management has no place on a unicast peering LAN; a well-known UDP port alone doesn't make
   traffic bad.
4. **Neighbor discovery.** Zap: IPv6 RA, IPv6 RS. Let through: NS, NA (targets inside the ATM
   prefix). Idea: everything is ICMPv6 — read the type.
5. **Read the details.** Zap: ARP and NS for addresses outside the ATM subnet/prefix, NTP
   broadcast. Idea: same protocol, different verdict.
6. **Endless shift** (after phase 5). All packet types, speed increases every 10 zaps, and labels
   show **only header fields** (no protocol names) — the recall test.

Label detail per phase (data-driven):
- Phases 1–4: protocol name + one identifying field.
- Phase 5: protocol name + the deciding field (target address, broadcast/unicast destination)
  highlighted.
- Endless: header fields only.

Other rules:
- Each phase has a pre-phase briefing that teaches the concept before testing it.
- No time pressure in practice mode. Arcade mode is real-time because reacting to leaks in real
  time is part of the real NOC skill.
- A hint system: on a leak or wrong zap, the next packet of the same type gets its deciding field
  highlighted. Hints reveal *where to look*, never the verdict.

### Packet catalog (v1 ground truth)
Addresses in the game use documentation ranges (ATM subnet `203.0.113.0/24`, ATM prefix
`2001:db8:12::/64`, ASNs `AS64496–AS64503`) so nothing points at a real member.

| Packet | Verdict | Identifying fields | Source status |
|---|---|---|---|
| BGP | allowed | TCP port 179, unicast between ATM addresses | cited (IX is for traffic exchange between ASes) |
| IPv4 / IPv6 unicast | allowed | unicast to a peer router's MAC | cited |
| ARP, target in ATM subnet | allowed | EtherType 0x0806, target IP in 203.0.113.0/24 | owner-confirmed |
| NS / NA, target in ATM prefix | allowed | ICMPv6 type 135 / 136, target in 2001:db8:12::/64 | owner-confirmed |
| NTP unicast | allowed | UDP 123, unicast to a peer | owner-confirmed |
| CDP | forbidden | dst MAC 01:00:0c:cc:cc:cc, SNAP PID 0x2000 | cited |
| MNDP | forbidden | UDP 5678, broadcast | cited |
| STP BPDU | forbidden | dst MAC 01:80:c2:00:00:00 | cited |
| OSPF | forbidden | IP protocol 89, dst 224.0.0.5 / 224.0.0.6 | cited (IGPs) |
| OSPFv3 | forbidden | next header 89, dst ff02::5 / ff02::6 | cited (IGPs) |
| IPv6 RA | forbidden | ICMPv6 type 134, dst ff02::1 | cited |
| PIM | forbidden | IP protocol 103, dst 224.0.0.13 / ff02::d | owner-confirmed |
| IGMP | forbidden | IP protocol 2 | owner-confirmed |
| MLD | forbidden | ICMPv6 type 130/131/132/143 | owner-confirmed |
| IPv6 RS | forbidden | ICMPv6 type 133, dst ff02::2 | owner-confirmed |
| ARP, address outside ATM subnet | forbidden | EtherType 0x0806, IP not in 203.0.113.0/24 | owner-confirmed |
| NS, target outside ATM prefix | forbidden | ICMPv6 type 135, target not in 2001:db8:12::/64 | owner-confirmed |
| NTP broadcast / multicast | forbidden | UDP 123 to broadcast or 224.0.1.1 / ff0x::101 | owner-confirmed |

"cited" = listed in NIC.br's IX good-practices course material
("Boas Práticas IX", NIC.br BCOP:
https://moodle.saladeaula.nic.br/pluginfile.php/3444/mod_resource/content/16/14%20Boas%20Pra%CC%81ticas%20IX_v2%20%281%29.pdf).
"owner-confirmed" = confirmed by the project owner against IX.br policy. These types may ship; until
an official citation is added, the game shows players a note that the citation is pending.

## What the game explicitly does not do
- Does not simulate the real IX switching fabric, MAC learning, route servers, or BGP state
  machines — packets follow scripted paths and the verdict comes from the catalog.
- Does not teach BGP policy, route-server filtering, RPKI, or traffic engineering — that's a
  separate game.
- Does not cover the MAC-address-per-port rule, port security, or quarantine VLAN onboarding in
  v1 (candidate for v2: "find the member that's leaking and quarantine the port").
- Does not connect to external systems or require login.
- Does not use AI to generate packets, verdicts, or explanations at runtime — all content is
  pre-authored and verified by a human before it ships.
- Does not use real member names, real ASNs, or IX.br branding.
