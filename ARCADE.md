---
# ARCADE SUBMISSION — fill this file in, commit it to the ROOT of your game repository as ARCADE.md,
# then send John your GitHub URL. Everything between the two --- lines is machine-read.
arcade_version: 1

game:
  title: "Peering Patrol"
  slug: peering-patrol
  tagline: "Run the NOC at an IXP and zap the packets that don't belong on the peering LAN."
  summary: "You are the NOC operator at an IX.br-style Internet Exchange. Packets fly from 8 member routers to the shared ATM peering LAN, and broadcasts split into copies that flood every member. Zap CDP, MNDP, STP, OSPF, PIM, IGMP, MLD, IPv6 RA/RS, ARP/NS for non-ATM addresses and broadcast NTP; let BGP, unicast traffic and ARP/ND for ATM addresses through. Every decision explains what the packet is and what to disable on your own IX-facing interface."
  topics: [IXP, IX.br, peering LAN, Layer 2 hygiene, IPv6 Neighbor Discovery, BGP]
  category: switching
  skill_level: intermediate
  play_minutes: 15           # rough guess for one sitting; not measured with human players
  levels: 6                  # 5 teaching phases + endless recall test
  card_image: assets/images/title.png
  card_image_alt: "The Peering Patrol playfield: a glowing IX peering LAN in the center, eight member routers around it flashing red after a CDP leak, and explanation cards at the bottom left."
  repo: "https://github.com/fpessoanunes/PeeringPatrol"
  repo_path: ""
  license: Apache-2.0

creator:
  name: "Fabio Pessoa Nunes"
  github: fpessoanunes
  location: "São Paulo, Brazil"
  organization: "Brasil Internet Exchange (IX.br) / NIC.br"
  links: []
  first_spec_project: true
  workshop: "NAF AC6"
  consent_to_publish: true

build:
  started: "2026-11-18"
  finished: "2026-11-18"
  wall_time: unknown
  spec_driven:
    framework: GitHub Spec Kit
    framework_version: "1.4.2.dev0 (from .specify/init-options.json)"
    artifacts: [constitution, spec, clarify, plan, tasks, analysis, checklists]
    task_count: 73
    loops_or_phases: 8       # implementation phases in tasks.md; the spec, plan and tasks were each generated twice
  model: claude-opus-5-5
  helper_models: []
  harness: Claude Code
  harness_version: unknown
  mcp_servers: [claude.ai Claude Docs, claude.ai Gmail, claude.ai Google Calendar, claude.ai Google Drive, easel, ide]   # connected during the session; none were called for the build
  rag_and_sources:
    - "Project owner's CONSTITUTION.md, SPEC.md and PLAN.md (packet catalog, phases, visual design system)"
    - "NIC.br Boas Práticas IX (BCOP) course material, cited in the owner's spec; not fetched by the agent"
    - "IX.br policy as confirmed by the project owner"
    - "Model background knowledge of protocol headers and RFC 5737 / RFC 3849 / RFC 5398 documentation ranges (not fetched)"
  skills_and_plugins: [speckit-constitution, speckit-specify, speckit-clarify, speckit-plan, speckit-tasks, speckit-analyze, speckit-implement]
  other_tools: [Node.js 25.2.1 built-in test runner, Google Chrome 157 headless driven over the DevTools Protocol by a scratch test script, Python 3 for scripted file edits, sips]
  human_prompts: 26          # prompts in this build session; earlier sessions that wrote the root docs are not counted
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "unknown (not reported by the harness in this session)"
  ai_generated_assets:
    - "code and tests: claude-opus-5-5"
    - "explanation and briefing copy: claude-opus-5-5, from the owner's catalog (owner review pending)"
    - "sound: synthesized in code with the Web Audio API, no audio files"
    - "card image: screenshot of the running game, no image generator"

runtime:
  kind: static-web
  stack: [HTML, CSS, JavaScript (classic scripts), Canvas 2D, Web Audio API]
  start: "open index.html in a desktop browser (no command or server needed)"
  url_after_start: ""
  hosted_url: ""
  static_root: "."
  requires_install: false
  requires_network: false    # Google Fonts load if online; system fonts are used offline
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: [Chrome 157 (headless)]
  accessibility: "Tested: full keyboard-only shifts (Tab, Space, L) from Phase 1 through endless in arcade and practice mode; a full shift with prefers-reduced-motion emulated; mute persisting across reload. Implemented but not tested with a real screen reader: an aria-live region announcing locks and every outcome."
  save_state: "browser localStorage (settings, unlocked phases, best scores)"

verification:
  tests: node --test
  tests_passing: 93
  facts_sourced_from:
    - "IX.br policy, confirmed by the project owner (11 of 20 packet entries are owner-confirmed; players see an 'official citation pending' note on them)"
    - "NIC.br Boas Práticas IX (BCOP) course material (9 cited entries, as cited in the owner's spec)"
    - "RFC 5737, RFC 3849, RFC 5398 documentation address and ASN ranges"
  known_limits:
    - "Packets follow scripted paths; no real switching fabric, MAC learning, route servers or BGP state machine"
    - "Explanation and briefing text has not yet had the owner's content review (tasks T027, T052, T057a, T069 are open)"
    - "In arcade mode the 80% accuracy gate rarely triggers, because legitimate packets that pass on their own count as correct decisions"
    - "MLDv1 report (ICMPv6 type 131) is recognized by the rules engine but not spawned; MLD packets use types 130, 132 and 143"
    - "Tested only in headless Chrome; Firefox, Safari and Edge untested"
    - "Desktop target; touch zapping is implemented but no mobile layout was designed or tested"
    - "English only"
---

## In one paragraph

Peering Patrol is an arcade game for network operators whose networks peer, or are about to peer, at an Internet Exchange. You keep the shared IX.br-style ATM peering LAN clean. You zap discovery protocols, IGPs, multicast chatter, IPv6 router discovery, and ARP or NS for non-ATM addresses before they flood all eight members. BGP, unicast traffic, and address resolution for ATM addresses must pass. Five phases build on each other up to "same protocol, different verdict" cases. The endless recall test then hides protocol names and shows only the header fields a capture would show.

## How it was built

We followed GitHub Spec Kit in order: constitution, specify, clarify, plan, tasks, analyze, implement. All of it started from the owner's root CONSTITUTION.md, SPEC.md and PLAN.md. The clarify step settled four rules: cards never pause play, how endless ends and what it saves, an 80% accuracy gate per phase, and that owner-confirmed facts ship with a visible "citation pending" note. The first analysis found that NTP multicast would not flood, that endless would be blocked by the empty-phase rule, and that content reviews came after merge. All three were fixed before any code was written.

During implementation the owner changed direction. Specs must not reference the prototype (constitution 1.1.0). A new look-and-feel section moved cards to the bottom left, with a shift log so no explanation is lost. A shift became one continuous run with checkpoints. The plan and tasks were regenerated, and a second analysis found seven more gaps.

Tests came first, and every verdict is also re-derived from structured header fields. Things that broke: `node --test tests/` fails on Node 25; headless Chrome's virtual time barely runs animation frames, so we drove real time over the DevTools Protocol; long cards covered the HUD; and an MLD label would have shown the wrong next header.

## What we'd tell the next builder

- Store packets as structured header fields, not display strings, and have the engine re-derive every verdict in tests. It caught real mistakes, such as MLD's hop-by-hop next header.
- Decide early how "accuracy" counts packets the player never touched. Counting them as correct makes the gate easy in real-time mode.
- Drive the real game in a headless browser with a small script that uses the same input paths as players (click, Tab, Space). Unit tests alone would have missed the card stack covering the HUD.
