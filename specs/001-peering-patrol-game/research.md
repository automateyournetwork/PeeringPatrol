# Research — Peering Patrol v1 (revised 2026-11-18)

Technical Context has no open NEEDS CLARIFICATION items: the spec (with five clarification
answers), constitution v1.1.0, and the root `PLAN.md` settle the stack. This file records each
decision, why it was chosen, and what else was considered.

## R1. Loading code and data from `file://`

- **Decision**: Classic `<script>` tags in a fixed order, a single global `PP`, and data files
  written as JS that assign plain data (`PP.data.packets = [...]`). `engine/namespace.js` creates
  `globalThis.PP`; Node tests load the same files with `vm.runInThisContext` (`tests/helpers.js`).
- **Rationale**: Browsers block ES module imports and `fetch()` of local files on `file://`; the
  constitution requires opening `index.html` directly.
- **Alternatives**: ES modules + local server (breaks zero-install); a bundler (forbidden build
  step); JSON in `<script type="application/json">` (splits data from its editable file).

## R2. Rendering: Canvas 2D playfield, DOM for every piece of text

- **Decision**: One full-viewport `<canvas>` for background, links, LAN, routers, packets, labels,
  particles, rings, floats, and the reticle. DOM overlays for the HUD, cards, shift log, banners,
  and screens. Packet labels are drawn on canvas and the locked packet's label is mirrored to the
  live region.
- **Rationale**: Hundreds of particles and per-frame motion are cheap on canvas; text in the DOM
  keeps it readable by assistive technology (FR-031).
- **Alternatives**: DOM/CSS animation (stutters at endless load); WebGL (unneeded); SVG (slow with
  many particles).

## R3. Structured header fields and verdict recomputation (the correctness net)

- **Decision**: Packet `fields` hold structured header values — `dst_mac`, `ethertype`
  (`0x0800`, `0x86DD`, `0x0806`, or `802.3`), `llc` (e.g. `SNAP PID 0x2000`, `DSAP 0x42`),
  `src_ip`, `dst_ip`, `ip_proto` (number; shown as "next header" for IPv6), `dst_port`,
  `icmpv6_type`, `sender`, `target` — with `{template}` values filled per instance.
  `rules.recomputeVerdict(fields, lan)` derives the verdict with fixed predicates, in this order:
  1. dst MAC `01:00:0c:cc:cc:cc` (Cisco discovery) → forbidden
  2. dst MAC `01:80:c2:00:00:0x` (IEEE 802.1 reserved, e.g. STP) → forbidden
  3. EtherType `0x0806` (ARP) → allowed only if sender **and** target are in the ATM subnet
  4. IP protocol 89 (OSPF/OSPFv3), 103 (PIM), 2 (IGMP) → forbidden
  5. ICMPv6 type 130/131/132/143 (MLD), 133 (RS), 134 (RA) → forbidden; 135/136 (NS/NA) →
     allowed only if the target is in the ATM prefix; other types → unknown
  6. UDP 5678 (MNDP) → forbidden
  7. UDP 123 (NTP) → forbidden to a broadcast or multicast destination, allowed to unicast
  8. any other broadcast/multicast destination → unknown
  9. TCP 179 between ATM addresses → allowed; other unicast to a unicast MAC → allowed
  The catalog `verdict` remains the human-reviewed statement. Tests require
  `recomputed === catalog` for every entry over 1,000 seeded instances; at load, any mismatch or
  `unknown` excludes the type (never shown).
- **Rationale**: Two independent statements of each fact turn a data typo into a test failure
  (Principle I). Structured fields also let `labels.js` render any detail level and let hints
  point at a real field.
- **Alternatives**: display strings only, as in the root `PLAN.md` example (cannot be recomputed);
  deriving verdicts from fields only (hides the reviewed statement).
- **Address details**: `expandIPv6` handles `::`; `inPrefix` compares leading bits; IPv4 subnet
  broadcast (`203.0.113.255`) and `255.255.255.255` count as broadcast; `ff00::/8` and
  `224.0.0.0/4` as multicast; a MAC is a group address when the low bit of its first octet is set.
- **Delivery**: `flood` ⇔ the dst MAC is a group (broadcast or multicast) address; validated for
  every entry and variant (spec FR-008).

## R4. Continuous shift and per-phase gate

- **Decision**: `scoring.js` keeps one `ShiftState`. Decision counts exist at two levels: **phase**
  (reset on entering each phase; drive the gate) and **shift** (for the shift summary). Phase
  accuracy = `(zapCorrect + delivered) / (zapCorrect + delivered + zapWrong + leak)` (1 when
  nothing has been decided yet). At the 10th correct zap of a teaching phase: accuracy ≥ 0.80 →
  `phase-cleared`, otherwise `not-cleared`, which ends the shift. Integrity ≤ 0 → `integrity-out`
  (checked before the goal). Entering the next phase keeps integrity, score, combo, best combo,
  and shift counts; resets phase counts and the phase review list. After Phase 5 the next phase is
  endless (id 6). A flood packet is one decision, not one per copy.
- **Rationale**: FR-017, FR-017a, FR-018, clarification 2026-11-18 (option C).
- **Alternatives**: separate attempts per phase (rejected in clarification); continuing until
  accuracy recovers (rejected earlier); restoring integrity on clear (option D, not chosen).

## R5. Integrity, costs, combo, points

- **Decision**: Integrity starts at 100 per shift. Phase data defines `leak_cost` (default 10) and
  `wrong_zap_cost` (default 20); tests assert `wrong_zap_cost > leak_cost`. Combo +1 on each
  correct decision (correct zap or delivered), reset on any incorrect one; it carries across phase
  boundaries. Multiplier `min(5, 1 + floor(combo / 4))`. Points: correct zap 100 × multiplier,
  delivered 10. The "COMBO xN!" banner fires when combo reaches a multiple of 4. Reaction time
  never enters scoring.
- **Rationale**: FR-014, FR-016, Principle IV; about 9 leaks of headroom early in the shift.

## R6. Feedback cards and shift log (non-pausing, never lost)

- **Decision**: `views/cards.js` renders each card twice at the same moment: (a) in a bottom-left
  stack — width min(360 px, 100% − 32 px), newest on top, max 3 visible (the oldest leaves early
  when a 4th arrives), slide-in ~0.28 s, fade/slide out after 6.5 s; (b) at the top of the
  **shift log**, a right-side drawer overlaying the playfield, collapsed by default, toggled with
  `F` or a HUD button, scrollable and keyboard reachable, cleared when a new shift starts. Cards
  show a text outcome tag (never color alone). Each outcome's card title + first sentence is
  queued to the `aria-live="polite"` region. Delivered packets get no card (green confirmation
  only), matching SC-002's scope.
- **Rationale**: FR-011a, FR-043 (clarification option C), the root `PLAN.md` component spec.
- **Alternatives**: side panel only (takes playfield width); toasts only (explanations lost).

## R7. Practice mode timing

- **Decision**: In practice mode a packet stops just before the LAN (before any split) and waits
  for `zap` or `let-through`; the next packet spawns only after the decision. Effects still play;
  reduced-motion rules still apply.
- **Rationale**: FR-024: one decision at a time, no timer, graded the same.

## R8. Seedable spawning

- **Decision**: mulberry32 seeded per shift (`Date.now()` by default; `?seed=` in the URL for
  reproducible playtests; fixed seeds in tests). The spawner picks forbidden vs allowed by
  `mix.forbidden_ratio`, then prefers types introduced in the current phase with probability
  `mix.new_type_bias`, then a uniform variant, a random source member, and a different peer;
  example addresses come from `lan.js`.
- **Rationale**: deterministic tests of "phase mixes use only introduced types" and reproducible
  bug reports.

## R9. Visual design system

- **Decision**: Adopt the root `PLAN.md` visual design system as contracts/visual-design.md.
  Tokens live as CSS custom properties in `style.css`; `renderer.js` reads them once at startup
  into `PP.theme` (with the same literal values as fallbacks), so canvas and DOM share one
  palette. Layout: canvas fills the viewport; the HUD is a fixed top bar fading to transparent;
  the LAN center sits ~28 px below the viewport center.
- **Rationale**: FR-035–FR-044; one source for every visual value.

## R10. Reduced motion, sound, fonts

- **Decision**: `matchMedia('(prefers-reduced-motion: reduce)')` selects an effects profile with
  no shake, no full-screen flash (an outline pulse instead), no hit-stop or slow motion, 30% of
  the particles, shorter rings, and no reticle spin; it listens for changes live. Web Audio is
  synthesized; the `AudioContext` is created on the first user gesture. Mute is persisted. Fonts
  load from Google Fonts with `display=swap` and system fallbacks.
- **Rationale**: FR-029, FR-030, FR-045, Principle V.

## R11. Load validation, error state, empty state

- **Decision**: `validate.js` runs before the menu. Missing data globals, schema errors, unknown
  ids in phases, a broken variant chain, a non-documentation address, or bad costs → **error
  screen** listing the problems (no play). Missing/invalid source, `conflict: true`,
  recomputation mismatch/unknown, or delivery mismatch → that type is **excluded**. A teaching
  phase whose introduced types are all excluded, or endless with no playable types at all →
  **empty-state** screen for that phase.
- **Rationale**: FR-003, FR-032, data-model validation rules.

## R12. Persistence

- **Decision**: `localStorage["peeringPatrol.v1"]` = `{ settings: { mode, muted }, unlocked:
  int[], best: { arcade: { shiftScore, endlessCorrectZaps }, practice: { … } } }`. Reads merge
  with defaults; writes are try/catch with in-memory fallback. An in-progress shift is never
  saved.
- **Rationale**: FR-018, FR-020a, FR-033.

## R13. Endless labels and cards

- **Decision**: Endless labels show only header fields before the decision; the card after the
  decision names the protocol. Speed: every 10 correct zaps in endless, spawn interval and travel
  time are multiplied by `speedup_factor`, floored by `min_spawn_interval_s` and
  `min_travel_time_s`.
- **Rationale**: FR-009, FR-020, the recall test.
