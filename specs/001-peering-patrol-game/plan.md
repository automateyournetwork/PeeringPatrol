# Implementation Plan: Peering Patrol — IXP Peering LAN Hygiene Game (v1)

**Branch**: `001-peering-patrol-game` (working on `main`) | **Date**: 2026-11-18 (revised) |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-peering-patrol-game/spec.md` (including the
2026-11-18 look-and-feel requirements and the continuous-shift clarification), plus the
owner-authored technical notes and visual design system in the project-root `PLAN.md`.

**Revision note**: This plan replaces the first version from the same day. What changed:
(1) the game model is a **continuous shift** with per-phase gates instead of one attempt per
phase; (2) feedback cards appear **bottom-left (max 3, fading after 6.5 s) plus a collapsible
shift log** instead of an always-visible side panel; (3) the **visual design system** from the
root `PLAN.md` is adopted as a contract; (4) packet `fields` are **structured header values** so
that the rules engine can recompute every verdict; (5) the constitution moved to v1.1.0 (the
spec documents must be self-contained).

## Summary

A zero-install browser game. A full-viewport Canvas 2D playfield (glowing LAN in the center, 8
member routers on an ellipse, packets that travel unicast or split and flood) sits under DOM
overlays for all text: a fixed HUD bar, bottom-left feedback cards, a collapsible shift log,
banners, and centered menu, briefing, and summary cards. A pure, Node-testable rules engine is the
only code that decides verdicts. It reads static data files and independently recomputes each
verdict from structured header fields, so a data typo fails the tests instead of teaching
something wrong. A pure scoring module runs the continuous shift: integrity, score, and combo
carry across phases; each phase needs 10 correct zaps **and** ≥ 80% phase accuracy; Phase 5
flows into endless; integrity at zero ends the shift, which restarts from the phase reached.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020, classic scripts, no modules)

**Primary Dependencies**: None at runtime. Google Fonts (Orbitron, JetBrains Mono) are optional,
with system fallbacks. Dev only: Node.js ≥ 20 built-in test runner (`node --test`).

**Storage**: `localStorage` key `peeringPatrol.v1` (settings, unlocked phases, bests), every
access wrapped in try/catch; the game works with storage unavailable.

**Testing**: `node --test` for the rules engine, data integrity, labels, spawner, scoring
and shift logic, and the separation rule; a manual quickstart checklist for rendering, input,
accessibility, and reduced motion.

**Target Platform**: Current desktop Chrome, Firefox, Safari, and Edge, from `file://` or any
static host. Touch zaps work; desktop is the target.

**Project Type**: Single-page static web game (no backend)

**Performance Goals**: ~60 fps on a mid-range laptop at the endless maximum (≤ 16 packets in
flight, ≤ 600 live particles) (SC-007).

**Constraints**: Runs offline from `file://` (no `fetch`, no ES modules), no build step, no
runtime network calls for content, keyboard-complete, honors `prefers-reduced-motion`, and all
visual values come from one shared theme (contracts/visual-design.md).

**Scale/Scope**: 18 spec catalog rows (20 packet entries), 5 phases plus endless, 8 members,
about 30 source files, English only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.* Constitution v1.1.0.

| Principle / gate | How the plan complies | Pre | Post |
|---|---|---|---|
| I. Correctness non-negotiable | Verdicts come only from `engine/rules.js`. `recomputeVerdict` derives each verdict from structured header fields; tests and load-time validation exclude any type whose recomputation disagrees with the catalog. Missing or invalid source, or a conflict flag, excludes the type (FR-003). | ✅ | ✅ |
| II. Data-driven, auditable | `data/lan.js`, `data/packets.js`, `data/phases.js` hold only data and are schema-validated at load and in tests. Every entry has `source` + `source_status`. Difficulty and copy live in data. | ✅ | ✅ |
| III. The game teaches | Briefing per phase; a card for every zap, wrong zap, and leak, never lost (bottom-left + shift log); phase order and the variant chain enforced by tests; label detail per phase; fix and real-world-response lines in every card. | ✅ | ✅ |
| IV. Earned progress | Per-phase gate of 10 correct zaps + ≥ 80% accuracy, unchanged on restart; a not-cleared phase ends the shift; combo counts consecutive correct decisions only; `wrong_zap_cost > leak_cost` asserted; practice mode clears and unlocks phases. | ✅ | ✅ |
| V. Accessible, zero-install | Opens `index.html` from disk; full keyboard map; ARIA live region for locks and every outcome; reduced-motion effect profile; red/green always paired with text or symbols; mute persisted; explicit loading, error, and empty screens. | ✅ | ✅ |
| Scope & Non-Goals | Scripted packet paths, no switching or BGP simulation, no accounts, leaderboards, or AI. | ✅ | ✅ |
| Content gate | An owner-review task follows each content task. `owner-confirmed` entries show the transparency note (FR-004). | ✅ | ✅ |
| Engine gate | Tests cover all 20 entries over seeded instances, each variant pair, every phase mix, delivery vs destination, and shift scoring. | ✅ | ✅ |
| Separation gate | Views, renderer, effects, and motion receive only outcome events; `tests/separation.test.js` fails if their code (comments stripped) uses `verdict`. | ✅ | ✅ |
| Accessibility gate | Every story's validation task includes keyboard-only play and reduced motion (quickstart Q6, Q7). | ✅ | ✅ |
| Self-contained specs (v1.1.0) | All look and feel is described in contracts/visual-design.md and the spec; no spec document references exploratory code. | ✅ | ✅ |

**Deviations from the root `PLAN.md`** (none violate the constitution):
- Its definition of done blocks release on official citations; per spec FR-004 this becomes
  "every `owner-confirmed` entry shows the transparency note".
- Its `packets.js` example uses display strings (`l3`, `l4`); this plan uses structured header
  fields so verdicts can be recomputed (research R3). Display text is produced by
  `engine/labels.js`.
- Its `engine/state.js` is split into `engine/scoring.js` (pure shift rules) and
  `engine/storage.js` (persistence) for testability.
- Its feedback cards (bottom-left, max 3, 6.5 s) are kept, and the shift log (FR-011a) is added.

## Project Structure

### Documentation (this feature)

```text
specs/001-peering-patrol-game/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, validation, state machines
├── quickstart.md        # Phase 1 run and validation guide
├── contracts/
│   ├── data-files.md    # data/lan.js, packets.js, phases.js schemas + load order
│   ├── rules-engine.md  # engine/rules.js, labels.js, scoring.js (shift) public API
│   ├── ui-controls.md   # input map, screens, cards + shift log, announcements
│   └── visual-design.md # color tokens, typography, playfield geometry, components, effects
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root = `PeeringPatrol/`)

```text
index.html               # DOM shells + classic scripts in contract order
style.css                # design tokens (CSS custom properties) + DOM components
main.js                  # bootstrap + screen state machine (loading → menu → briefing → play → summaries)
engine/
├── namespace.js         # window.PP = { data, engine, views }; Node shim
├── rng.js               # mulberry32 seedable PRNG; ?seed= support
├── rules.js             # address helpers, recomputeVerdict, evaluatePacket, evaluateAction (pure)
├── scoring.js           # shift state: costs, combo, per-phase gate, carry-over, records (pure)
├── spawner.js           # template context + instance filling + phase mix (pure given rng)
├── labels.js            # header-field formatting per label detail level, hint highlight (pure)
├── feedback.js          # card text from catalog templates; transparency note (pure)
├── validate.js          # schema, sources, recomputation, variant chain, ranges, empty phases
├── motion.js            # leg timing, positions, practice hold
├── effects.js           # particles, rings, shake, hit-stop, slow-mo, flashes, floats; reduced-motion profile
├── audio.js             # Web Audio synthesized SFX + mute
├── renderer.js          # Canvas scene + PP.theme read from CSS variables
├── input.js             # pointer hit-test, keyboard map → abstract actions
└── storage.js           # safe localStorage wrapper
views/
├── screens.js           # overlay card host: loading, error, empty, pause
├── cards.js             # bottom-left card stack (max 3, 6.5 s) + shift log drawer + live announcer
├── hud.js               # fixed top bar
├── menu.js              # mode toggle, phase list with locks, endless entry with bests, key help
├── briefing.js          # ZAP THESE / LET THESE THROUGH chips
├── summary.js           # phase summary (continue) and shift summary (restart from phase reached)
└── challenge.js         # game loop wiring spawner → motion → input → rules → scoring → effects/views
data/
├── lan.js               # ATM 203.0.113.0/24, 2001:db8:12::/64, AS64496–AS64503, example addresses
├── packets.js           # 20 packet entries
└── phases.js            # phases 1–5 + endless (id 6)
tests/
├── helpers.js           # loads classic scripts into Node like index.html does
├── rules.test.js        # helpers, recomputation per protocol, catalog loop, variant pairs
├── data.test.js         # schema, sources, chain, ranges, costs, validation negatives
├── labels.test.js       # detail levels; fields-only never shows protocol names
├── spawner.test.js      # mixes, flood vs unicast, template filling, hints
├── scoring.test.js      # costs, combo, gate, carry-over, not-cleared ends shift, endless, records
└── separation.test.js   # views/renderer/effects/motion never use `verdict`
```

**Structure Decision**: A single static project at the repository root, extending the root
`PLAN.md` layout with `engine/labels.js`, `engine/validate.js`, `engine/scoring.js`,
`engine/storage.js`, `views/screens.js`, `views/cards.js`, and `views/menu.js`. The layout is a
full-viewport canvas with DOM overlays (contracts/visual-design.md → Layout); there is no fixed
side column.

## Complexity Tracking

No constitution violations. Canvas for the playfield (instead of the starter kit's "prefer DOM"
default) is justified in research.md R2; all teaching text stays in the DOM and the live region.
