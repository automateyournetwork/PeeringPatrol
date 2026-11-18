# Contract — Pure Engine Modules (rules, labels, scoring)

`engine/rules.js`, `engine/labels.js`, `engine/spawner.js`, `engine/feedback.js`, and
`engine/scoring.js` are pure: no DOM, no clock, and randomness only through an injected `rng`.
They run unchanged in the browser and under Node. Only engine modules may read `verdict`
(Separation gate).

## `PP.engine.rules`
| Function | Returns | Notes |
|---|---|---|
| `expandIPv6(addr)` | int[8] \| null | handles `::` |
| `inSubnet(ipv4, cidr)` | bool | |
| `inPrefix(ipv6, prefix)` | bool | |
| `isBroadcastOrMulticast(addr, lan?)` | bool | MAC group bit; IPv4 `255.255.255.255`, `224.0.0.0/4`, or the LAN subnet broadcast; IPv6 `ff00::/8` |
| `isGroupMac(mac)` | bool | low bit of the first octet |
| `recomputeVerdict(fields, lan)` | `"allowed" \| "forbidden" \| "unknown"` | predicates in research.md R3 |
| `evaluatePacket(instance, catalog, lan)` | `{ verdict, typeId, consistent }` | `verdict` from the catalog; `consistent` = catalog === recomputed |
| `evaluateAction(instance, action, catalog, lan)` | `{ correct, outcome, typeId }` | `action`: `"zap"` \| `"let-through"` \| `"arrived"` |

| verdict \ action | `zap` | `let-through` / `arrived` |
|---|---|---|
| forbidden | `zap-correct` (correct) | `leak` (incorrect) |
| allowed | `zap-wrong` (incorrect) | `delivered` (correct) |

## `PP.engine.labels`
| Function | Returns |
|---|---|
| `formatField(key, fields)` | display text for one header field, e.g. `ICMPv6 type 134`, `UDP 123`, `next hdr 89`, `→ ff02::5`, `target 2001:db8:12::20` |
| `build(instance, type)` | `{ title: string \| null, lines: [{ text, deciding }] , plain }`; `name+field`: title = name, line = `labelShort` (+ the deciding field line when hinted); `name+deciding`: title = name, line = deciding field (marked); `fields-only`: title null, up to 3 lines of header fields, the deciding field marked only when hinted. `plain` is the live-region text. |

Invariant: with `fields-only`, no part of the output contains the type's `name`.

## `PP.engine.scoring` (continuous shift)
| Function | Returns |
|---|---|
| `newShift(startPhase, mode)` | `ShiftState` (integrity 100, status `running`) |
| `apply(state, outcome, typeId, phase)` | new `ShiftState`: costs, combo, multiplier, points, both count levels, missed lists, hint list, endless speed level, status |
| `phaseAccuracy(state)` / `shiftAccuracy(state)` | ratio in 0–1; 1 when nothing decided |
| `multiplier(combo)` | `min(5, 1 + floor(combo / 4))` |
| `enterPhase(state, nextPhase)` | new `ShiftState` for the next phase (carries integrity, score, combo, shift counts; resets phase counts and `phaseMissed`; raises `phaseReached`) |
| `consumeHint(state, typeId)` | removes `typeId` from `hintTypes` |
| `quit(state)` | status `quit` |
| `phaseResult(state)` | `PhaseResult` |
| `shiftResult(state, saved)` | `ShiftResult` with `newRecords` |
| `updateProgress(saved, event)` | new `SavedProgress`; `event` is a `PhaseResult` (unlock next) or a `ShiftResult` (records) |

Invariants (each has a test):
1. `zap-wrong` costs `phase.wrong_zap_cost` > `phase.leak_cost` (cost of `leak`).
2. Combo +1 on `zap-correct` / `delivered`, reset on `zap-wrong` / `leak`; it is not reset by
   `enterPhase`. Points: `zap-correct` = 100 × `multiplier(combo after increment)`;
   `delivered` = 10.
3. Integrity check before goal check; integrity never goes below 0.
4. Phases 1–5: the 10th `zap-correct` of the phase sets `phase-cleared` iff phase accuracy ≥
   `phase.clear_accuracy`, else `not-cleared`.
5. Endless: no goal; only `integrity-out` or `quit` ends it; `speedLevel` = floor(endless correct
   zaps / `speedup_every_zaps`).
6. `leak` or `zap-wrong` of T adds T to `hintTypes`, `phaseMissed`, and `shiftMissed` (unique,
   in order); `consumeHint` removes it once the next T has spawned.
7. Any call on a state whose status is not `running` (except `enterPhase` after
   `phase-cleared`) returns the state unchanged.
8. No function takes reaction time as input.

## Events emitted by `views/challenge.js` (views only render these)
`{ kind: "outcome", outcome, typeId, uid, card }` · `{ kind: "phase-cleared", result }` ·
`{ kind: "shift-end", result }` · `{ kind: "speedup", level }` · `{ kind: "combo", multiplier }`.
