---

description: "Task list for Peering Patrol v1 (regenerated 2026-11-18 for the revised plan)"
---

# Tasks: Peering Patrol — IXP Peering LAN Hygiene Game (v1)

**Input**: Design documents from `specs/001-peering-patrol-game/` — plan.md (revised), spec.md,
research.md, data-model.md, contracts/ (data-files, rules-engine, ui-controls, visual-design),
quickstart.md

**Tests**: INCLUDED. The constitution's Engine gate requires automated tests for the rules engine
covering every packet type and each "same protocol, different verdict" case. Tests use Node's
built-in runner (`node --test`) and are written before the code they cover.

**Regeneration note**: This list replaces the 70-task version. Tasks already completed by the
earlier implementation run and still valid under the revised plan are marked `[X]`; files from
that run that no longer match the plan (`index.html`, `style.css`) are reworked by T003–T004.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story (US1–US5) from spec.md
- Paths are relative to the repository root (`PeeringPatrol/`), per plan.md → Project Structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Skeleton that runs from `file://` and under Node

- [X] T001 Create directories `engine/`, `views/`, `data/`, `tests/` at the repository root per plan.md → Project Structure
- [X] T002 Create `engine/namespace.js` defining `globalThis.PP = { data, engine, views }` with a Node shim (research.md R1)
- [X] T003 Rework `index.html` to the overlay layout in contracts/visual-design.md → Layout: full-viewport `<canvas id="playfield" tabindex="0">`, fixed `<header id="hud">`, bottom-left `<ol id="cards">`, right-side drawer `<aside id="log">` (collapsed, containing `<ol id="log-list">`), `#banner`, `#screens`, visually hidden `#live` (`aria-live="polite"`); classic scripts in the exact order of contracts/data-files.md → Load-order contract (`views/cards.js` replaces `views/panel.js`)
- [X] T004 [P] Rework `style.css`: define every token of contracts/visual-design.md → Color tokens as CSS custom properties (`--bg`, `--panel`, `--panel-2`, `--node`, `--node-lan`, `--line`, `--text`, `--muted`, `--cyan`, `--magenta`, `--green`, `--red`, `--yellow`, `--router-stroke`); typography; HUD, card stack, shift-log drawer, banner, overlay card, chip, stat, button, and focus-ring styles per contracts/visual-design.md → DOM components; reduced-motion overrides
- [X] T005 [P] Create `package.json` (`private`, `"test": "node --test"`, no dependencies)
- [X] T006 [P] Create `tests/helpers.js` that loads `engine/namespace.js`, `data/*.js`, and engine files into Node in index.html order

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ground-truth data shape, verdict engine, labels, spawner, scoring (shift), validation,
storage — everything the stories depend on, proven by tests first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation (write first; confirm they fail)

- [X] T007 [P] Write `tests/rules.test.js`: `expandIPv6`, `inSubnet`, `inPrefix`, `isGroupMac`, `isBroadcastOrMulticast` (incl. `203.0.113.255`, `224.0.1.1`, `ff05::101`); `recomputeVerdict` cases for every predicate in research.md R3 (CDP MAC, IEEE 802.1 MAC, ARP sender/target in/out, IP proto 89/103/2, ICMPv6 130/131/132/143/133/134, NS/NA target in/out, UDP 5678, UDP 123 unicast vs broadcast/multicast, TCP 179, plain unicast, unknown multicast); the outcome table in contracts/rules-engine.md; and a catalog loop asserting, for every entry in `data/packets.js`, that 1,000 seeded instances recompute to data-model.md PacketType.verdict and that data-model.md PacketType.delivery is `flood` ⇔ the filled dst MAC is a group address
- [X] T008 [P] Write `tests/scoring.test.js` for contracts/rules-engine.md → `PP.engine.scoring` invariants 1–8: costs from data-model.md Phase.leak_cost and Phase.wrong_zap_cost; combo/multiplier and that `enterPhase` keeps combo; per-phase gate from data-model.md Phase.goal_zaps and Phase.clear_accuracy at 79/80/81 %; integrity before goal; `not-cleared` ends the shift; `enterPhase` carries data-model.md ShiftState.integrity, ShiftState.score, ShiftState.combo, ShiftState.shiftCounts and resets ShiftState.phaseCounts and ShiftState.phaseMissed while raising ShiftState.phaseReached; endless ShiftState.speedLevel and ShiftState.endlessCorrectZaps; ShiftState.hintTypes add/consume; `shiftResult` values of data-model.md ShiftResult.status, ShiftResult.restartPhaseId, ShiftResult.newRecords; `updateProgress` on data-model.md SavedProgress.unlocked and SavedProgress.best; no reaction-time inputs
- [X] T009 [P] Write `tests/data.test.js`: schema checks for data-model.md LAN.ipv4_subnet, LAN.ipv6_prefix, LAN.members, LAN.remote_examples, LAN.outside_examples; Member.asn, Member.ipv4, Member.ipv6, Member.ll, Member.mac, Member.slot; each packet's PacketType.id, PacketType.name, PacketType.verdict, PacketType.phase, PacketType.delivery, PacketType.fields, PacketType.variants, PacketType.variant_of, PacketType.deciding_field, PacketType.identifying, PacketType.label, PacketType.feedback, PacketType.fix, PacketType.source, PacketType.source_status; each phase's Phase.id, Phase.introduces, Phase.mix, Phase.goal_zaps, Phase.clear_accuracy, Phase.label_detail, Phase.leak_cost, Phase.wrong_zap_cost; plus negative fixtures for each of data-model.md → Validation rules 1–7 (incl. endless with empty `introduces` is valid and not empty, and a teaching phase with all types excluded is reported empty)
- [X] T010 [P] Write `tests/separation.test.js`: strip `//` and `/* */` comments from every file in `views/` and from `engine/renderer.js`, `engine/effects.js`, `engine/motion.js`, then fail if `\bverdict\b` remains (constitution Separation gate)
- [X] T011 [P] Write `tests/labels.test.js` for contracts/rules-engine.md → `PP.engine.labels`: `formatField` for every field key in data-model.md PacketType.fields; `build` for each data-model.md Phase.label_detail value; hinted instances mark the deciding field; with `fields-only`, no output text matches the type's data-model.md PacketType.name (word boundary)
- [X] T012 [P] Write `tests/spawner.test.js`: with a fixed seed, `instantiate` fills every template (no `{` left), picks only declared variants, targets one peer ≠ source for unicast and all 7 others for flood, uses data-model.md LAN.outside_examples only for `{out_*}` values, computes correct solicited-node `{sn_ip_*}` / `{sn_mac_*}`; `createSpawner` draws only types with `phase ≤` the current phase and never excluded ones

### Implementation for Foundation

- [X] T013 Create `data/lan.js` per contracts/data-files.md with data-model.md LAN.ipv4_subnet, LAN.ipv6_prefix, LAN.members (Member.slot, Member.asn, Member.ipv4, Member.ipv6, Member.ll, Member.mac), LAN.remote_examples, LAN.outside_examples
- [X] T014 [P] Create `data/packets.js` as `PP.data.packets = []` and `data/phases.js` as `PP.data.phases = []` (content arrives per story)
- [X] T015 [P] Implement `engine/rng.js`: mulberry32 `createRng(seed)` with `next`, `int`, `pick`; `seedFromLocation()` reading `?seed=` (research.md R8)
- [X] T016 Implement `engine/rules.js` per contracts/rules-engine.md → `PP.engine.rules` and research.md R3 (pure, Node-loadable)
- [X] T017 Implement `engine/scoring.js` per contracts/rules-engine.md → `PP.engine.scoring`, producing data-model.md ShiftState.status, ShiftState.phaseReached, ShiftState.integrity, ShiftState.phaseCounts, ShiftState.shiftCounts, ShiftState.hintTypes, ShiftState.speedLevel, PhaseResult, ShiftResult.status, ShiftResult.phaseReached, ShiftResult.restartPhaseId, ShiftResult.newRecords and updating SavedProgress.unlocked, SavedProgress.best (research.md R4, R5)
- [X] T018 Implement `engine/spawner.js`: `buildContext(src, peer, lan, rng)` (all template keys in data-model.md → PacketType template keys, incl. solicited-node values), `instantiate(type, lan, rng, phase, opts)` → data-model.md PacketInstance, and `createSpawner(phase, catalog, lan, rng, { excluded })` honoring data-model.md Phase.mix and PacketType.variants; depends on T015, T016
- [X] T019 [P] Implement `engine/labels.js` per contracts/rules-engine.md → `PP.engine.labels` (`formatField`, `build`)
- [X] T020 [P] Implement `engine/feedback.js`: `buildCard(outcome, type, instance, lan)` → `{ kind, tag, name, field, body, fix, realWorld, note }` from data-model.md PacketType.feedback, PacketType.fix, PacketType.identifying; the real-world-response line (FR-026); the transparency-note constant when data-model.md PacketType.source_status is `owner-confirmed` (FR-004); `reviewEntry(type, ctx, lan)` for summaries
- [X] T021 Implement `engine/validate.js`: `validateAll(PP.data, PP.engine) → { ok, errors, excludedTypes, emptyPhases }` enforcing data-model.md → Validation rules 1–7 (exclusions use data-model.md PacketType.source, PacketType.source_status, PacketType.conflict, PacketType.verdict, PacketType.delivery over every variant × member pair); depends on T016, T018
- [X] T022 [P] Implement `engine/storage.js`: try/catch `load()` merging with defaults and `save()` for key `peeringPatrol.v1`, shape data-model.md SavedProgress.settings, SavedProgress.unlocked, SavedProgress.best, with in-memory fallback (research.md R12)
- [X] T023 Run `node --test` and confirm T007–T012 pass against the empty catalog plus their fixture and unit cases

**Checkpoint**: Engine, labels, spawner, scoring, validation, and storage proven — stories can begin

---

## Phase 3: User Story 1 - Play and clear the first shift (Priority: P1) 🎯 MVP

**Goal**: A full arcade shift on Phase 1 — briefing, animated LAN, zap / leak / wrong zap with the
specified effects, bottom-left cards plus shift log, phase summary with the 80 % gate, shift
summary, restart from the phase reached.

**Independent Test**: Open `index.html`, start a shift at Phase 1; each of the 7 Phase 1 types
gives the right outcome, effects, and card; below 80 % shows "not cleared"; clearing unlocks Phase 2
(quickstart Q1–Q9, Q12, Q13).

### Tests for User Story 1

- [X] T024 [P] [US1] Extend `tests/data.test.js` with Phase 1 assertions: ids `cdp`, `mndp`, `stp`, `bgp`, `unicast-v4`, `unicast-v6`, `arp` exist with data-model.md PacketType.phase = 1; Phase 1's data-model.md Phase.introduces lists exactly them; `arp` has PacketType.source_status `owner-confirmed`

### Implementation for User Story 1

- [X] T025 [P] [US1] Add the 7 Phase 1 entries to `data/packets.js` from the spec Packet Catalog per contracts/data-files.md, setting data-model.md PacketType.id, PacketType.name, PacketType.verdict, PacketType.phase, PacketType.delivery, PacketType.fields, PacketType.deciding_field, PacketType.identifying, PacketType.label, PacketType.feedback, PacketType.fix, PacketType.source, PacketType.source_status (BGP `wrong_zap` names the broken peering; every forbidden `fix` names what to disable on the IX-facing interface)
- [X] T026 [P] [US1] Add Phase 1 to `data/phases.js`: data-model.md Phase.id = 1, Phase.title, Phase.concept, Phase.briefing, Phase.introduces, Phase.mix, Phase.goal_zaps = 10, Phase.clear_accuracy = 0.8, Phase.spawn_interval_s, Phase.travel_time_s, Phase.max_packets, Phase.label_detail = `name+field`, Phase.leak_cost = 10, Phase.wrong_zap_cost = 20
- [ ] T027 [US1] Content review gate: the project owner reviews the Phase 1 entries in `data/packets.js` and the Phase 1 briefing in `data/phases.js`; record reviewer + date in each file's header comment; no merge before sign-off (constitution Content gate); depends on T025, T026
- [X] T028 [US1] Implement `engine/motion.js`: per-leg ease-in-out timing from PacketInstance.dur, `positions(instance, layout)` (one point inbound; one or 7 points outbound), `advance(instance, dt)` returning `reached-lan` / `arrived`, zappable only while inbound (data-model.md → Packet instance)
- [X] T029 [P] [US1] Implement `engine/renderer.js` per contracts/visual-design.md → Playfield geometry: `PP.theme` from CSS variables, layout on resize, background glow + drifting grid + vignette (red pulse below 35 % integrity), links with flowing dashes, pulsing LAN panel with title and ATM subnet/prefix, routers on the ellipse with data-model.md Member.asn and Member.ipv4 labels, flash and grow states, packet orbs with trails, label pills drawn from `labels.build` (deciding field in yellow + underline), lock/hover magenta, reticle; identical packet look regardless of outcome
- [X] T030 [P] [US1] Implement `engine/effects.js` per contracts/visual-design.md → Effects: particle pool (≤ 600), shockwave rings, shake, hit-stop, slow motion, red flash, floating text; `timeScale()`; a reduced-motion profile that follows `matchMedia` live
- [X] T031 [P] [US1] Implement `engine/audio.js`: synthesized zap (pitch rising with combo), combo fanfare, wrong buzz, leak thud, phase arpeggio, shift-over cadence; `AudioContext` on first gesture; `setMuted` / `isMuted`
- [X] T032 [P] [US1] Implement `engine/input.js`: pointer tracking and nearest-zappable hit test within ~30 px; the key map in contracts/ui-controls.md → Input map emitting abstract actions (`lockNext`, `lockPrev`, `zap`, `letThrough`, `toggleLog`, `escape`, `pause`, `quit`, `mute`, `confirm`, `restart`), with `Esc` routed by whether focus is inside `#log`
- [X] T033 [P] [US1] Implement `views/cards.js` per contracts/ui-controls.md → Feedback cards and shift log and contracts/visual-design.md → DOM components: bottom-left stack (max 3, 6.5 s fade), shift-log drawer (`F` toggle, focus management, cleared per shift), text outcome tags, transparency note, and an ordered live announcer for `#live`
- [X] T034 [P] [US1] Implement `views/hud.js`: phase number + title, integrity bar with color bands and percentage text, score, combo multiplier pop, goal x / 10, mode tag, "Log (F)" and sound buttons
- [X] T035 [P] [US1] Implement `views/screens.js`: overlay card host with focus trap and Enter/Space primary action; loading, error (lists `validateAll` errors, reload button), empty-state, and pause cards
- [X] T036 [P] [US1] Implement `views/briefing.js`: kicker, title, data-model.md Phase.concept and Phase.briefing, "ZAP THESE" red ✕ chips and "LET THESE THROUGH" green ✓ chips with PacketType.name + PacketType.identifying, primary "Start phase n"
- [X] T037 [P] [US1] Implement `views/summary.js`: phase summary from data-model.md PhaseResult (score so far, phase accuracy vs 80 %, best combo, integrity, review list, "Continue shift" — disabled with "More phases coming" if the next phase has no data) and shift summary from ShiftResult.status, ShiftResult.score, ShiftResult.phaseReached, ShiftResult.zapped, ShiftResult.bestCombo, ShiftResult.accuracy, ShiftResult.newRecords, ShiftResult.reviewTypes, with "Restart from phase n" (ShiftResult.restartPhaseId) and "Menu"
- [X] T038 [P] [US1] Implement `views/menu.js`: title, pitch, key help, phase list with lock state from data-model.md SavedProgress.unlocked ("Locked" text on disabled entries), start a shift at any unlocked phase
- [X] T039 [US1] Implement `views/challenge.js`: `requestAnimationFrame` loop with clamped dt and `effects.timeScale()`; spawner → motion → input → `rules.evaluateAction` → `scoring.apply` → events from contracts/rules-engine.md → effects, audio, renderer flashes, cards, HUD; keyboard target-lock ordering (nearest to LAN first) with live announcement; banners "PHASE n", "COMBO xN!", "LEGIT!", "ASx ⇎ ASy", "LAN CLEAN!"; on shift end, routers burst red in sequence; never pauses for cards; pause via `P` / `Esc`, quit via `Q`
- [X] T040 [US1] Implement `main.js`: screen state machine per data-model.md → Screens; `validateAll` first (error screen on failure, empty-state for data-model.md → Validation rule 6); start shift via `scoring.newShift`; on `phase-cleared` save `updateProgress` (unlock) and show the phase summary; on shift end save records and show the shift summary; restore mute from SavedProgress.settings; `M` mute anywhere
- [X] T041 [US1] Run `node --test` and quickstart Q1–Q4, Q6–Q9, Q12, Q13 on Phase 1 (Q6 and Q7 cover the Accessibility gate); fix failures before continuing

**Checkpoint**: Phase 1 is a playable, teachable MVP

---

## Phase 4: User Story 2 - Learn at your own pace in practice mode (Priority: P2)

**Goal**: Every packet waits at the LAN for a decision; no timer; clears and unlocks like arcade.

**Independent Test**: Complete Phase 1 in practice mode with the keyboard only; no packet reaches a
member before a decision (quickstart Q6).

### Tests for User Story 2

- [X] T042 [P] [US2] Extend `tests/scoring.test.js`: a practice shift with the same outcomes yields the same phase accuracy, ShiftState.status, and unlocks as arcade; records land under data-model.md SavedProgress.best `practice`, separate from `arcade`

### Implementation for User Story 2

- [X] T043 [US2] Add the practice hold to `engine/motion.js`: in practice mode a packet stops just before the LAN (before any split) as `held` (data-model.md → Packet instance) (research.md R7)
- [X] T044 [US2] In `views/challenge.js`: spawn the next packet only after the held packet is decided; auto-lock the held packet; route the `letThrough` action (`L`) to `rules.evaluateAction(instance, "let-through", …)`; show "Space: zap · L: let through" near the LAN
- [X] T045 [P] [US2] Add the Arcade / Practice toggle to `views/menu.js` (buttons with `aria-pressed`), persisted in data-model.md SavedProgress.settings `mode` via `engine/storage.js`; the HUD mode tag follows it
- [X] T046 [US2] Run quickstart Q6 in practice mode plus Q7 (reduced motion)

**Checkpoint**: US1 and US2 both work independently

---

## Phase 5: User Story 3 - Progress through the full prerequisite chain (Priority: P3)

**Goal**: Phases 2–5 with briefings, locks, continuous-shift carry-over, Phase 5 deciding-field
labels, and all variant pairs.

**Independent Test**: Play a shift from Phase 1 to 5; each phase is locked until the previous one
is cleared; integrity/score/combo carry; Phase 5 highlights the deciding field; NTP unicast, ARP/NS
inside vs outside, and ICMPv6 types grade correctly (quickstart Q5, Q15).

### Tests for User Story 3

- [X] T047 [P] [US3] Extend `tests/rules.test.js` with catalog variant pairs: `arp` vs `arp-outside-atm` (sender-outside and target-outside variants), `ns` vs `ns-outside-atm`, `ntp-unicast` vs `ntp-broadcast` (`203.0.113.255`, `224.0.1.1`, `ff05::101`), `rs`/`ra` vs `ns`/`na`, `mld` variants
- [X] T048 [P] [US3] Extend `tests/data.test.js`: all 20 ids of contracts/data-files.md exist; data-model.md PacketType.variant_of chain (validation rule 3); Phase.label_detail is `name+field` for 1–4 and `name+deciding` for 5; difficulty (Phase.spawn_interval_s, Phase.travel_time_s) does not get easier from phase to phase

### Implementation for User Story 3

- [X] T049 [P] [US3] Add Phase 2 (`ospf`, `ospfv3`, `pim`) and Phase 3 (`igmp`, `mld`, `ntp-unicast`) entries to `data/packets.js` with the data-model.md PacketType fields listed in T025 plus PacketType.variants where a protocol has several destinations; `ntp-unicast` `wrong_zap` explains that UDP 123 alone does not make traffic bad
- [X] T050 [US3] Add Phase 4 (`ra`, `rs`, `ns`, `na`) and Phase 5 (`arp-outside-atm`, `ns-outside-atm`, `ntp-broadcast`) entries to `data/packets.js`, with data-model.md PacketType.variant_of and PacketType.variants (ARP sender- and target-outside forms; NTP broadcast and multicast forms); same file as T049, so after it
- [X] T051 [US3] Add Phases 2–5 to `data/phases.js` (data-model.md Phase.id, Phase.title, Phase.concept, Phase.briefing, Phase.introduces, Phase.mix, Phase.goal_zaps, Phase.clear_accuracy, Phase.spawn_interval_s, Phase.travel_time_s, Phase.max_packets, Phase.label_detail, Phase.leak_cost, Phase.wrong_zap_cost), one idea per briefing, rising difficulty
- [ ] T052 [US3] Content review gate: the project owner reviews the Phase 2–5 entries in `data/packets.js` and briefings in `data/phases.js`; update the reviewer + date header comments; no merge before sign-off; depends on T049–T051
- [X] T053 [US3] Wire the continuous shift across phases in `views/challenge.js`, `views/summary.js`, and `main.js`: "Continue shift" calls `scoring.enterPhase` and shows the next briefing with carried integrity, score, and combo; the shift log keeps all cards of the shift; menu shows Phases 2–5 locked until cleared
- [X] T054 [US3] Run `node --test` and a Phase 1 → 5 shift (US3 acceptance scenarios 1–4, quickstart Q5, Q15), plus Q6 and Q7 for the Phase 5 deciding-field labels

**Checkpoint**: All five teaching phases are playable as one shift

---

## Phase 6: User Story 4 - Endless shift recall test (Priority: P4)

**Goal**: After Phase 5 the shift continues into endless (also startable directly once unlocked):
all types, header-fields-only labels, speed-up every 10 correct zaps, ends at 0 integrity, records
per mode.

**Independent Test**: Unlock endless; no label shows a protocol name; "SPEED UP" every 10 correct
zaps; shift summary and records saved at 0 integrity (quickstart Q11, Q14).

### Tests for User Story 4

- [X] T055 [P] [US4] Extend `tests/scoring.test.js` for endless: data-model.md Phase.goal_zaps = null means no goal; only `integrity-out` / `quit` end it; ShiftState.speedLevel from Phase.speedup_every_zaps; ShiftState.endlessCorrectZaps; ShiftResult.newRecords for `shiftScore` and `endlessCorrectZaps` per mode
- [X] T056 [P] [US4] Extend `tests/spawner.test.js` and `tests/labels.test.js`: endless draws every non-excluded type; every instance's `fields-only` label omits its PacketType.name

### Implementation for User Story 4

- [X] T057 [US4] Add phase 6 (endless) to `data/phases.js` per contracts/data-files.md (data-model.md Phase.goal_zaps = null, Phase.clear_accuracy = null, Phase.label_detail = `fields-only`, Phase.max_packets = 16, Phase.speedup_every_zaps = 10, Phase.speedup_factor, Phase.min_spawn_interval_s, Phase.min_travel_time_s)
- [ ] T057a [US4] Content review gate: project owner reviews the endless phase's title, concept, and briefing in `data/phases.js`; update the reviewer + date header comment; no merge before sign-off (constitution Content gate); depends on T057
- [X] T058 [US4] Apply endless speed-ups in `views/challenge.js` and `engine/spawner.js` (spawn interval and travel time × Phase.speedup_factor per ShiftState.speedLevel, floored by Phase.min_spawn_interval_s and Phase.min_travel_time_s) with the "SPEED UP" banner and announcement (research.md R13)
- [X] T059 [US4] Ensure `fields-only` labels in `engine/renderer.js` and the lock announcement in `views/challenge.js` never include the protocol name before a decision, while cards after the decision name it
- [X] T060 [P] [US4] Add the endless entry to `views/menu.js` (locked until Phase 5 is cleared) with best shift score and best endless correct zaps from data-model.md SavedProgress.best for the selected mode; show "new record" marks in `views/summary.js`
- [X] T061 [US4] Continue a shift from a cleared Phase 5 into endless in `main.js` (US4 acceptance scenario 5)
- [X] T062 [US4] Run quickstart Q11, Q14, Q6, and Q7

**Checkpoint**: The recall test works

---

## Phase 7: User Story 5 - Hints that show where to look (Priority: P5)

**Goal**: After a leak or wrong zap of type T, the next T highlights its deciding field without
revealing the verdict.

**Independent Test**: Leak an OSPF; the next OSPF highlights its deciding field; nothing indicates
the verdict (quickstart Q10).

### Tests for User Story 5

- [X] T063 [P] [US5] Extend `tests/spawner.test.js`: when data-model.md ShiftState.hintTypes contains T, the next instance of T has PacketInstance.hinted = true and the challenge contract calls `scoring.consumeHint`; instances of other types are not hinted

### Implementation for User Story 5

- [X] T064 [US5] Set PacketInstance.hinted in `engine/spawner.js` from the hint list and call `scoring.consumeHint` from `views/challenge.js` after spawning (contracts/rules-engine.md invariant 6)
- [X] T065 [US5] Render the hint in `engine/renderer.js` via `labels.build` (deciding field in yellow + underline, identical for every type) and add "look at: <field>" to the lock announcement
- [X] T066 [US5] Run quickstart Q10, Q6, and Q7 (the hint must not depend on motion or color alone)

**Checkpoint**: All user stories are independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T067 [P] Accessibility pass: keyboard-only shift from Phase 1 through endless in both modes, with OS reduced motion on and sound muted (quickstart Q6–Q8, SC-004, SC-008); fix issues in the affected `views/*.js`, `engine/effects.js`, `engine/renderer.js`
- [X] T068 [P] Performance pass at the endless maximum (16 packets, 600 particles) with DevTools; keep ≈ 60 fps (SC-007) by tuning `engine/effects.js` and `engine/renderer.js`
- [ ] T069 Final content review: the project owner re-confirms every entry in `data/packets.js` and every briefing in `data/phases.js`, including endless, before release; update reviewer + date headers
- [X] T070 [P] Write `README.md` at the repository root: how to play, how to run tests, how to add a packet type or phase (data only), and the source policy (cited vs owner-confirmed note)
- [X] T071 [P] Align the root documents with the clarifications: `SPEC.md` (transparency note instead of blocking on citations; "≥ 80 % accuracy" in the phase-clear rule; "broadcast and multicast" instead of "broadcast and link-local multicast"; continuous shift with checkpoints; cards also kept in the shift log), `CONSTITUTION.md` ("NTP broadcast/multicast"), and `PLAN.md` (definition of done uses the transparency note)
- [X] T072 Run `node --test` and every quickstart scenario Q1–Q15; all must pass before release

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: none (T001, T002, T005, T006 already done)
- **Foundational (Phase 2)**: after Setup; BLOCKS all stories. Tests T007–T012 before T013–T022
- **US1 (Phase 3)**: after Foundational; builds all runtime modules, so it is the base of US2–US5
- **US2, US3, US5**: after US1, independent of each other
- **US4**: after US3 (needs Phases 2–5 content and a clearable Phase 5; can be developed against Phase 1 content with a dev unlock)
- **Polish (Phase 8)**: after the desired stories

### Story Completion Order
`Setup → Foundational → US1 (MVP) → { US2 ∥ US3 ∥ US5 } → US4 → Polish`

### Within Each Story
Tests first (they must fail) → data → content review gate → engine changes → views → validation
run. Tasks without `[P]` in the same story share files (`views/challenge.js`, `main.js`,
`engine/renderer.js`, `data/packets.js`) and run in listed order.

---

## Parallel Examples

### Foundational
```text
Task: "T007 tests/rules.test.js"      Task: "T008 tests/scoring.test.js"
Task: "T009 tests/data.test.js"       Task: "T010 tests/separation.test.js"
Task: "T011 tests/labels.test.js"     Task: "T012 tests/spawner.test.js"
# then: T015 rng.js ∥ T019 labels.js ∥ T020 feedback.js ∥ T022 storage.js
```

### User Story 1
```text
# after T025–T028:
Task: "T029 engine/renderer.js"   Task: "T030 engine/effects.js"   Task: "T031 engine/audio.js"
Task: "T032 engine/input.js"      Task: "T033 views/cards.js"      Task: "T034 views/hud.js"
Task: "T035 views/screens.js"     Task: "T036 views/briefing.js"   Task: "T037 views/summary.js"
Task: "T038 views/menu.js"
```

### User Story 3
```text
Task: "T047 variant-pair tests"   Task: "T048 data tests for phases 2–5"
Task: "T049 phase 2–3 entries in data/packets.js"
# then T050 (same file) → T051 data/phases.js → T052 review gate
```

---

## Implementation Strategy

### MVP First (User Story 1)
1. Setup (finish T003, T004) → Foundational (verdict engine and shift scoring proven by tests)
2. US1 → owner review (T027) → **stop and validate** with quickstart Q1–Q4, Q6–Q9, Q12, Q13
3. Demo Phase 1 to a few IX-member operators

### Incremental Delivery
1. + US2 practice mode (the accessible path to every lesson)
2. + US3 Phases 2–5 as one continuous shift → owner review (T052)
3. + US5 hints
4. + US4 endless recall test → owner review (T057a)
5. Polish gates → release

---

## Notes
- Packet facts live only in `data/*.js`; a task that needs a new fact edits data, never code
- Every new or changed catalog entry needs data-model.md PacketType.source and PacketType.source_status and owner review before merge
- Commit after each task or logical group; stop at any checkpoint to validate the story on its own
