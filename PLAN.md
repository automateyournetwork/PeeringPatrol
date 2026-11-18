# Plan — Peering Patrol technical implementation

## Tech stack
- Vanilla HTML, CSS, and JavaScript only — no frameworks, no build tools, no bundler. The whole
  game runs by opening `index.html` directly from disk (`file://`).
- Because `file://` blocks ES module imports and `fetch()` of local JSON in most browsers, the
  game uses **classic `<script>` tags** loaded in a fixed order, a single global namespace
  (`window.PP`), and **data files written as JS** (`data/*.js` assigning to `PP.data`). Data files
  contain only data — no functions, no logic.
- **Canvas 2D** for the playfield (links, routers, packets, particles, shockwaves, trails).
  This deliberately departs from the kit's "prefer DOM" default: the game relies on hundreds of
  particles and per-frame animation. Accessibility is covered by keyboard target-lock and a
  DOM-based live region (see **Accessibility**).
- **DOM** for everything with text: HUD, briefings, feedback cards, summaries, menus.
- **Web Audio API** for synthesized sound effects (no audio files). Mute with `M` or the HUD
  toggle; muted state saved in local storage.
- Local storage for settings and best scores only. No backend, no auth.
- Fonts: Orbitron (display) and JetBrains Mono (labels, header fields) from Google Fonts, falling
  back to system sans-serif and monospace if offline.
- Unit tests for the rules engine run with Node's built-in test runner (`node --test`) — a dev
  tool only, not a build step. `engine/rules.js` must therefore also work under Node
  (`module.exports` when `module` exists).

## Architecture

### File structure
```
PeeringPatrol/
├── index.html
├── style.css
├── main.js                  # bootstraps game, owns the state machine (menu → briefing → play → summary)
├── /engine
│   ├── rules.js             # evaluatePacket(packet, catalog, lan) — pure, no DOM, Node-testable
│   ├── spawner.js           # picks the next packet from the current phase's mix (seedable RNG)
│   ├── motion.js            # packet paths and timing (member → LAN → member / flood to all)
│   ├── renderer.js          # Canvas drawing: background, links, LAN, routers, packets, labels
│   ├── effects.js           # particles, shockwaves, screen shake, hit-stop, flashes, floating text
│   ├── audio.js             # Web Audio sound effects + mute
│   ├── feedback.js          # builds feedback card text from catalog data (why right / why wrong)
│   ├── input.js             # pointer, touch, keyboard target-lock, hit-testing
│   └── state.js             # score, combo, integrity, phase progress, mistakes, save/load settings
├── /views
│   ├── briefing.js          # pre-phase concept introduction
│   ├── hud.js               # top bar: phase, integrity, score, combo, phase goal, mute
│   ├── challenge.js         # wires playfield + input + rules + effects during play
│   └── summary.js           # end-of-phase / end-of-shift debrief with "review these"
├── /data
│   ├── lan.js               # ATM subnet/prefix, member routers (ASN, IPs, positions)
│   ├── packets.js           # packet catalog: verdict, fields, explanations, sources
│   └── phases.js            # phase order, briefing copy, packet mix, speed, label detail
└── /tests
    └── rules.test.js        # node --test: every catalog entry and every phase mix
```

### `data/packets.js` schema (one packet type)
```js
PP.data.packets.push({
  "id": "ra",
  "name": "IPv6 RA",
  "verdict": "forbidden",
  "phase": 4,
  "delivery": "flood",                       // "unicast" (one peer) | "flood" (all other members)
  "fields": {                                // what a capture would show; renderer shows a subset per phase
    "dst_mac": "33:33:00:00:00:01",
    "ethertype": "0x86DD",
    "l3": "fe80::{src} → ff02::1",
    "l4": "ICMPv6 type 134"
  },
  "deciding_field": "l4",                    // highlighted by hints and in phase 5
  "label": { "short": "ICMPv6 134 → ff02::1" },
  "feedback": {
    "zapped": "Router Advertisement says \"I am a router\". Other members could autoconfigure from it.",
    "leaked": "An RA from {src_asn} reached {n} members. Disable RA on the IX-facing interface.",
    "wrong_zap": null                        // only for allowed packets
  },
  "fix": "Suppress IPv6 router advertisements on the IX-facing interface.",
  "source": "NIC.br BCOP — Boas Práticas IX (https://moodle.saladeaula.nic.br/...)",
  "source_status": "cited"                   // "cited" | "owner-confirmed"
})
```
Allowed packets use the same shape with `"verdict": "allowed"` and a `wrong_zap` explanation
(e.g. BGP: "Filtering this would break the BGP session between {src_asn} and {dst_asn}.").
Some fields are templates filled from `data/lan.js` (`{src}`, `{dst_ip}`, `{src_asn}`); template
filling lives in `feedback.js` / `spawner.js`, never in the data.

Variants of the same protocol are separate entries (`arp`, `arp-outside-atm`, `ns`,
`ns-outside-atm`, `ntp-unicast`, `ntp-broadcast`). Their verdict must also be checkable from the
fields: `rules.js` recomputes "is the target inside the ATM subnet/prefix?" and "is the
destination broadcast/multicast?" from `lan.js`. If the recomputed verdict disagrees with the
catalog, the test suite fails.

### `data/phases.js` schema (one phase)
```js
PP.data.phases.push({
  "id": 4,
  "title": "Neighbor discovery",
  "briefing": "IPv6 Neighbor Discovery is all ICMPv6, so read the type...",
  "introduces": ["ra", "rs", "ns", "na"],
  "mix": { "forbidden_ratio": 0.55, "new_type_bias": 0.5 },
  "goal_zaps": 10,
  "spawn_interval_s": 0.85,
  "travel_time_s": 1.8,
  "max_packets": 10,
  "label_detail": "name+field"               // "name+field" | "name+deciding" | "fields-only"
})
```

### Validation engine (`engine/rules.js`)
- `evaluatePacket(packet, catalog, lan) → { verdict, entryId, reason }` — pure, deterministic.
- `evaluateAction(packet, action, catalog, lan) → { correct, outcome, explanationKey }` where
  `action` is `"zap"`, `"let-through"` (practice mode), or `"timeout"` (packet reached members).
  Outcomes: `zap-correct`, `zap-wrong`, `leak`, `delivered`.
- Helpers: `inSubnet(ipv4, cidr)`, `inPrefix(ipv6, prefix)`, `isBroadcastOrMulticast(dst)`.
- The single source of truth. The UI never decides correctness; it calls these functions and
  renders the result.

### Renderer (`engine/renderer.js`)
- Builds the scene from `data/lan.js` (router positions computed from the viewport) and the live
  packet list; nothing hand-placed per phase.
- Unicast packets travel member → LAN → one peer. Flood packets travel member → LAN, then split
  into one copy per other member — the core visual lesson.
- Every packet label shows the fields the phase's `label_detail` asks for. The ATM subnet and
  prefix are always on screen on the LAN, so the player never has to remember them.
- All packets look the same regardless of verdict (same color and shape). Color only reflects
  player state (hover/lock = magenta) and outcome (zap = cyan/gold burst, leak/wrong = red).
- Honors `prefers-reduced-motion` via `effects.js` (no shake, no flashes, shorter particles).

### Visual design system (`style.css` + `renderer.js` constants)
All values live as CSS custom properties in `style.css` and as one `PP.theme` object in
`renderer.js` (read from the CSS variables at startup), so the canvas and the DOM share one
palette.

**Color tokens**

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#060a18` | page and canvas background |
| `--panel` | `#0b1430` | cards, overlays |
| `--panel-2` | `#0f1b3e` | stat tiles, review rows |
| `--node` | `#0c1734` / `#0a1534` | router fill / LAN panel fill |
| `--line` | `#2b3a6b` | borders, hairlines |
| `--text` | `#e6f0ff` | primary text |
| `--muted` | `#8aa0c8` | secondary text, header fields, labels |
| `--cyan` | `#3ef0ff` | packets, LAN glow, link flow, primary accent |
| `--magenta` | `#ff3df0` | target lock / hover, goal bar, kicker text |
| `--green` | `#3dffa2` | delivered, correct, phase clear, healthy integrity |
| `--red` | `#ff4d6d` | leak, wrong zap, danger, low integrity |
| `--yellow` | `#ffd23d` | score pop, combo |
| router stroke | `rgba(120,160,255,.9)` | idle router ring and icon (`#9fc0ff`) |

Gradients are allowed only for: the title (cyan → magenta text), the primary button
(cyan → magenta), the integrity bar (green → cyan above 60 %, yellow → orange 30–60 %,
red → magenta below 30 %), packet trails, and the background glows.

**Typography**
- Display: Orbitron 800/900 — game title (34–54 px), phase titles (22–30 px), HUD values (20 px),
  banners (32–64 px, responsive), ASNs (13 px), packet names (12 px), card titles.
- Data: JetBrains Mono 400/700 — body copy in cards (13–14 px), IP addresses (11 px), packet
  fields (10.5 px), HUD labels (10 px, uppercase, wide letter spacing).

**Playfield geometry (canvas, recomputed on resize)**
- LAN center at viewport center, shifted ~28 px down for the HUD. Routers on an ellipse:
  vertical radius = 43 % of (height − 190 px), minimum 120 px; horizontal radius =
  min(40 % of width, 1.55 × vertical radius). Router *i* sits at angle −90° + 45° × *i*.
- LAN panel: 230 × 76 px, 16 px corner radius, cyan stroke and glow that pulse (~2.4 rad/s),
  plus a faint magenta outer ring expanding out of phase. Title in Orbitron 15 px, subnet and
  prefix in mono 11 px under it.
- Routers: 27 px radius circles with a glowing stroke and a simple router glyph (four arrows with
  dot tips). ASN + IP label below the router (above for the top row). Glow and ring take the
  flash color (green on delivery, red on leak) and fade out over ~0.6 s. Slight grow (+18 %) when
  sending.
- Links: 3 px base line at low opacity plus a 2 px dashed line (2 on / 16 off) whose dash offset
  moves toward the LAN at ~36 px/s.
- Packets: 9.5 px glowing orb (7 px for flood copies) with a white core at 42 % radius, ±12 %
  pulse, 6 px gradient trail; travel uses ease-in-out per leg. Locked packets scale 1.3× and turn
  magenta.
- Packet label: dark translucent pill (8 px radius, 1.2 px cyan border at 45 %), 52 px above the
  orb, name on the first line, field on the second. Only the first copy of a flood carries a
  label.
- Background: solid `--bg`, a radial glow (blue at center → purple → transparent), a 44 px cyan
  grid at ~5 % opacity drifting ~8 px/s, and an edge vignette (red and pulsing below 35 %
  integrity).
- Reticle: four rotating arc segments (15 px radius, 20 px when locked) plus a small center
  cross; cyan idle, magenta locked; the system cursor is hidden over the canvas.

**DOM components**
- HUD: fixed top bar with a fade-to-transparent background; items are label (10 px uppercase
  muted) over value. Integrity bar 210 × 12 px. Combo scales to 1.5× for 120 ms on increase.
  Goal bar 120 × 6 px in magenta.
- Feedback cards: bottom-left stack, width min(360 px, 100 % − 32 px), max 3, newest on top,
  4 px colored left border, slide-in with a slight overshoot (~0.28 s), fade/slide out after
  6.5 s.
- Banners: centered at 42 % height, scale from 2.2× to 1×, hold, then fade upward over 1.4 s,
  text glow in the banner color.
- Overlay cards: full-screen dark backdrop with 5 px blur, card max 600 px wide, 18 px radius,
  1 px border, cyan outer glow, pop-in animation. Kicker line in magenta with wide letter
  spacing. Chips are pill-shaped: red-tinted for "zap these", green-tinted for "let these
  through", with the identifying field in smaller text. One primary button per card with
  gradient fill, dark text, hover lift, and a visible yellow focus ring.

### Game feel (`engine/effects.js`, `engine/audio.js`)
- On correct zap: ~60 ms hit-stop, ~160 ms slow-motion, particle burst (bigger on the hit copy),
  shockwave ring, gold "+score" text that scales with the combo, screen shake scaling with combo,
  rising-pitch laser + noise sound; a "COMBO xN!" banner every 4 consecutive correct zaps.
- On wrong zap: red full-screen flash, strong shake, "LEGIT!" text, low buzz; for BGP, the two
  routers flash red and a "ASx ⇎ ASy" banner appears.
- On leak: each receiving router flashes red with a small burst; low thud.
- On phase clear: all packets dissolve green, a ring sweeps the screen, "LAN CLEAN!" banner,
  arpeggio, then the next briefing.
- Low integrity (< 35 %): pulsing red vignette.

### Accessibility and input
- Pointer/touch: click/tap within ~30 px of a packet zaps the nearest one.
- Keyboard: `Tab` / arrow keys cycle target-lock through packets in flight (nearest-to-LAN
  first), `Space` zaps the locked packet, `L` lets it through (practice mode), `P` pauses,
  `M` mutes, `Enter` advances menus and briefings.
- A visually hidden ARIA live region announces the locked packet's label and every outcome's
  feedback text, so the game is playable without seeing the canvas in practice mode.

## What I am deliberately not building in v1
- User accounts or online leaderboards (local best score only)
- Mobile-first layout (touch works, but desktop is the target)
- A level editor UI (edit `data/*.js` directly)
- Music (sound effects only)
- Port quarantine / MAC-per-port mechanics (v2 candidate)
- Translations (English only in v1; all copy lives in data files to make this possible later)

## Definition of done for each phase
- Every packet type in the phase has a catalog entry with `source` and `source_status`, and every
  `owner-confirmed` entry shows players the "official citation pending" note until a citation is
  added.
- `node --test` passes: every catalog entry's verdict matches what `rules.js` recomputes from its
  fields and `lan.js`, and every phase's mix only contains types introduced in that phase or
  earlier.
- Briefing and all feedback copy (zapped / leaked / wrong zap) reviewed by a human for accuracy.
- Phase playable start to finish with keyboard only, in both arcade and practice mode.
- Phase playable with `prefers-reduced-motion` enabled without losing information.
