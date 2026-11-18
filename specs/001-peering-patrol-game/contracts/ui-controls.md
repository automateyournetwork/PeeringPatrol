# Contract — Player-Facing Controls, Screens, Cards, Announcements

## Input map
| Input | Context | Effect |
|---|---|---|
| Click / tap within ~30 px of a packet | play | zap the nearest zappable packet |
| `Tab` / `→` / `↓` | play (playfield focused) | lock the next zappable packet (nearest to the LAN first) |
| `Shift+Tab` / `←` / `↑` | play (playfield focused) | lock the previous packet |
| `Space` | play | zap the locked packet |
| `L` | play, practice | let the held packet through |
| `F` | play | open/close the shift log; opening moves focus into it |
| `Esc` | play | if focus is in the shift log: close it and return focus to the playfield (no pause); otherwise pause |
| `P` | play | pause / resume |
| `Q` | pause menu | quit the shift (status `quit`, shift summary) |
| `M` | anywhere | toggle mute (persisted) |
| `Enter` / `Space` | overlay cards | activate the primary button |
| `R` | shift summary | restart from the phase reached |

Overlay cards trap focus to their own buttons; every DOM control is reachable by `Tab` in visual
order with a visible yellow focus ring. Cards never pause play automatically (FR-011a).

## Screens (centered overlay cards over the blurred playfield)
| Screen | Must show |
|---|---|
| Loading | short status text; goes to the menu or the error screen |
| Error | "Game content failed to load", the validation error list, a reload button; no play |
| Menu | title, one-paragraph pitch, how-to-play keys, mode toggle (Arcade / Practice), phase list (locked phases disabled with "Locked" text), endless entry (locked until Phase 5 is cleared) with best shift score and best endless correct zaps for the selected mode |
| Empty state | "This phase's content is under review", back to menu |
| Briefing | kicker "PHASE n OF 5" (or "ENDLESS"), title, concept text, "ZAP THESE" red chips and "LET THESE THROUGH" green chips (each chip: protocol + identifying field; ✕ / ✓ symbol), primary button "Start phase n" |
| Pause | "Paused", resume (Enter / P), quit shift (Q) |
| Phase summary | "LAN CLEAN!" style heading, score so far, phase accuracy vs 80%, best combo, integrity, the phase's "review these" list, primary button "Continue shift" |
| Shift summary | heading by status (not cleared: "accuracy X% of 80% needed"; integrity out: "LAN integrity lost"; quit: "Shift ended"), stat tiles score / phase reached / packets zapped / best combo / accuracy (+ "new record" marks), "review these" with full cards and transparency notes, buttons "Restart from phase n" (R) and "Menu" |

## Feedback cards and shift log
- **Card content**: outcome tag in text (ZAPPED / LEAK! / THAT WAS LEGIT) + protocol name,
  the identifying field line, the explanation, the fix line, the real-world-response line
  (FR-026), and the transparency note for `owner-confirmed` types (FR-004). Green edge for
  correct, red for mistakes.
- **Bottom-left stack**: newest on top, max 3 visible, each fades after 6.5 s; never covers the
  playfield center.
- **Shift log**: every card of the shift, newest on top, in a right-side drawer collapsed by
  default (HUD button "Log (F)"), scrollable, cleared when a new shift starts.

## Live-region announcements (`aria-live="polite"`, queued in order, never dropped)
- Lock: the packet's `labels.build(...).plain` text (+ "look at: <field>" when hinted).
- Each outcome: card tag + name + first sentence of the explanation.
- Phase start, phase cleared, speed-up, shift end: the banner text.
