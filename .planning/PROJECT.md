# Crayon World

## What This Is

A multiplayer browser game where players draw anything freehand and AI brings those drawings to life as autonomous entities that behave according to their real-world identity. Inspired by Harold and the Purple Crayon and Scribblenauts. Two teams compete across scenarios with asymmetric objectives — strategic thinking, not drawing skill, determines the winner.

v1.0 shipped a **single-player proof of concept** validating the core magic: draw something, AI recognizes it, it spawns and behaves like itself. The draw-to-life pipeline works end-to-end.

## Core Value

The moment you draw something and it comes alive acting like itself — a wolf that hunts, a bird that flies, a tree that grows. That recognition-to-behavior pipeline is the entire game.

## Requirements

### Validated

- ✓ Player can draw freehand on a canvas with stylus or mouse — v1.0
- ✓ Drawing is exported as PNG and sent to Claude Haiku for recognition — v1.0
- ✓ AI returns an entity label (open vocabulary — no fixed object list) — v1.0
- ✓ AI generates a behavior profile (movement archetype, traits, speed) from the entity label — v1.0
- ✓ Entity spawns on the canvas with identity-appropriate movement (wolf walks, bird flies, tree stays rooted) — v1.0
- ✓ Multiple entities coexist on the canvas simultaneously — v1.0
- ✓ Entity movement follows one of the defined archetypes (rooted, walking, flying, spreading, drifting, stationary) — v1.0
- ✓ Common entity recognition results are cached to minimize API costs — v1.0
- ✓ Server-side API proxy keeps Anthropic API key secure — v1.0
- ✓ Mock AI mode for development (hardcoded profiles, no API calls) — v1.0
- ✓ Browser-accessible with no login or install required — v1.0
- ✓ Strokes render in real-time with smooth appearance — v1.0
- ✓ Player can clear the entire drawing canvas — v1.0
- ✓ Player can undo the last stroke — v1.0
- ✓ Loading indicator displayed during AI processing — v1.0
- ✓ Graceful error handling when drawing is unrecognized — v1.0

### Active

- [ ] Batch interaction analysis — one Haiku call determines relationships between all entities
- [ ] Round system — "Start Round" triggers interaction analysis, timed simulation (~30s)
- [ ] Chase/flee behavior — predators pursue prey, prey runs away
- [ ] Fight/destroy behavior — hostile entities eliminate each other (loser removed)
- [ ] Symbiosis behavior — friendly entities benefit each other
- [ ] Surviving entities persist between rounds — world accumulates
- [ ] Entity removal — defeated entities fade out and are cleaned up

## Current Milestone: v1.1 Entity Interactions & Rounds

**Goal:** Entities interact with each other based on AI-determined relationships, driven by a round-based system.

**Target features:**
- Batch Haiku call for interaction analysis
- Round system (draw → start → simulate → repeat)
- Four interaction types: chase/flee, fight/destroy, symbiosis, ignore
- Entity removal on defeat
- Survivors persist across rounds

### Out of Scope

- Multiplayer / networking — deferred to next milestone, but stack must not block it
- Scenario system / team objectives — general behavior only for PoC
- Entity-vs-entity interaction (chasing, combat) — moved to v1.1 Active
- Crayon aesthetic / paper texture — visual polish deferred
- Sound design — deferred
- Login / authentication — web-accessible, no login
- Island / biome map — simple flat canvas for PoC
- Trait-influenced movement patterns — deferred from Phase 5 discussion for advanced locomotion

## Context

Shipped v1.0 on 2026-04-07 with 1,732 LOC TypeScript across 96 files. Built in 1 day with AI-assisted development.

**Tech stack:** TypeScript + PixiJS v8 (rendering), Express v5 (API proxy), Claude Haiku (sketch recognition), Vite (bundler), pnpm workspaces (monorepo).

**Architecture:** client/server/shared monorepo. Shared TypeScript types (`EntityProfile`, `Archetype`) consumed by both sides. Behavior functions are pure (no PixiJS imports) for future Colyseus compatibility. Single shared game loop ticker in WorldStage, not per-entity.

**Current state:** The core draw-to-life pipeline works. A player draws something, submits it, Claude Haiku recognizes it, an entity spawns using the player's drawing as its sprite, and it moves according to its archetype with AI-determined speed. 6 archetypes produce visibly distinct movement. 47 tests pass.

The full vision includes Colyseus multiplayer, asymmetric team scenarios (Population, Siege, Escort), and 50+ entities on screen. The PoC stack is architected so multiplayer can be added without rewriting.

## Constraints

- **Timeline**: May 1, 2026 hackathon deadline — ~3 weeks remaining
- **AI Budget**: $100 Anthropic API credit — Claude Haiku at ~$0.0001/call, caching implemented
- **Platform**: Browser-based, no install, no login
- **Stack**: TypeScript + PixiJS (rendering) — chosen for GPU-accelerated 2D and shared types with future Colyseus server
- **Multiplayer-ready**: Architecture supports adding Colyseus without rewrite

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-player PoC first | Prove core loop before adding networking complexity | ✓ Good — pipeline validated in 1 day |
| PixiJS for rendering | GPU-accelerated 2D, tiny bundle, instant load | ✓ Good — smooth rendering, v8 ticker works well |
| Claude Haiku for recognition | Best sketch understanding, $100 credits available | ✓ Good — open vocabulary works, caching saves costs |
| TypeScript end-to-end | Shared types between future client/server | ✓ Good — EntityProfile shared cleanly |
| No scenarios in PoC | General behavior proves the concept without scenario injection complexity | ✓ Good — 6 archetypes sufficient for demo |
| Cache recognition results | Minimize API costs — cache by entity label | ✓ Good — implemented in Phase 3 |
| Pure behavior functions | No PixiJS imports, (state, dt, world) => state contract | ✓ Good — testable, Colyseus-compatible |
| AI-provided speed (1-10) | Each entity moves at identity-appropriate pace | ✓ Good — wolf faster than turtle, decided in Phase 5 |
| Neighbor-averaging over perfect-freehand | Eliminates flickering on tight spirals | ✓ Good — switched mid-Phase 2, cleaner result |
| Separate draw/world views | Manual toggle between drawing canvas and game world | ✓ Good — clean separation, future camera support |

---
*Last updated: 2026-04-07 after v1.1 milestone start*
