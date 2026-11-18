# Contract — Visual Design System

Source: the root `PLAN.md` "Visual design system" section, adopted as-is except where noted.
Every value lives once as a CSS custom property in `style.css`; `engine/renderer.js` reads the
same properties at startup into `PP.theme` (using these literals as fallbacks), so canvas and DOM
share one palette (spec FR-035–FR-044).

## Color tokens
| Token | Value | Used for |
|---|---|---|
| `--bg` | `#060a18` | page and canvas background |
| `--panel` | `#0b1430` | cards, overlays, shift log |
| `--panel-2` | `#0f1b3e` | stat tiles, review rows, chips background |
| `--node` | `#0c1734` | router fill |
| `--node-lan` | `#0a1534` | LAN panel fill |
| `--line` | `#2b3a6b` | borders, hairlines |
| `--text` | `#e6f0ff` | primary text |
| `--muted` | `#8aa0c8` | secondary text, header fields, HUD labels |
| `--cyan` | `#3ef0ff` | packets, LAN glow, link flow, primary accent |
| `--magenta` | `#ff3df0` | lock / hover, goal bar, kicker text |
| `--green` | `#3dffa2` | delivered, correct, phase clear, healthy integrity |
| `--red` | `#ff4d6d` | leak, wrong zap, danger, low integrity |
| `--yellow` | `#ffd23d` | score pop, combo, focus ring, hint highlight |
| `--router-stroke` | `rgba(120,160,255,.9)` | idle router ring; icon `#9fc0ff` |

Gradients only for: the title text (cyan → magenta), the primary button (cyan → magenta), the
integrity bar (green → cyan above 60 %, yellow → orange 30–60 %, red → magenta below 30 %),
packet trails, and background glows.

**Addition (accessibility, FR-045):** red/green is never the only signal — chips carry ✕ / ✓,
cards carry a text tag, the integrity bar shows its percentage as text, and the hint highlight
uses yellow plus an underline.

## Typography
- Display: Orbitron 800/900 — title 34–54 px, phase titles 22–30 px, HUD values 20 px, banners
  32–64 px (responsive), ASNs 13 px, packet names 12 px, card titles.
- Data: JetBrains Mono 400/700 — card body 13–14 px, IP addresses 11 px, packet fields 10.5 px,
  HUD labels 10 px uppercase with wide letter spacing.
- Fallbacks: system sans-serif and monospace.

## Layout
- The canvas fills the viewport. The HUD is a fixed top bar with a background fading to
  transparent; cards, shift log, banner, and screens are DOM overlays.
- Shift log: right-side drawer (width min(380 px, 100 % − 32 px)) over the playfield, collapsed
  by default; it never shifts the playfield.

## Playfield geometry (canvas, recomputed on resize)
- LAN center = viewport center, shifted ~28 px down. Routers on an ellipse: vertical radius =
  43 % of (height − 190 px), minimum 120 px; horizontal radius = min(40 % of width, 1.55 ×
  vertical radius). Router *i* at angle −90° + 45° × *i*.
- LAN panel 230 × 76 px, 16 px radius, cyan stroke and glow pulsing (~2.4 rad/s), faint magenta
  outer ring expanding out of phase; title "IX PEERING LAN · ATM" in Orbitron 15 px, subnet and
  prefix in mono 11 px below.
- Routers: 27 px radius circles, glowing stroke, router glyph (four arrows with dot tips). ASN +
  IPv4 below (above for the top row). Flash color (green delivered, red leak) fades over ~0.6 s;
  +18 % grow when sending.
- Links: 3 px base line at low opacity plus a 2 px dashed line (2 on / 16 off) moving toward the
  LAN at ~36 px/s.
- Packets: 9.5 px glowing orb (7 px for flood copies), white core at 42 % radius, ±12 % pulse,
  6 px gradient trail, ease-in-out per leg. Locked: 1.3× and magenta.
- Packet label: dark translucent pill (8 px radius, 1.2 px cyan border at 45 %), 52 px above the
  orb; name on line 1, field(s) below. Only the first copy of a flood carries a label. Deciding
  field (Phase 5, hints) in yellow with an underline.
- Background: solid `--bg`, radial glow (blue center → purple → transparent), 44 px cyan grid at
  ~5 % opacity drifting ~8 px/s, edge vignette (red and pulsing below 35 % integrity).
- Reticle: four rotating arc segments (15 px radius, 20 px locked) + small center cross; cyan
  idle, magenta locked; system cursor hidden over the canvas.

## DOM components
- HUD: label (10 px uppercase muted) over value; integrity bar 210 × 12 px with percentage
  text; combo scales 1.5× for 120 ms on increase; goal bar 120 × 6 px magenta; mode tag; "Log (F)"
  and sound buttons.
- Feedback cards: bottom-left stack, width min(360 px, 100 % − 32 px), max 3, newest on top,
  4 px colored left border, slide-in ~0.28 s with slight overshoot, fade/slide out after 6.5 s.
- Banners: centered at 42 % height, scale 2.2× → 1×, hold, fade upward over 1.4 s, glow in the
  banner color.
- Overlay cards: full-screen dark backdrop with 5 px blur; card max 600 px wide (680 px for
  summaries), 18 px radius, 1 px border, cyan outer glow, pop-in. Magenta kicker with wide
  letter spacing. Pill chips (red-tinted "zap these", green-tinted "let these through") with the
  identifying field in smaller text. One primary gradient button per card with dark text, hover
  lift, and a yellow focus ring.

## Effects (timings)
| Event | Effects |
|---|---|
| Correct zap | ~60 ms hit-stop, ~160 ms slow motion, spark burst (bigger on the hit copy), shockwave ring, gold "+score" growing with the combo, shake scaling with the combo, rising-pitch laser + noise; "COMBO xN!" banner + fanfare at each multiple of 4 |
| Wrong zap | red full-screen flash, strong shake, red "LEGIT!", low buzz; BGP: both routers flash red + "ASx ⇎ ASy" banner |
| Leak | each receiving router flashes red with a small burst; dull thud |
| Phase start / clear | "PHASE n" banner / packets dissolve green, ring sweeps the screen, "LAN CLEAN!" banner, arpeggio |
| Endless speed-up | "SPEED UP" banner |
| Shift end | routers burst red one after another (~90 ms apart), then the summary |
| Integrity < 35 % | pulsing red vignette |

**Reduced-motion profile:** no shake, no full-screen flash (outline pulse instead), no hit-stop
or slow motion, 30 % of the particles, shorter rings, static grid, no reticle spin, banners fade
without scaling. All information remains in text.
