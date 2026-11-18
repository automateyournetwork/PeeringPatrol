# Quickstart — Run and Validate Peering Patrol v1

## Prerequisites
- A current desktop browser (Chrome, Firefox, Safari, or Edge).
- Node.js ≥ 20, for the tests only.

## Run
Open `index.html` from the repository root (double-click, or `open index.html` on macOS). No
server, install, or network is needed. Append `?seed=42` for a reproducible run.

## Automated checks
```bash
node --test
```
Expected: all suites pass —
- `rules.test.js`: address helpers; recomputation for every protocol in the catalog; all 20
  entries recompute to their catalog verdict over 1,000 seeded instances; variant pairs (ARP,
  NS, NTP; ICMPv6 133/134 vs 135/136; MLD types) in both directions.
- `data.test.js`: schemas; every entry sourced; variant chain; documentation ranges; costs;
  every broadcast/multicast entry floods; negative fixtures for each validation rule.
- `labels.test.js`: each detail level; `fields-only` never contains a protocol name.
- `spawner.test.js`: seeded mixes use only introduced types; flood targets all 7 other members;
  templates fully filled; hinted instances.
- `scoring.test.js`: costs, combo across phases, 79/80/81 % gate boundaries, not-cleared ends
  the shift, carry-over on `enterPhase`, endless speed levels, records per mode.
- `separation.test.js`: views, renderer, effects, and motion never use `verdict`.

## Manual validation scenarios
| # | Scenario | Expected | Spec |
|---|---|---|---|
| Q1 | Open from disk, start a shift at Phase 1 | menu within 30 s; briefing with red ✕ / green ✓ chips; play | SC-003, US1, FR-044 |
| Q2 | Zap a CDP, zap a BGP, let an MNDP leak | ZAPPED card + burst; THAT WAS LEGIT card, bigger integrity loss, "ASx ⇎ ASy"; flood to 7 routers, red flashes, LEAK! card; play never pauses | US1, FR-011a, FR-014, FR-039–FR-040 |
| Q3 | Produce 4+ outcomes quickly | at most 3 cards bottom-left, each fades after ~6.5 s; `F` opens the shift log with all of them | FR-011a, FR-043 |
| Q4 | Reach 10 correct zaps below 80 % accuracy (`?seed=` + deliberate mistakes) | shift summary "not cleared", Phase 2 locked, "Restart from phase 1" | FR-017 |
| Q5 | Clear Phase 1 at ≥ 80 % | phase summary → "Continue shift" → Phase 2 briefing; integrity, score, combo unchanged; Phase 2 unlocked after reload | FR-017a, FR-021, FR-033 |
| Q6 | Complete Phase 1 in practice mode with the keyboard only | every packet waits at the LAN; Tab / Space / L / F / Esc all work; no mouse needed | US2, SC-004, FR-028 |
| Q7 | Turn on OS reduced motion; play a phase | no shake, flash, slow motion, or reticle spin; all text feedback present | FR-029, FR-045, SC-008 |
| Q8 | Mute, reload | still muted; no information lost | FR-030 |
| Q9 | Cards for PIM (owner-confirmed) and OSPF (cited) | PIM shows the transparency note; OSPF does not | FR-004, SC-001a |
| Q10 | Leak an OSPF, watch the next OSPF | its deciding field is highlighted (yellow + underline); nothing reveals the verdict | US5, FR-025 |
| Q11 | Clear Phase 5 in a shift; play endless to 0 integrity | shift continues into endless; header-fields-only labels; "SPEED UP" every 10 correct zaps; shift summary with phase reached = 6 and new records | US4, FR-020a |
| Q12 | Rename `data/packets.js`, reload | error screen, play blocked | FR-032 |
| Q13 | Remove `source` from one entry, reload | that type never appears; the rest is playable | FR-003 |
| Q14 | Endless at maximum load on a mid-range laptop | no visible stutter (DevTools ≈ 60 fps) | SC-007 |
| Q15 | Let integrity reach 0 in Phase 3 of a shift started at Phase 1 | routers burst red in sequence, shift summary shows phase reached 3, "Restart from phase 3" | FR-018, FR-041 |

Details: [data-model.md](./data-model.md), [contracts/](./contracts/).
